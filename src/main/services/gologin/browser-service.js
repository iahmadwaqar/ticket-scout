import { GoLogin } from 'gologin'
import { logger } from '../../utils/logger-service.js'
import { spawn } from 'child_process'
import { platform } from 'os'

export class BrowserService {
  constructor() {
    this.activeInstances = new Map()
  }

  /**
   * Launch GoLogin browser instance
   * @param {Object} profile - Profile with token, id, and proxy
   * @returns {Promise<Object>} Browser launch result
   */
  async launchBrowser(profile) {
    try {
      // Create GoLogin instance
      const gologin = new GoLogin({
        token: profile.token,
        profile_id: profile.id,
        // Skip proxy for now as requested
        // proxy: profile.proxy
      })

      // Start browser
      const browserResult = await gologin.start()

      if (!browserResult || browserResult.status !== 'success') {
        throw new Error(`GoLogin browser launch failed: ${browserResult?.status || 'Unknown error'}`)
      }

      logger.info(profile.id, `GoLogin browser launched successfully. WebSocket URL: ${browserResult.wsUrl}`)

      return {
        gologin,
        browserResult,
        wsUrl: browserResult.wsUrl
      }
    } catch (error) {
      logger.error(profile.id, `Failed to launch GoLogin browser: ${error.message}`)
      throw error
    }
  }

