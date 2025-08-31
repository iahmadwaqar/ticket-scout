import { BrowserService } from './browser-service.js'
import { ConnectionManager } from './connection-manager.js'
import { cookieService } from '../cookies/cookie-service.js'
import { logger } from '../../utils/logger-service.js'
import { profileStore } from '../profile/profileStore.js'

export class GoLoginService {
  constructor() {
    this.browserService = new BrowserService()
    this.connectionManager = new ConnectionManager()
  }

  /**
   * Initialize GoLogin browser and CDP connection for a profile
   * @param {Object} profile - Profile object with token, id, proxy
   * @param {boolean} injectCookies - Whether to inject cookies (default: false)
   * @returns {Promise<Object>} Initialization result
   */
  async initializeProfile(profile, injectCookies = false) {
    try {
      // Step 1: Launch GoLogin browser
      const browserData = await this.browserService.launchBrowser(profile)
      const { gologin, browserResult, wsUrl, gologinId } = browserData

      // Step 2: Update profile store with new gologinId if it was created
      if (gologinId && gologinId !== profile.goLoginId) {
        logger.info(profile.id, `Updating profile store with new GoLogin ID: ${gologinId}`)
        profileStore.updateGoLoginId(profile.id, gologinId)
      }

      // Step 3: Inject cookies if enabled and available (before connecting CDP)
      if (injectCookies) {
        const cookies = cookieService.extractCookiesFromProfile(profile)
        if (cookies.length > 0 && profile.token) {
          logger.info(profile.id, `Injecting ${cookies.length} cookies into GoLogin profile`)
          await cookieService.injectCookies(profile.token, gologinId, cookies)
        } else if (cookies.length === 0) {
          logger.info(profile.id, 'Cookie injection enabled but no cookies found in profile')
        } else if (!profile.token) {
          logger.warn(profile.id, 'Cookie injection enabled but no token available')
        }
      } else {
        logger.info(profile.id, 'Cookie injection disabled by configuration')
      }

      // Step 4: Connect to CDP immediately using the WebSocket URL
      const cdpClient = await this.connectionManager.connectCDP(wsUrl, profile.id)

      // Step 5: Store all instances in profileStore
      profileStore.setGoLoginInstances(profile.id, {
        gologin: gologin,
        browser: browserResult,
        cdp: cdpClient
      })

      return {
        success: true,
        gologin,
        browser: browserResult,
        cdp: cdpClient,
        wsUrl,
        gologinId
      }
    } catch (error) {
      logger.error(profile.id, `GoLogin profile initialization failed: ${error.message}`)
      
      // Clean up any partial initialization
      await this.cleanupProfile(profile.id)
      
      throw error
    }
  }

  /**
   * Close GoLogin browser and CDP connection for a profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Close result
   */
  async closeProfile(profileId) {
    try {
      logger.info(profileId, 'Starting GoLogin profile closure')

      // Get instances from profileStore
      const instances = profileStore.getGoLoginInstances(profileId)

      if (!instances) {
        logger.warn(profileId, 'No GoLogin instances found to close')
        return { success: true, message: 'No instances to close' }
      }

      // Close CDP connection first
      if (instances.cdp) {
        await this.connectionManager.closeCDP(instances.cdp, profileId)
      }

      // Close GoLogin browser with additional browser management
      if (instances.gologin) {
        await this.browserService.closeBrowser(
          instances.gologin, 
          profileId, 
          instances.browser, // Pass browser result for additional cleanup
          instances.cdp      // Pass CDP client for browser control
        )
      }

      // Clean up from profileStore
      profileStore.clearGoLoginInstances(profileId)

      logger.info(profileId, 'GoLogin profile closed successfully')

      return {
        success: true,
        message: 'Profile closed successfully'
      }
    } catch (error) {
      logger.error(profileId, `Failed to close GoLogin profile: ${error.message}`)
      throw error
    }
  }

