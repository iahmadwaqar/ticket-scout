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
      // COMMENTED OUT: This was killing ALL Chrome browsers, not just the profile-specific one
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
   * Force-kill browser processes (Chrome/Chromium) as last resort
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async forceKillBrowserProcesses(profileId) {
    // COMMENTED OUT: This function was killing ALL Chrome browsers, not just the profile-specific one
    // This caused the issue where closing a profile would close all Chrome instances
    
    /*
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
    */
    
    logger.info(profileId, 'Force-kill browser processes function disabled to prevent closing all Chrome browsers')
    return Promise.resolve()
  }

  /**
   * Bring browser to front (enhanced for Windows)
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
      
      // Step 2: For Windows - use OS-specific methods to bring the entire browser window to front
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
   * Windows-specific method to bring browser window to front with intelligent method selection
   * @param {Object} cdpClient - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async bringWindowToFrontWindows(cdpClient, profileId) {
    try {
      logger.info(profileId, 'Using intelligent Windows-specific bring to front methods')
      
      // First, check window state to determine the best approach
      const windowState = await this.checkWindowState(profileId, cdpClient)
      logger.info(profileId, `Window state detected: ${windowState.state}`)
      
      if (windowState.state === 'behind_other_window') {
        // Window is behind another window - need Windows API with focus stealing bypass
        logger.info(profileId, 'Window is behind other windows, using Windows API with focus stealing bypass')
        try {
          await this.useWindowsAPIBringToFront(profileId, cdpClient)
          logger.info(profileId, 'Successfully used Windows API method for window behind others')
          
          // Give the window focus action time to complete
          await new Promise(resolve => setTimeout(resolve, 500))
          return
        } catch (apiError) {
          logger.warn(profileId, `Windows API method failed: ${apiError.message}, falling back to other methods`)
        }
      }
      
      // For minimized windows or when window just needs focus, use CDP method
      if (windowState.state === 'minimized' || windowState.state === 'needs_focus') {
        logger.info(profileId, 'Window is minimized or needs focus, using CDP window manipulation')
        try {
          // Get the browser window bounds
          const windowBounds = await cdpClient.Browser.getWindowBounds({ windowId: 1 })
          
          // First minimize and then restore to force bring to front on Windows
          await cdpClient.Browser.setWindowBounds({
            windowId: 1,
            bounds: { windowState: 'minimized' }
          })
          
          // Wait a brief moment
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Then restore to normal state - this often brings window to front on Windows
          await cdpClient.Browser.setWindowBounds({
            windowId: 1,
            bounds: { windowState: 'normal' }
          })
          
          logger.info(profileId, 'Successfully used CDP window manipulation')
          return
        } catch (cdpError) {
          logger.warn(profileId, `CDP window manipulation failed: ${cdpError.message}, trying JavaScript methods`)
        }
      }
      
      // Always try JavaScript methods as a fallback or enhancement
      try {
        await cdpClient.Runtime.evaluate({
          expression: `
            // Try multiple methods to bring window to front
            (function() {
              try {
                // Method 1: Focus the window
                window.focus();
                
                // Method 2: Blur and then focus again (Windows workaround)
                window.blur();
                setTimeout(() => window.focus(), 50);
                
                // Method 3: Try to trigger user attention (if supported)
                if (window.navigator && window.navigator.requestMIDIAccess) {
                  // This often triggers OS attention on Windows
                  window.navigator.requestMIDIAccess().catch(() => {});
                }
                
                // Method 4: Try to manipulate document visibility
                if (document.hidden) {
                  const event = new Event('visibilitychange');
                  document.dispatchEvent(event);
                }
                
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
      
      // Final fallback - try Windows API if we haven't already
      if (windowState.state !== 'behind_other_window') {
        try {
          await this.useWindowsAPIBringToFront(profileId, cdpClient)
          logger.info(profileId, 'Successfully used Windows API as fallback method')
        } catch (apiError) {
          logger.warn(profileId, `Windows API fallback method failed: ${apiError.message}`)
        }
      }
      
    } catch (error) {
      logger.error(profileId, `Windows-specific bring to front failed: ${error.message}`)
      // Don't throw - this is an enhancement, not critical functionality
    }
  }
  
  /**
   * Check the current state of the browser window to determine the best focus method
   * @param {string} profileId - Profile ID for logging
   * @param {Object} cdpClient - CDP client to get window info
   * @returns {Promise<Object>} Window state information
   */
  async checkWindowState(profileId, cdpClient) {
    try {
      // First check if we can get window info via CDP
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
      
      // Check if window is behind others using Windows API
      const isWindowBehindOthers = await this.isWindowBehindOthers(profileId)
      
      if (isWindowBehindOthers) {
        return { state: 'behind_other_window', info: 'Window is behind other windows' }
      }
      
      // Default case - window probably just needs focus
      return { state: 'needs_focus', info: 'Window needs focus but is not minimized or behind others' }
      
    } catch (error) {
      logger.warn(profileId, `Could not determine window state: ${error.message}`)
      return { state: 'unknown', info: 'Could not determine window state' }
    }
  }
  
  /**
   * Check if the specific profile's window is behind other windows
   * @param {string} profileId - Profile ID to check
   * @returns {Promise<boolean>} True if window is behind others
   */
  async isWindowBehindOthers(profileId) {
    try {
      const powershellScript = `
        Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Auto)]
            public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);
        }';
        
        $profileId = "${profileId}"
        $foregroundWindow = [Win32]::GetForegroundWindow()
        
        # Get foreground window title
        $sb = New-Object System.Text.StringBuilder 512
        [Win32]::GetWindowText($foregroundWindow, $sb, 512)
        $foregroundTitle = $sb.ToString()
        
        # Get all Chrome processes
        $chromeProcesses = Get-Process | Where-Object { 
          ($_.ProcessName -like "*chrome*" -or $_.ProcessName -like "*chromium*") -and
          $_.MainWindowHandle -ne 0
        }
        
        $profileWindowFound = $false
        $profileWindowIsForeground = $false
        
        foreach ($process in $chromeProcesses) {
          $hwnd = $process.MainWindowHandle
          if ($hwnd -ne 0) {
            $sb = New-Object System.Text.StringBuilder 512
            [Win32]::GetWindowText($hwnd, $sb, 512)
            $currentTitle = $sb.ToString()
            
            # Check if this is our profile's window using the same patterns as the main method
            $isTargetWindow = $false
            
            if ($currentTitle -like "*$profileId *" -or
                $currentTitle -like "*$profileId-*" -or 
                $currentTitle -like "*-$profileId-*" -or
                $currentTitle -like "$profileId *" -or 
                $currentTitle -like "* $profileId" -or
                ($currentTitle -like "*GoLogin*" -and $currentTitle -like "*$profileId*") -or
                $currentTitle -like "*Profile $profileId*" -or 
                $currentTitle -like "*profile_$profileId*" -or 
                $currentTitle -like "*Profile-$profileId*") {
              $isTargetWindow = $true
              $profileWindowFound = $true
              
              # Check if this window is the foreground window
              if ($hwnd -eq $foregroundWindow) {
                $profileWindowIsForeground = $true
              }
              
              # Check if window is minimized
              $isMinimized = [Win32]::IsIconic($hwnd)
              
              Write-Output "ProfileWindow:$isTargetWindow;IsForeground:$profileWindowIsForeground;IsMinimized:$isMinimized;Title:$currentTitle"
              break
            }
          }
        }
        
        if ($profileWindowFound -and -not $profileWindowIsForeground) {
          Write-Output "BEHIND_OTHERS"
        } else {
          Write-Output "NOT_BEHIND_OTHERS"
        }
      `
      
      return new Promise((resolve) => {
        const powershell = spawn('powershell.exe', [
          '-ExecutionPolicy', 'Bypass',
          '-Command', powershellScript
        ])
        
        let output = ''
        
        powershell.stdout.on('data', (data) => {
          output += data.toString()
        })
        
        powershell.on('close', (code) => {
          const result = output.trim()
          const isBehindOthers = result.includes('BEHIND_OTHERS')
          logger.info(profileId, `Window behind others check result: ${isBehindOthers} (Output: ${result.slice(0, 200)}...)`) // Truncate long output
          resolve(isBehindOthers)
        })
        
        powershell.on('error', (error) => {
          logger.warn(profileId, `PowerShell error during window state check: ${error.message}`)
          resolve(false) // Default to not behind others on error
        })
        
        // Timeout after 5 seconds (increased from 3)
        setTimeout(() => {
          powershell.kill()
          logger.warn(profileId, 'Window state check timed out, assuming not behind others')
          resolve(false)
        }, 5000)
      })
      
    } catch (error) {
      logger.warn(profileId, `Could not check if window is behind others: ${error.message}`)
      return false
    }
  }
  
  /**
   * Use Windows API via PowerShell to bring specific Chrome window to front
   * Following Python hunterInit.py approach with Windows focus stealing bypass
   * @param {string} profileId - Profile ID for logging
   * @param {Object} cdpClient - CDP client to get specific window info
   * @returns {Promise<void>}
   */
  async useWindowsAPIBringToFront(profileId, cdpClient = null) {
    try {
      logger.info(profileId, 'Attempting Windows API bring to front via PowerShell')
      
      let windowTitle = ''
      let targetUrl = ''
      
      // Try to get specific window information from CDP
      if (cdpClient) {
        try {
          // Get current page info to identify the specific window
          const targets = await cdpClient.Target.getTargets()
          const pageTarget = targets.targetInfos.find(target => target.type === 'page')
          if (pageTarget) {
            targetUrl = pageTarget.url || ''
            windowTitle = pageTarget.title || ''
          }
        } catch (cdpError) {
          logger.warn(profileId, `Could not get CDP target info: ${cdpError.message}`)
        }
      }
      
      // PowerShell script with enhanced window identification and two-pass search strategy
      const powershellScript = `
        Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool BringWindowToTop(IntPtr hWnd);
            [DllImport("user32.dll", CharSet = CharSet.Auto)]
            public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            [DllImport("kernel32.dll")]
            public static extern bool AllocConsole();
            [DllImport("kernel32.dll")]
            public static extern bool FreeConsole();
            [DllImport("kernel32.dll")]
            public static extern IntPtr GetConsoleWindow();
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
        }';
        
        $profileId = "${profileId}"
        $targetUrl = "${targetUrl}"
        $windowTitle = "${windowTitle}"
        $foundWindow = $false
        $currentTime = Get-Date
        
        Write-Output "Enhanced window search for profile ID: $profileId (Two-pass strategy with focus stealing bypass)"
        
        # Get all Chrome processes with their creation times
        $chromeProcesses = Get-Process | Where-Object { 
          ($_.ProcessName -like "*chrome*" -or $_.ProcessName -like "*chromium*") -and
          $_.MainWindowHandle -ne 0
        } | Sort-Object StartTime -Descending
        
        Write-Output "Found $($chromeProcesses.Count) Chrome processes with windows"
        
        # Function to check if window matches profile using prioritized patterns
        function Test-ProfileWindow {
          param($title, $profileId, $windowTitle, $targetUrl)
          
          # Priority 1: GoLogin ID in Command Line Arguments (would need WMI, simplified here)
          # Priority 2: Exact Window Title Match from CDP
          if ($windowTitle -and $title -eq $windowTitle) {
            return @{ match = $true; method = "Exact title match"; priority = 2 }
          }
          
          # Priority 3: Profile ID in Window Title (Multiple patterns)
          # Pattern 3a: Direct profile ID with space (Python pattern: profile_name + " ")
          if ($title -like "*$profileId *") {
            return @{ match = $true; method = "Profile ID + space"; priority = 3 }
          }
          
          # Pattern 3b: Dash patterns
          if ($title -like "*$profileId-*" -or $title -like "*-$profileId-*") {
            return @{ match = $true; method = "Dash pattern"; priority = 3 }
          }
          
          # Pattern 3c: Position patterns
          if ($title -like "$profileId *" -or $title -like "* $profileId") {
            return @{ match = $true; method = "Position pattern"; priority = 3 }
          }
          
          # Pattern 3d: GoLogin + ProfileID combination
          if ($title -like "*GoLogin*" -and $title -like "*$profileId*") {
            return @{ match = $true; method = "GoLogin + Profile ID"; priority = 3 }
          }
          
          # Pattern 3e: Common profile patterns
          if ($title -like "*Profile $profileId*" -or $title -like "*profile_$profileId*" -or $title -like "*Profile-$profileId*") {
            return @{ match = $true; method = "Profile pattern"; priority = 3 }
          }
          
          # Priority 4: URL Domain Matching (fallback)
          if ($targetUrl -and $title -like "*$($targetUrl.Split('/')[2])*") {
            return @{ match = $true; method = "URL domain match"; priority = 4 }
          }
          
          return @{ match = $false; method = "No match"; priority = 999 }
        }
        
        # Function to attempt window activation with focus stealing bypass
        function Invoke-WindowActivation {
          param($hwnd, $title, $method)
          
          Write-Output "=== WINDOW ACTIVATION ATTEMPT ==="
          Write-Output "HWND: $hwnd"
          Write-Output "Title: '$title'"
          Write-Output "Method: $method"
          Write-Output "Attempting to bring window to front using $method for: '$title'"
          
          # FOCUS STEALING BYPASS METHOD (AllocConsole technique)
          try {
            Write-Output "Step 1: Applying focus stealing bypass (AllocConsole technique)"
            [Win32]::AllocConsole()
            $hWndConsole = [Win32]::GetConsoleWindow()
            [Win32]::SetWindowPos($hWndConsole, [IntPtr]::Zero, 0, 0, 0, 0, 0x0040) # SWP_NOZORDER
            [Win32]::FreeConsole()
            Write-Output "Focus stealing bypass applied successfully"
          } catch {
            Write-Output "Warning: Focus stealing bypass failed: $($_.Exception.Message)"
          }
          
          # If window is minimized, restore it first
          if ([Win32]::IsIconic($hwnd)) {
            Write-Output "Step 2: Window is minimized, restoring..."
            $restoreResult = [Win32]::ShowWindow($hwnd, 9) # SW_RESTORE = 9
            Write-Output "Restore result: $restoreResult"
            Start-Sleep -Milliseconds 200
          } else {
            Write-Output "Step 2: Window is not minimized, proceeding to focus"
          }
          
          # Now SetForegroundWindow should work because we bypassed the restriction
          Write-Output "Step 3: Attempting SetForegroundWindow"
          $success = [Win32]::SetForegroundWindow($hwnd)
          Write-Output "SetForegroundWindow result: $success"
          
          if ($success) {
            Write-Output "✓ SUCCESS: Window brought to front: '$title'"
            return $true
          } else {
            Write-Output "SetForegroundWindow failed, trying fallback methods..."
            
            # Fallback 1 - use BringWindowToTop
            Write-Output "Fallback 1: Trying BringWindowToTop"
            $bringResult = [Win32]::BringWindowToTop($hwnd)
            Write-Output "BringWindowToTop result: $bringResult"
            
            # Fallback 2 - use ShowWindow with SW_SHOW
            Write-Output "Fallback 2: Trying ShowWindow(SW_SHOW)"
            $showResult = [Win32]::ShowWindow($hwnd, 5) # SW_SHOW
            Write-Output "ShowWindow result: $showResult"
            
            Write-Output "✓ FALLBACK: Used alternative methods for: '$title'"
            return $true
          }
        }
        
        # FIRST PASS: Profile-Specific Criteria (High Priority)
        Write-Output "=== FIRST PASS: Profile-Specific Search ==="
        $firstPassMatches = @()
        
        foreach ($process in $chromeProcesses) {
          $hwnd = $process.MainWindowHandle
          if ($hwnd -ne 0) {
            $sb = New-Object System.Text.StringBuilder 512
            [Win32]::GetWindowText($hwnd, $sb, 512)
            $currentTitle = $sb.ToString()
            
            $matchResult = Test-ProfileWindow -title $currentTitle -profileId $profileId -windowTitle $windowTitle -targetUrl $targetUrl
            
            if ($matchResult.match -and $matchResult.priority -le 3) {
              $processAge = ($currentTime - $process.StartTime).TotalMinutes
              $firstPassMatches += @{
                hwnd = $hwnd
                title = $currentTitle
                method = $matchResult.method
                priority = $matchResult.priority
                age = $processAge
                pid = $process.Id
              }
              Write-Output "First pass match found: '$currentTitle' (Method: $($matchResult.method), Age: $([math]::Round($processAge, 1)) min, PID: $($process.Id))"
            }
          }
        }
        
        # Sort first pass matches by priority, then by age (newer first)
        $firstPassMatches = $firstPassMatches | Sort-Object priority, age
        
        if ($firstPassMatches.Count -gt 0) {
          $bestMatch = $firstPassMatches[0]
          $matchTitle = $bestMatch.title
          $matchMethod = $bestMatch.method
          $matchHwnd = $bestMatch.hwnd
          Write-Output "Using best first pass match: '$matchTitle' (Method: $matchMethod)"
          $foundWindow = Invoke-WindowActivation -hwnd $matchHwnd -title $matchTitle -method $matchMethod
        } else {
          Write-Output "No first pass matches found, proceeding to second pass..."
          
          # SECOND PASS: GoLogin-Specific Windows Within Last 60 Minutes
          Write-Output "=== SECOND PASS: Recent GoLogin Windows ==="
          $secondPassMatches = @()
          
          foreach ($process in $chromeProcesses) {
            $hwnd = $process.MainWindowHandle
            if ($hwnd -ne 0) {
              $processAge = ($currentTime - $process.StartTime).TotalMinutes
              
              # Only consider processes started within the last 60 minutes
              if ($processAge -le 60) {
                $sb = New-Object System.Text.StringBuilder 512
                [Win32]::GetWindowText($hwnd, $sb, 512)
                $currentTitle = $sb.ToString()
                
                # Look for any GoLogin indicators or fallback to URL matching
                if ($currentTitle -like "*GoLogin*" -or 
                    ($targetUrl -and $currentTitle -like "*$($targetUrl.Split('/')[2])*") -or
                    $currentTitle -like "*Chrome*" -or
                    $currentTitle -like "*Chromium*") {
                  
                  $secondPassMatches += @{
                    hwnd = $hwnd
                    title = $currentTitle
                    method = "Second pass: Recent GoLogin/Chrome window"
                    age = $processAge
                    pid = $process.Id
                  }
                  Write-Output "Second pass match found: '$currentTitle' (Age: $([math]::Round($processAge, 1)) min, PID: $($process.Id))"
                }
              }
            }
          }
          
          # Sort second pass matches by age (newer first)
          $secondPassMatches = $secondPassMatches | Sort-Object age
          
          if ($secondPassMatches.Count -gt 0) {
            $bestMatch = $secondPassMatches[0]
            $matchTitle = $bestMatch.title
            $matchMethod = $bestMatch.method
            $matchHwnd = $bestMatch.hwnd
            Write-Output "Using best second pass match: '$matchTitle' (Method: $matchMethod)"
            $foundWindow = Invoke-WindowActivation -hwnd $matchHwnd -title $matchTitle -method $matchMethod
          } else {
            Write-Output "No second pass matches found either."
          }
        }
        
        if (-not $foundWindow) {
          Write-Output "✗ No suitable window found for profile ID: $profileId"
          Write-Output "All available Chrome windows:"
          foreach ($process in $chromeProcesses) {
            $hwnd = $process.MainWindowHandle
            if ($hwnd -ne 0) {
              $sb = New-Object System.Text.StringBuilder 512
              [Win32]::GetWindowText($hwnd, $sb, 512)
              $title = $sb.ToString()
              $processAge = ($currentTime - $process.StartTime).TotalMinutes
              Write-Output "  - '$title' (Age: $([math]::Round($processAge, 1)) min, PID: $($process.Id))"
            }
          }
        }
      `
      
      return new Promise((resolve, reject) => {
        const powershell = spawn('powershell.exe', [
          '-ExecutionPolicy', 'Bypass',
          '-Command', powershellScript
        ])
        
        let output = ''
        let errorOutput = ''
        
        powershell.stdout.on('data', (data) => {
          output += data.toString()
        })
        
        powershell.stderr.on('data', (data) => {
          errorOutput += data.toString()
        })
        
        powershell.on('close', (code) => {
          if (code === 0) {
            logger.info(profileId, `PowerShell bring to front completed successfully`)
            logger.info(profileId, `PowerShell output: ${output.trim().slice(0, 500)}...`) // Show first 500 chars
            resolve()
          } else {
            logger.error(profileId, `PowerShell failed with code ${code}: ${errorOutput}`)
            reject(new Error(`PowerShell failed with code ${code}: ${errorOutput}`))
          }
        })
        
        powershell.on('error', (error) => {
          logger.error(profileId, `PowerShell process error: ${error.message}`)
          reject(new Error(`PowerShell process error: ${error.message}`))
        })
        
        // Timeout after 8 seconds (increased from 5)
        setTimeout(() => {
          logger.warn(profileId, 'PowerShell command timed out after 8 seconds')
          powershell.kill()
          reject(new Error('PowerShell command timed out'))
        }, 8000)
      })
      
    } catch (error) {
      logger.error(profileId, `Windows API bring to front failed: ${error.message}`)
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
}