  /**
   * Close GoLogin browser instance with proper shutdown sequence
   * Based on Python implementation: tab.stop() -> browser.close_tab() -> gologin.stop()
   * @param {Object} gologinInstance - GoLogin instance to close
   * @param {string} profileId - Profile ID for logging
   * @param {Object} browserResult - Browser result from gologin.start() (optional)
   * @param {Object} cdpClient - CDP client for additional browser control (optional)
   * @returns {Promise<void>}
   */
  async closeBrowser(gologinInstance, profileId, browserResult = null, cdpClient = null) {
    try {
      if (!gologinInstance) {
        logger.warn(profileId, 'No GoLogin instance to close')
        return
      }

      logger.info(profileId, 'Starting GoLogin browser shutdown sequence')
      
      // Step 1: Close browser tabs first (equivalent to Python: browser.close_tab(tab))
      await this.closeBrowserTabs(gologinInstance, profileId, browserResult, cdpClient)
      
      // Step 2: Set local mode (equivalent to Python: gl.local = True)
      // This tells GoLogin to handle cleanup locally rather than via server
      if (typeof gologinInstance.setLocal === 'function') {
        gologinInstance.setLocal(true)
        logger.info(profileId, 'Set GoLogin to local mode')
      } else if (gologinInstance.local !== undefined) {
        gologinInstance.local = true
        logger.info(profileId, 'Set GoLogin local property to true')
      }
      
      // Step 3: Call gologin.stop() with timeout (Python equivalent: gl.stop())
      const STOP_TIMEOUT_MS = 20000 // 20 seconds timeout
      
      logger.info(profileId, 'Calling gologin.stop() with timeout protection')
      
      const stopPromise = gologinInstance.stop()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`GoLogin stop operation timed out after ${STOP_TIMEOUT_MS}ms`))
        }, STOP_TIMEOUT_MS)
      })
      
      await Promise.race([stopPromise, timeoutPromise])
      
      logger.info(profileId, 'GoLogin browser closed successfully')
      
      // Step 4: Verify browser is actually closed and force-kill if needed
      await this.verifyBrowserClosed(profileId)
    } catch (error) {
      // Log the error but also attempt fallback cleanup
      logger.error(profileId, `Failed to close GoLogin browser: ${error.message}`)
      
      // If stop() times out or fails, try enhanced fallback cleanup
      if (error.message.includes('timed out')) {
        logger.warn(profileId, 'Attempting enhanced fallback cleanup due to timeout')
        await this.performEnhancedFallbackCleanup(gologinInstance, profileId, browserResult)
      }
      
      throw error
    }
  }
  
  /**
   * Close browser tabs and processes (equivalent to Python browser.close_tab(tab))
   * @param {Object} gologinInstance - GoLogin instance
   * @param {string} profileId - Profile ID for logging
   * @param {Object} browserResult - Browser result from gologin.start()
   * @param {Object} cdpClient - CDP client for browser control
   * @returns {Promise<void>}
   */
  async closeBrowserTabs(gologinInstance, profileId, browserResult, cdpClient) {
    try {
      logger.info(profileId, 'Closing browser tabs and processes')
      
      const closePromises = []
      
      // Method 1: Try to close through CDP if available
      if (cdpClient) {
        logger.info(profileId, 'Attempting to close browser through CDP')
        closePromises.push(
          this.closeBrowserViaCDP(cdpClient, profileId).catch(err => {
            logger.warn(profileId, `CDP browser close failed: ${err.message}`)
          })
        )
      }
      
      // Method 2: Try to close through GoLogin's browser property
      if (gologinInstance.browser && typeof gologinInstance.browser.close === 'function') {
        logger.info(profileId, 'Attempting to close browser through GoLogin browser property')
        closePromises.push(
          Promise.race([
            gologinInstance.browser.close(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Browser close timeout')), 5000)
            })
          ]).catch(err => {
            logger.warn(profileId, `GoLogin browser.close() failed: ${err.message}`)
          })
        )
      }
      
      // Method 3: Try to close through browserResult if available
      if (browserResult && browserResult.browser && typeof browserResult.browser.close === 'function') {
        logger.info(profileId, 'Attempting to close browser through browserResult')
        closePromises.push(
          Promise.race([
            browserResult.browser.close(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('BrowserResult close timeout')), 5000)
            })
          ]).catch(err => {
            logger.warn(profileId, `BrowserResult close failed: ${err.message}`)
          })
        )
      }
      
      // Method 4: Try to force close browser processes if available
      if (typeof gologinInstance.killBrowser === 'function') {
        logger.info(profileId, 'Attempting to kill browser processes')
        closePromises.push(
          Promise.race([
            gologinInstance.killBrowser(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Kill browser timeout')), 3000)
            })
          ]).catch(err => {
            logger.warn(profileId, `Kill browser failed: ${err.message}`)
          })
        )
      }
      
      // Wait for all close attempts
      if (closePromises.length > 0) {
        await Promise.allSettled(closePromises)
        logger.info(profileId, 'Browser tab close attempts completed')
      } else {
        logger.warn(profileId, 'No browser close methods available')
      }
      
    } catch (error) {
      logger.warn(profileId, `Error during browser tab closing: ${error.message}`)
      // Don't throw - this shouldn't prevent the rest of cleanup
    }
  }
  
  /**
   * Close browser via CDP commands
   * @param {Object} cdpClient - CDP client
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async closeBrowserViaCDP(cdpClient, profileId) {
    try {
      // Try to close all browser windows
      if (cdpClient.Browser && typeof cdpClient.Browser.close === 'function') {
        await cdpClient.Browser.close()
        logger.info(profileId, 'Browser closed via CDP Browser.close()')
      } else {
        // Fallback: try to close the current page/tab
        if (cdpClient.Page && typeof cdpClient.Page.close === 'function') {
          await cdpClient.Page.close()
          logger.info(profileId, 'Page closed via CDP Page.close()')
        }
      }
    } catch (error) {
      logger.warn(profileId, `CDP browser close error: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Perform enhanced fallback cleanup when normal stop() fails
   * @param {Object} gologinInstance - GoLogin instance to force cleanup
   * @param {string} profileId - Profile ID for logging
   * @param {Object} browserResult - Browser result from gologin.start() (optional)
   * @returns {Promise<void>}
   */
  async performEnhancedFallbackCleanup(gologinInstance, profileId, browserResult = null) {
    try {
      logger.info(profileId, 'Performing enhanced fallback cleanup for stuck GoLogin instance')
      
      // Try multiple fallback approaches
      const cleanupPromises = []
      
      // Fallback 1: Try browser.close() if available
      if (gologinInstance.browser && typeof gologinInstance.browser.close === 'function') {
        logger.info(profileId, 'Attempting browser.close() as fallback')
        
        const browserClosePromise = Promise.race([
          gologinInstance.browser.close(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Browser close timeout')), 5000)
          })
        ]).catch(err => {
          logger.warn(profileId, `Browser.close() failed: ${err.message}`)
        })
        
        cleanupPromises.push(browserClosePromise)
      }
      
      // Fallback 2: Try to delete profile (Python equivalent: gl.delete(profileid))
      if (typeof gologinInstance.delete === 'function' && gologinInstance.profile_id) {
        logger.info(profileId, 'Attempting profile deletion as fallback')
        
        const deletePromise = Promise.race([
          gologinInstance.delete(gologinInstance.profile_id),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile delete timeout')), 5000)
          })
        ]).catch(err => {
          logger.warn(profileId, `Profile deletion failed: ${err.message}`)
        })
        
        cleanupPromises.push(deletePromise)
      }
      
      // Fallback 3: Try to kill any remaining processes if available
      if (typeof gologinInstance.kill === 'function') {
        logger.info(profileId, 'Attempting process kill as fallback')
        
        const killPromise = Promise.race([
          gologinInstance.kill(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Process kill timeout')), 3000)
          })
        ]).catch(err => {
          logger.warn(profileId, `Process kill failed: ${err.message}`)
        })
        
        cleanupPromises.push(killPromise)
      }
      
      // Fallback 4: Try to force-kill browser processes as last resort
      // Always attempt process kill for enhanced cleanup
      logger.info(profileId, 'Attempting to force-kill browser processes as last resort')
      
      const processKillPromise = this.forceKillBrowserProcesses(profileId).catch(err => {
        logger.warn(profileId, `Force kill browser processes failed: ${err.message}`)
      })
      
      cleanupPromises.push(processKillPromise)
      
      // Wait for all cleanup attempts to complete
      await Promise.allSettled(cleanupPromises)
      
      logger.info(profileId, 'Enhanced fallback cleanup completed')
      
    } catch (fallbackError) {
      logger.error(profileId, `Enhanced fallback cleanup also failed: ${fallbackError.message}`)
      // Don't throw here - we want to continue with cleanup even if fallback fails
    }
  }
  
  /**
   * Force-kill browser processes (Chrome/Chromium) as last resort
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async forceKillBrowserProcesses(profileId) {
    try {
      logger.info(profileId, 'Force-killing browser processes')
      
      const currentPlatform = platform()
      let killCommand
      let killArgs
      
      if (currentPlatform === 'win32') {
        // Windows: Kill Chrome/Chromium processes
        killCommand = 'taskkill'
        killArgs = ['/F', '/IM', 'chrome.exe', '/T'] // Force kill chrome.exe and child processes
      } else if (currentPlatform === 'darwin') {
        // macOS: Kill Chrome/Chromium processes
        killCommand = 'pkill'
        killArgs = ['-f', 'Chrome|Chromium'] // Kill processes matching Chrome or Chromium
      } else {
        // Linux: Kill Chrome/Chromium processes
        killCommand = 'pkill'
        killArgs = ['-f', 'chrome|chromium'] // Kill processes matching chrome or chromium
      }
      
      return new Promise((resolve, reject) => {
        const killProcess = spawn(killCommand, killArgs)
        
        let stdout = ''
        let stderr = ''
        
        killProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        killProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        killProcess.on('close', (code) => {
          if (code === 0) {
            logger.info(profileId, `Browser processes killed successfully`)
            resolve()
          } else if (code === 1 && currentPlatform === 'win32') {
            // Windows taskkill returns 1 when no processes found - this is OK
            logger.info(profileId, 'No browser processes found to kill (expected)')
            resolve()
          } else if (code === 1 && (currentPlatform === 'darwin' || currentPlatform === 'linux')) {
            // Unix pkill returns 1 when no processes found - this is OK
            logger.info(profileId, 'No browser processes found to kill (expected)')
            resolve()
          } else {
            logger.warn(profileId, `Process kill command exited with code ${code}. stderr: ${stderr}`)
            resolve() // Don't reject - we want cleanup to continue
          }
        })
        
        killProcess.on('error', (error) => {
          logger.warn(profileId, `Failed to execute kill command: ${error.message}`)
          resolve() // Don't reject - we want cleanup to continue
        })
        
        // Timeout the kill operation after 5 seconds
        setTimeout(() => {
          killProcess.kill('SIGTERM')
          logger.warn(profileId, 'Process kill operation timed out')
          resolve() // Don't reject - we want cleanup to continue
        }, 5000)
      })
      
    } catch (error) {
      logger.warn(profileId, `Error during force kill browser processes: ${error.message}`)
      // Don't throw - this is a last resort cleanup
    }
  }

  /**
   * Bring browser to front (if supported by GoLogin)
   * @param {Object} cdpClient - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<boolean>} Success status
   */
  async bringToFront(cdpClient, profileId) {
    try {
      if (!cdpClient) {
        throw new Error('No CDP client available')
      }

      logger.info(profileId, 'Bringing GoLogin browser to front')
      
      await cdpClient.Page.bringToFront()
      
      // Note: GoLogin API may not have direct bring-to-front method
      // This might need to be implemented via CDP commands
      // For now, return success - implement actual logic if GoLogin supports it
      
      logger.info(profileId, 'Browser brought to front successfully')
      return true
    } catch (error) {
      logger.error(profileId, `Failed to bring browser to front: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Verify that browser processes are actually closed
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async verifyBrowserClosed(profileId) {
    try {
      logger.info(profileId, 'Verifying browser processes are closed')
      
      // Give the browser a moment to fully close
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if Chrome/Chromium processes are still running
      const hasRunningBrowsers = await this.checkForRunningBrowsers(profileId)
      
      if (hasRunningBrowsers) {
        logger.warn(profileId, 'Browser processes still running after stop(), attempting force kill')
        await this.forceKillBrowserProcesses(profileId)
        
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const stillRunning = await this.checkForRunningBrowsers(profileId)
        if (stillRunning) {
          logger.warn(profileId, 'Some browser processes may still be running after force kill')
        } else {
          logger.info(profileId, 'All browser processes successfully terminated')
        }
      } else {
        logger.info(profileId, 'Browser processes verified as closed')
      }
      
    } catch (error) {
      logger.warn(profileId, `Error during browser verification: ${error.message}`)
      // Don't throw - this is additional verification, not critical
    }
  }
  
  /**
   * Check if Chrome/Chromium browser processes are still running
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<boolean>} True if browsers are running
   */
  async checkForRunningBrowsers(profileId) {
    try {
      const currentPlatform = platform()
      let checkCommand
      let checkArgs
      
      if (currentPlatform === 'win32') {
        // Windows: Check for chrome.exe processes
        checkCommand = 'tasklist'
        checkArgs = ['/FI', 'IMAGENAME eq chrome.exe', '/FO', 'CSV']
      } else {
        // Unix: Check for chrome/chromium processes
        checkCommand = 'pgrep'
        checkArgs = ['-f', 'chrome|chromium']
      }
      
      return new Promise((resolve) => {
        const checkProcess = spawn(checkCommand, checkArgs)
        
        let stdout = ''
        
        checkProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        checkProcess.on('close', (code) => {
          if (currentPlatform === 'win32') {
            // On Windows, check if output contains actual process entries (not just header)
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Image Name'))
            const hasProcesses = lines.length > 0
            resolve(hasProcesses)
          } else {
            // On Unix, pgrep returns 0 if processes found, 1 if none found
            resolve(code === 0)
          }
        })
        
        checkProcess.on('error', () => {
          // If we can't check, assume no processes running
          resolve(false)
        })
        
        // Timeout after 3 seconds
        setTimeout(() => {
          checkProcess.kill('SIGTERM')
          resolve(false)
        }, 3000)
      })
      
    } catch (error) {
      logger.warn(profileId, `Error checking for running browsers: ${error.message}`)
      return false // Assume no processes if we can't check
    }
  }
}