  /**
   * Bring GoLogin browser to front for a profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Bring to front result
   */
  async bringProfileToFront(profileId) {
    try {
      logger.info(profileId, 'Bringing GoLogin profile to front')

      // Get instances from profileStore
      const instances = profileStore.getGoLoginInstances(profileId)

      if (!instances || !instances.gologin || !instances.cdp) {
        throw new Error('No GoLogin browser or CDP instance found for profile')
      }

      // Bring browser to front
      const success = await this.browserService.bringToFront(instances.cdp, profileId)

      return {
        success,
        message: success ? 'Profile brought to front successfully' : 'Failed to bring profile to front'
      }
    } catch (error) {
      logger.error(profileId, `Failed to bring profile to front: ${error.message}`)
      throw error
    }
  }

  /**
   * Get GoLogin instances for a profile
   * @param {string} profileId - Profile ID
   * @returns {Object|null} GoLogin instances or null
   */
  getProfileInstances(profileId) {
    return profileStore.getGoLoginInstances(profileId)
  }

  /**
   * Check if profile has active GoLogin instances
   * @param {string} profileId - Profile ID
   * @returns {boolean} True if instances exist
   */
  hasActiveInstances(profileId) {
    const instances = profileStore.getGoLoginInstances(profileId)
    return !!(instances && instances.gologin && instances.cdp)
  }

  /**
   * Clean up profile instances (used for error recovery)
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async cleanupProfile(profileId) {
    try {
      logger.info(profileId, 'Cleaning up GoLogin profile instances')

      const instances = profileStore.getGoLoginInstances(profileId)
      
      if (instances) {
        // Clean up CDP connection
        if (instances.cdp) {
          try {
            await this.connectionManager.closeCDP(instances.cdp, profileId)
          } catch (error) {
            logger.warn(profileId, `CDP cleanup warning: ${error.message}`)
          }
        }

        // Clean up GoLogin browser with additional browser management
        if (instances.gologin) {
          try {
            await this.browserService.closeBrowser(
              instances.gologin, 
              profileId, 
              instances.browser, // Pass browser result for additional cleanup
              instances.cdp      // Pass CDP client for browser control
            )
          } catch (error) {
            logger.warn(profileId, `Browser cleanup warning: ${error.message}`)
          }
        }

        // Remove from profileStore
        profileStore.clearGoLoginInstances(profileId)
      }

      logger.info(profileId, 'GoLogin profile cleanup completed')
    } catch (error) {
      logger.error(profileId, `Error during profile cleanup: ${error.message}`)
    }
  }

  /**
   * Get CDP client for a profile
   * @param {string} profileId - Profile ID
   * @returns {Object|null} CDP client or null
   */
  getCDPClient(profileId) {
    const instances = profileStore.getGoLoginInstances(profileId)
    return instances?.cdp || null
  }

  /**
   * Get GoLogin instance for a profile
   * @param {string} profileId - Profile ID
   * @returns {Object|null} GoLogin instance or null
   */
  getGoLoginInstance(profileId) {
    const instances = profileStore.getGoLoginInstances(profileId)
    return instances?.gologin || null
  }

  /**
   * Update cookies for an active profile
   * @param {string} profileId - Profile ID
   * @param {Array} cookies - New cookies to inject
   * @returns {Promise<boolean>} Success status
   */
  async updateProfileCookies(profileId, cookies) {
    try {
      const profile = profileStore.getProfile(profileId)
      if (!profile || !profile.token) {
        logger.warn(profileId, 'Cannot update cookies: no profile or token found')
        return false
      }

      if (!profile.goLoginId) {
        logger.warn(profileId, 'Cannot update cookies: no GoLogin ID found')
        return false
      }

      logger.info(profileId, `Updating ${cookies.length} cookies for active profile`)
      return await cookieService.injectCookies(profile.token, profile.goLoginId, cookies)
    } catch (error) {
      logger.error(profileId, `Failed to update profile cookies: ${error.message}`)
      return false
    }
  }

