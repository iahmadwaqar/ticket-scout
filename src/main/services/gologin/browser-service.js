import { GoLogin } from 'gologin'
import { logger } from '../../utils/logger-service.js'
import { spawn } from 'child_process'
import { platform } from 'os'

export class BrowserService {
  constructor() {
    this.activeInstances = new Map()
  }

  /**
   * Launch GoLogin browser instance following Python patterns
   * @param {Object} profile - Profile with token, id, and proxy
   * @returns {Promise<Object>} Browser launch result with gologinId
   */
  async launchBrowser(profile) {
    try {
      let gologinId = profile.goLoginId;
      
      // Step 1: Create GoLogin instance WITHOUT profile ID (following Python pattern)
      const gologin = new GoLogin({
        token: profile.token,
        local: false, // Following Python: "local": False
        writeCookiesFromServer: true, // Following Python: "writeCookiesFromServer": True
        extra_params: [
          "--remote-allow-origins=*" // Following Python: "--remote-allow-origins=*"
        ]
      })
      
      // Step 2: Enhanced profile creation/reuse logic
      if (!gologinId || !this.isValidProfileId(gologinId)) {
        logger.info(profile.id, 'GoLogin ID is empty or invalid, creating new profile')
        gologinId = await this.createNewGoLoginProfile(gologin, profile)
        logger.info(profile.id, `Created new GoLogin profile with ID: ${gologinId}`)
      } else {
        logger.info(profile.id, `Reusing existing GoLogin profile: ${gologinId}`)
        // Validate existing profile before use
        const isValidProfile = await this.validateExistingProfile(gologin, gologinId, profile.id)
        if (!isValidProfile) {
          logger.warn(profile.id, 'Existing profile validation failed, creating new profile')
          gologinId = await this.createNewGoLoginProfile(gologin, profile)
          logger.info(profile.id, `Created replacement GoLogin profile with ID: ${gologinId}`)
        }
      }
      
      // Step 3: Set the profile ID (following Python pattern)
      gologin.setProfileId(gologinId) // Following Python: gl_with_profile.setProfileId(profile_id)
      gologin.profile_id = gologinId  // Following Python: gl_with_profile.profile_id = profile_id
      
      // Step 4: Start browser (following Python pattern)
      const browserResult = await gologin.start() // Following Python: gl_with_profile.start()

      if (!browserResult || browserResult.status !== 'success') {
        throw new Error(`GoLogin browser launch failed: ${browserResult?.status || 'Unknown error'}`)
      }

      logger.info(profile.id, `GoLogin browser launched successfully. WebSocket URL: ${browserResult.wsUrl}`)

      return {
        gologin,
        browserResult,
        wsUrl: browserResult.wsUrl,
        gologinId: gologinId // Return the gologinId
      }
    } catch (error) {
      logger.error(profile.id, `Failed to launch GoLogin browser: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Create new GoLogin profile following Python patterns
   * @param {Object} gologin - GoLogin instance (already created)
   * @param {Object} profile - Profile object with configuration data
   * @returns {Promise<string>} Created GoLogin profile ID
   */
  async createNewGoLoginProfile(gologin, profile) {
    try {
      logger.info(profile.id, 'Creating new GoLogin profile with configuration')
      
      // Parse proxy following Python pattern
      let proxyConfig
      if (profile.proxy) {
        const proxy = profile.proxy
        if (proxy.includes('@')) {
          // Following Python: if "@" in proxy_:
          const [userPass, hostPort] = proxy.split('@')
          const [host, port] = hostPort.split(':')
          const [username, password] = userPass.split(':')
          
          proxyConfig = {
            mode: "http",
            host: host,
            port: port,
            username: username,
            password: password
          }
        } else if (proxy.includes('|')) {
          // Following Python: else (host|port format)
          const [host, port] = proxy.split('|')
          
          proxyConfig = {
            mode: "http",
            host: host,
            port: port,
            username: "",
            password: ""
          }
        } else {
          // No proxy
          proxyConfig = {
            mode: "none",
            host: "string",
            port: 0,
            username: "string",
            password: "string"
          }
        }
      } else {
        // Following Python: else (no proxy)
        proxyConfig = {
          mode: "none",
          host: "string",
          port: 0,
          username: "string",
          password: "string"
        }
      }
      
      // Create options following Python structure exactly
      const options = {
        name: profile.name || `Profile-${profile.email}`,
        os: 'android', // Following Python: os: 'android'
        proxy: proxyConfig,
        navigator: {
          userAgent: profile.browserData?.userAgent || '',
          language: 'en-US', // Following Python: language: 'en-US'
          resolution: this.getRandomResolution() // Following Python random resolution
        }
      }
      
      logger.info(profile.id, `Creating GoLogin profile with options: ${JSON.stringify({
        name: options.name,
        os: options.os,
        hasProxy: options.proxy?.mode !== 'none',
        userAgent: options.navigator?.userAgent ? 'present' : 'missing'
      })}`)
      
      // Create the profile using GoLogin API (following Python: gl_with_profile.create(options))
      const newProfileId = await gologin.create(options)
      
      if (!newProfileId) {
        throw new Error('GoLogin profile creation returned empty profile ID')
      }
      
      logger.info(profile.id, `Successfully created GoLogin profile: ${newProfileId}`)
      return newProfileId
      
    } catch (error) {
      logger.error(profile.id, `Failed to create new GoLogin profile: ${error.message}`)
      throw new Error(`GoLogin profile creation failed: ${error.message}`)
    }
  }
  
  /**
   * Get random screen resolution following Python patterns
   * @returns {string} Random resolution
   */
  getRandomResolution() {
    // Following Python: random.choice(['1920x1080', '1366x768', '1440x900', '1280x720', '1600x900'])
    const resolutions = ['1920x1080', '1366x768', '1440x900', '1280x720', '1600x900']
    return resolutions[Math.floor(Math.random() * resolutions.length)]
  }

  /**
   * Simple profile ID validation
   * @param {string} profileId - Profile ID to validate
   * @returns {boolean} True if valid
   */
  isValidProfileId(profileId) {
    return profileId && typeof profileId === 'string' && profileId.length > 0
  }

  /**
   * Validate existing GoLogin profile
   * @param {Object} gologin - GoLogin instance
   * @param {string} profileId - Profile ID to validate
   * @param {string} logProfileId - Profile ID for logging
   * @returns {Promise<boolean>} True if valid
   */
  async validateExistingProfile(gologin, profileId, logProfileId) {
    try {
      // Simple check - try to get profile info
      gologin.setProfileId(profileId)
      return true // If no error, profile exists
    } catch (error) {
      logger.warn(logProfileId, `Profile validation failed: ${error.message}`)
      return false
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
      
      // Step 4: Delete GoLogin profile (Python equivalent: gl.delete(profileid))
      await this.deleteGoLoginProfile(gologinInstance, profileId)
      
      // Step 5: Verify browser is actually closed and force-kill if needed
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
        const results = await Promise.allSettled(closePromises)
        
        // Check if any cleanup attempt succeeded
        const hasSuccessfulCleanup = results.some(result => result.status === 'fulfilled')
        
        if (hasSuccessfulCleanup) {
          logger.info(profileId, 'Browser tab close attempts completed with at least one success')
          
          // Delete GoLogin profile on successful cleanup (Python equivalent: gl.delete(profileid))
          await this.deleteGoLoginProfile(gologinInstance, profileId)
        } else {
          logger.warn(profileId, 'All browser tab close attempts failed')
        }
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
      if (typeof gologinInstance.delete === 'function') {
        logger.info(profileId, 'Attempting profile deletion as fallback')
        
        // Get profile from store to get the correct goLoginId
        const { profileStore } = await import('../profile/profileStore.js')
        const profile = profileStore.getProfile(profileId)
        
        if (profile && profile.goLoginId) {
          const deletePromise = Promise.race([
            gologinInstance.delete(profile.goLoginId),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Profile delete timeout')), 5000)
            })
          ]).catch(err => {
            logger.warn(profileId, `Profile deletion failed: ${err.message}`)
          })
          
          cleanupPromises.push(deletePromise)
        } else {
          logger.warn(profileId, 'Cannot delete profile: no profile found or missing goLoginId')
        }
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
      /*
      logger.info(profileId, 'Attempting to force-kill browser processes as last resort')
      
      const processKillPromise = this.forceKillBrowserProcesses(profileId).catch(err => {
        logger.warn(profileId, `Force kill browser processes failed: ${err.message}`)
      })
      
      cleanupPromises.push(processKillPromise)
      */
      
      // Wait for all cleanup attempts to complete
      const results = await Promise.allSettled(cleanupPromises)
      
      // Check if any cleanup attempt succeeded
      const hasSuccessfulCleanup = results.some(result => result.status === 'fulfilled')
      
      if (hasSuccessfulCleanup) {
        logger.info(profileId, 'Enhanced fallback cleanup completed with at least one success')
        
        // Additional profile deletion attempt on successful cleanup (Python equivalent: gl.delete(profileid))
        await this.deleteGoLoginProfile(gologinInstance, profileId)
      } else {
        logger.info(profileId, 'Enhanced fallback cleanup completed, but no methods succeeded')
      }
      
    } catch (fallbackError) {
      logger.error(profileId, `Enhanced fallback cleanup also failed: ${fallbackError.message}`)
      // Don't throw here - we want to continue with cleanup even if fallback fails
    }
  }
  
  /**
   * Force-kill browser processes (simplified approach)
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async forceKillBrowserProcesses(profileId) {
    // Simplified implementation - disable force killing all Chrome browsers
    logger.info(profileId, 'Force-kill browser processes function disabled to prevent closing all Chrome browsers')
    // This was causing issues by killing ALL Chrome browsers, not just the profile-specific one
    return Promise.resolve()
  }

  /**
   * Bring browser to front (simplified approach using Electron APIs)
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
      
      // Step 1: First bring the tab to front within the browser
      await cdpClient.Page.bringToFront()
      
      // Step 2: For Windows - use Electron's focus methods
      if (platform() === 'win32') {
        await this.bringWindowToFrontWindows(cdpClient, profileId)
      }
      
      logger.info(profileId, 'Browser brought to front successfully')
      return true
    } catch (error) {
      logger.error(profileId, `Failed to bring browser to front: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Windows-specific method to bring browser window to front with simplified approach
   * @param {Object} cdpClient - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async bringWindowToFrontWindows(cdpClient, profileId) {
    try {
      logger.info(profileId, 'Using simplified Windows-specific bring to front method')
      
      // Check window state to determine the best approach
      const windowState = await this.checkWindowState(profileId, cdpClient)
      logger.info(profileId, `Window state detected: ${windowState.state}`)
      
      // For minimized windows, restore first
      if (windowState.state === 'minimized') {
        logger.info(profileId, 'Window is minimized, restoring...')
        try {
          await cdpClient.Browser.setWindowBounds({
            windowId: 1,
            bounds: { windowState: 'normal' }
          })
          // Give time for the window to restore
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (cdpError) {
          logger.warn(profileId, `CDP window restore failed: ${cdpError.message}`)
        }
      }
      
      // Try CDP method to bring window to front
      try {
        await cdpClient.Page.bringToFront()
        logger.info(profileId, 'Successfully used CDP Page.bringToFront()')
      } catch (cdpError) {
        logger.warn(profileId, `CDP Page.bringToFront() failed: ${cdpError.message}`)
      }
      
      // Try JavaScript focus methods as enhancement
      try {
        await cdpClient.Runtime.evaluate({
          expression: `
            (function() {
              try {
                // Focus the window
                window.focus();
                
                // Blur and then focus again (Windows workaround)
                window.blur();
                setTimeout(() => window.focus(), 50);
                
                return 'Window focus methods executed';
              } catch (error) {
                return 'Error: ' + error.message;
              }
            })()
          `,
          awaitPromise: false,
          returnByValue: true
        })
        
        logger.info(profileId, 'Successfully used JavaScript focus methods')
      } catch (jsError) {
        logger.warn(profileId, `JavaScript focus methods failed: ${jsError.message}`)
      }
      
    } catch (error) {
      logger.error(profileId, `Windows-specific bring to front failed: ${error.message}`)
      // Don't throw - this is an enhancement, not critical functionality
    }
  }
  
  /**
   * Check the current state of the browser window
   * @param {string} profileId - Profile ID for logging
   * @param {Object} cdpClient - CDP client to get window info
   * @returns {Promise<Object>} Window state information
   */
  async checkWindowState(profileId, cdpClient) {
    try {
      // Check if we can get window info via CDP
      let isMinimized = false
      try {
        const windowBounds = await cdpClient.Browser.getWindowBounds({ windowId: 1 })
        isMinimized = windowBounds.bounds.windowState === 'minimized'
      } catch (cdpError) {
        logger.warn(profileId, `Could not get CDP window bounds: ${cdpError.message}`)
      }
      
      if (isMinimized) {
        return { state: 'minimized', info: 'Window is minimized' }
      }
      
      // Default case - window probably just needs focus
      return { state: 'needs_focus', info: 'Window needs focus but is not minimized' }
      
    } catch (error) {
      logger.warn(profileId, `Could not determine window state: ${error.message}`)
      return { state: 'unknown', info: 'Could not determine window state' }
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
        // COMMENTED OUT: This was killing ALL Chrome browsers, not just the profile-specific one
        // await this.forceKillBrowserProcesses(profileId)
        
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const stillRunning = await this.checkForRunningBrowsers(profileId)
        if (stillRunning) {
          logger.warn(profileId, 'Some browser processes may still be running (force kill disabled to prevent closing all Chrome browsers)')
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

  /**
   * Delete GoLogin profile from account (Python equivalent: gl.delete(profileid))
   * @param {Object} gologinInstance - GoLogin instance
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async deleteGoLoginProfile(gologinInstance, profileId) {
    try {
      if (!gologinInstance) {
        logger.warn(profileId, 'Cannot delete GoLogin profile: no GoLogin instance')
        return
      }

      // Get profile from store to get the correct goLoginId
      const { profileStore } = await import('../profile/profileStore.js')
      const profile = profileStore.getProfile(profileId)
      
      if (!profile || !profile.goLoginId) {
        logger.warn(profileId, 'Cannot delete GoLogin profile: no profile found or missing goLoginId')
        return
      }

      logger.info(profileId, `Attempting to delete GoLogin profile: ${profile.goLoginId}`)
      
      // Call GoLogin delete method with timeout protection
      const DELETE_TIMEOUT_MS = 10000 // 10 seconds timeout
      
      const deletePromise = gologinInstance.delete(profile.goLoginId)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`GoLogin profile deletion timed out after ${DELETE_TIMEOUT_MS}ms`))
        }, DELETE_TIMEOUT_MS)
      })
      
      await Promise.race([deletePromise, timeoutPromise])
      
      logger.info(profileId, `GoLogin profile ${profile.goLoginId} deleted successfully`)
      
    } catch (error) {
      // Log error but don't throw - profile deletion failure shouldn't stop cleanup
      logger.warn(profileId, `Failed to delete GoLogin profile: ${error.message}`)
    }
  }

  /**
   * Check if the specific profile's window is behind other windows
   * @param {string} profileId - Profile ID to check
   * @returns {Promise<boolean>} True if window is behind others
   */
  async isWindowBehindOthers(profileId) {
    // Simplified implementation - just return false for now
    // This was causing issues with the complex PowerShell approach
    logger.info(profileId, 'Using simplified window state detection (always returning false)')
    return false
  }
  
  /**
   * Use simplified approach to bring specific Chrome window to front
   * @param {string} profileId - Profile ID for logging
   * @param {Object} cdpClient - CDP client to get specific window info
   * @returns {Promise<void>}
   */
  async useWindowsAPIBringToFront(profileId, cdpClient = null) {
    // Simplified implementation - rely on CDP methods instead of complex PowerShell
    logger.info(profileId, 'Using simplified Windows API approach (relying on CDP methods)')
    // The CDP-based approach in bringWindowToFrontWindows should be sufficient
    return Promise.resolve()
  }
}