  /**
   * Close all active profiles and clean up all GoLogin instances
   * Used during application shutdown
   * @returns {Promise<Object>} Cleanup result
   */
  async closeAllProfiles() {
    try {
      logger.info('Global', 'Starting comprehensive GoLogin cleanup for all profiles')
      const cleanupStartTime = Date.now()
      
      // Get all profiles with GoLogin instances
      const allInstances = profileStore.getAllGoLoginInstances()
      
      if (allInstances.length === 0) {
        logger.info('Global', 'No active GoLogin instances found to cleanup')
        return {
          success: true,
          message: 'No instances to cleanup',
          profilesProcessed: 0,
          duration: 0
        }
      }
      
      logger.info('Global', `Found ${allInstances.length} profiles with active GoLogin instances`)
      
      // Create cleanup promises for all profiles
      const cleanupPromises = allInstances.map(async ({ profileId, instances }) => {
        const profileStartTime = Date.now()
        try {
          logger.info(profileId, 'Starting profile cleanup')
          
          // Close CDP connection first
          if (instances.cdp) {
            try {
              await this.connectionManager.closeCDP(instances.cdp, profileId)
              logger.info(profileId, 'CDP connection closed')
            } catch (cdpError) {
              logger.warn(profileId, `CDP cleanup warning: ${cdpError.message}`)
            }
          }
          
          // Close GoLogin browser with comprehensive cleanup
          if (instances.gologin) {
            try {
              await this.browserService.closeBrowser(
                instances.gologin,
                profileId,
                instances.browser,
                instances.cdp
              )
              logger.info(profileId, 'GoLogin browser closed')
            } catch (browserError) {
              logger.warn(profileId, `Browser cleanup warning: ${browserError.message}`)
            }
          }
          
          // Remove from profileStore
          profileStore.clearGoLoginInstances(profileId)
          
          const profileDuration = Date.now() - profileStartTime
          logger.info(profileId, `Profile cleanup completed in ${profileDuration}ms`)
          
          return {
            profileId,
            success: true,
            duration: profileDuration
          }
        } catch (error) {
          const profileDuration = Date.now() - profileStartTime
          logger.error(profileId, `Profile cleanup failed: ${error.message} (${profileDuration}ms)`)
          
          // Force cleanup from profileStore even if GoLogin cleanup fails
          try {
            profileStore.clearGoLoginInstances(profileId)
          } catch (storeError) {
            logger.error(profileId, `ProfileStore cleanup also failed: ${storeError.message}`)
          }
          
          return {
            profileId,
            success: false,
            error: error.message,
            duration: profileDuration
          }
        }
      })
      
      // Execute all cleanup operations
      const results = await Promise.allSettled(cleanupPromises)
      
      // Process results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length
      const totalDuration = Date.now() - cleanupStartTime
      
      logger.info(
        'Global',
        `GoLogin cleanup completed - processed: ${allInstances.length}, successful: ${successful}, failed: ${failed}, duration: ${totalDuration}ms`
      )
      
      return {
        success: failed === 0,
        message: `Cleanup completed - ${successful} successful, ${failed} failed`,
        profilesProcessed: allInstances.length,
        successful,
        failed,
        duration: totalDuration,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
      }
    } catch (error) {
      logger.error('Global', `GoLogin cleanup failed: ${error.message}`)
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`,
        profilesProcessed: 0,
        duration: 0
      }
    }
  }

  /**
   * Force cleanup all GoLogin instances with enhanced fallback mechanisms
   * Used as last resort during emergency shutdown
   * @returns {Promise<Object>} Cleanup result
   */
  async forceCleanupAll() {
    try {
      logger.warn('Global', 'Starting FORCE cleanup of all GoLogin instances')
      const cleanupStartTime = Date.now()
      
      // Get all instances directly
      const allInstances = profileStore.getAllGoLoginInstances()
      
      if (allInstances.length === 0) {
        logger.info('Global', 'No instances found for force cleanup')
        return {
          success: true,
          message: 'No instances to force cleanup',
          profilesProcessed: 0
        }
      }
      
      logger.warn('Global', `Force cleaning ${allInstances.length} GoLogin instances`)
      
      // Create force cleanup promises with shorter timeouts
      const forceCleanupPromises = allInstances.map(async ({ profileId, instances }) => {
        try {
          logger.warn(profileId, 'Starting FORCE cleanup')
          
          // Quick CDP cleanup with short timeout
          if (instances.cdp) {
            try {
              await Promise.race([
                this.connectionManager.closeCDP(instances.cdp, profileId),
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('CDP force cleanup timeout')), 3000)
                })
              ])
            } catch (cdpError) {
              logger.warn(profileId, `Force CDP cleanup failed: ${cdpError.message}`)
            }
          }
          
          // Force browser cleanup with enhanced fallback
          if (instances.gologin) {
            try {
              await Promise.race([
                this.browserService.performEnhancedFallbackCleanup(
                  instances.gologin,
                  profileId,
                  instances.browser
                ),
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Browser force cleanup timeout')), 5000)
                })
              ])
            } catch (browserError) {
              logger.warn(profileId, `Force browser cleanup failed: ${browserError.message}`)
            }
          }
          
          // Always clear from profileStore
          profileStore.clearGoLoginInstances(profileId)
          
          logger.warn(profileId, 'FORCE cleanup completed')
          return { profileId, success: true }
        } catch (error) {
          logger.error(profileId, `FORCE cleanup failed: ${error.message}`)
          
          // Still clear from profileStore
          try {
            profileStore.clearGoLoginInstances(profileId)
          } catch (storeError) {
            logger.error(profileId, `ProfileStore force cleanup failed: ${storeError.message}`)
          }
          
          return { profileId, success: false, error: error.message }
        }
      })
      
      // Execute all force cleanup operations with global timeout
      const results = await Promise.race([
        Promise.allSettled(forceCleanupPromises),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Global force cleanup timeout')), 10000)
        })
      ])
      
      // Force-kill any remaining browser processes
      try {
        logger.warn('Global', 'Force-killing any remaining browser processes')
        await this.browserService.forceKillBrowserProcesses('Global')
      } catch (killError) {
        logger.error('Global', `Force-kill browser processes failed: ${killError.message}`)
      }
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length
      const totalDuration = Date.now() - cleanupStartTime
      
      logger.warn(
        'Global',
        `FORCE cleanup completed - processed: ${allInstances.length}, successful: ${successful}, failed: ${failed}, duration: ${totalDuration}ms`
      )
      
      return {
        success: true, // Always return success for force cleanup
        message: `Force cleanup completed - ${successful} successful, ${failed} failed`,
        profilesProcessed: allInstances.length,
        successful,
        failed,
        duration: totalDuration
      }
    } catch (error) {
      logger.error('Global', `Force cleanup failed: ${error.message}`)
      
      // Last resort: try to kill all browser processes
      try {
        await this.browserService.forceKillBrowserProcesses('Global')
      } catch (killError) {
        logger.error('Global', `Last resort process kill failed: ${killError.message}`)
      }
      
      return {
        success: false,
        message: `Force cleanup failed: ${error.message}`,
        profilesProcessed: 0
      }
    }
  }

  /**
   * Dispose of the GoLogin service and all resources
   * Called during application shutdown
   * @returns {Promise<void>}
   */
  async dispose() {
    try {
      logger.info('Global', 'Starting GoLogin service disposal')
      const disposeStartTime = Date.now()
      
      // First attempt graceful cleanup
      const cleanupResult = await this.closeAllProfiles()
      
      if (!cleanupResult.success) {
        logger.warn('Global', 'Graceful cleanup failed, attempting force cleanup')
        await this.forceCleanupAll()
      }
      
      const disposeDuration = Date.now() - disposeStartTime
      logger.info('Global', `GoLogin service disposal completed in ${disposeDuration}ms`)
    } catch (error) {
      logger.error('Global', `GoLogin service disposal error: ${error.message}`)
      
      // Last resort cleanup
      try {
        await this.forceCleanupAll()
      } catch (forceError) {
        logger.error('Global', `Force disposal also failed: ${forceError.message}`)
      }
    }
  }
}

// Export singleton instance
export const goLoginService = new GoLoginService()