import { logger } from '../../utils/logger-service.js'
import { profileStore } from '../profile/profileStore.js'
import { ticketShopApi } from '../api/ticketshop-api.js'

/**
 * Cookie Update Service
 * Handles updating cookies for profiles from API
 * Reference from Python: updateCookies.py → addCookies()
 */
export class CookieUpdateService {
  constructor() {
    this.isUpdating = false
  }

  /**
   * Add cookies from API following Python addCookies() logic
   * @returns {Promise<Array|null>} Cookie list or null if failed
   */
  async addCookies() {
    try {
      logger.info('Global', 'Fetching cookies from API')
      
      // Get cookies from API (following Python getCookies())
      const cookiesData = await ticketShopApi.getCookies()
      
      if (!cookiesData || cookiesData.length === 0) {
        logger.warn('Global', 'There was an issue updating the cookies')
        return null
      }

      // Transform cookies to CDP format (exact Python logic)
      const cookieList = []
      for (const cookie of cookiesData) {
        const newCookie = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: '/',
          secure: false,
          httpOnly: false
        }

        // Add expires if present (exact Python logic)
        if (cookie.expires) {
          newCookie.expires = parseFloat(cookie.expires)
        }

        cookieList.push(newCookie)
      }

      logger.info('Global', `Processed ${cookieList.length} cookies from API`)
      return cookieList

    } catch (error) {
      logger.error('Global', `Failed to add cookies: ${error.message}`)
      return null
    }
  }

  /**
   * Update cookies for all profiles (following Python cookieUpdater logic)
   * @returns {Promise<Object>} Update result
   */
  async updateAllCookies() {
    if (this.isUpdating) {
      return {
        success: false,
        message: 'Cookie update already in progress'
      }
    }

    this.isUpdating = true

    try {
      logger.info('Global', 'Starting bulk cookie update')

      // Get cookie list from API
      const cookieList = await this.addCookies()
      if (!cookieList) {
        return {
          success: false,
          message: 'There was an issue updating the cookies'
        }
      }

      // Get all valid profiles (following Python logic)
      const allProfiles = profileStore.getAllProfiles()
      const validProfiles = allProfiles.filter(profile => {
        const instances = profileStore.getGoLoginInstances(profile.id)
        return instances && instances.cdp // Only profiles with active browser instances
      })

      if (validProfiles.length === 0) {
        return {
          success: false,
          message: 'No active profiles found for cookie update'
        }
      }

      // Update cookies for each profile
      const results = []
      for (const profile of validProfiles) {
        try {
          const result = await this.processProfile(profile, cookieList, true) // autostart = true
          results.push({
            profileId: profile.id,
            success: result.success,
            message: result.message
          })
        } catch (error) {
          logger.error(profile.id, `Cookie update failed: ${error.message}`)
          results.push({
            profileId: profile.id,
            success: false,
            message: error.message
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      logger.info('Global', `Cookie update completed: ${successCount}/${validProfiles.length} profiles updated`)

      return {
        success: true,
        message: `Updated cookies for ${successCount}/${validProfiles.length} profiles`,
        results,
        cookieCount: cookieList.length
      }

    } catch (error) {
      logger.error('Global', `Bulk cookie update failed: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Update cookies for a single profile (following Python cookieUpdater logic)
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Update result
   */
  async updateSingleProfile(profileId) {
    try {
      logger.info(profileId, 'Starting single profile cookie update')

      const profile = profileStore.getProfile(profileId)
      if (!profile) {
        return {
          success: false,
          message: 'Profile not found',
          profileId
        }
      }

      // Get cookie list from API
      const cookieList = await this.addCookies()
      if (!cookieList) {
        return {
          success: false,
          message: 'There was an issue updating the cookies',
          profileId
        }
      }

      // Process the profile
      const result = await this.processProfile(profile, cookieList, false) // autostart = false
      
      return {
        success: result.success,
        message: result.message,
        profileId,
        cookieCount: cookieList.length
      }

    } catch (error) {
      logger.error(profileId, `Single profile cookie update failed: ${error.message}`)
      return {
        success: false,
        message: error.message,
        profileId
      }
    }
  }

  /**
   * Process individual profile cookie update (following Python processProfile logic)
   * @param {Object} profile - Profile object
   * @param {Array} cookieList - List of cookies to inject
   * @param {boolean} autostart - Whether to auto-start monitoring after update
   * @returns {Promise<Object>} Process result
   */
  async processProfile(profile, cookieList, autostart = false) {
    const profileId = profile.id

    try {
      // Get browser instances
      const instances = profileStore.getGoLoginInstances(profileId)
      if (!instances?.cdp) {
        return {
          success: false,
          message: 'No browser instance found'
        }
      }

      // Determine domain URL (following Python logic)
      let domainUrl = profile.browserData?.domainUrl
      if (!domainUrl) {
        domainUrl = 'https://www.google.com'
      }

      // Navigate to IP info page first (following Python pattern)
      await instances.cdp.Page.navigate({ url: 'https://ipinfo.io/json' })
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Set cookies using CDP (following Python logic)
      await instances.cdp.Network.setCookies({ cookies: cookieList })
      logger.info(profileId, `Injected ${cookieList.length} cookies`)

      // Navigate to domain URL (following Python logic)
      await instances.cdp.Page.navigate({ url: domainUrl })
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update profile status
      profileStore.updateStatus(profileId, 'CookiesUpdated')

      // If autostart, trigger monitoring (following Python logic)
      if (autostart) {
        // This would trigger the exchange/monitoring function
        // For now, just update the status
        profileStore.updateStatus(profileId, 'Ready')
        logger.info(profileId, 'Profile ready for auto-start')
      }

      logger.info(profileId, 'Cookie update completed successfully')
      
      return {
        success: true,
        message: 'Cookies updated successfully'
      }

    } catch (error) {
      logger.error(profileId, `Profile processing failed: ${error.message}`)
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Check if cookie update is in progress
   * @returns {boolean} True if updating
   */
  isUpdateInProgress() {
    return this.isUpdating
  }

  /**
   * Get cookie update statistics
   * @returns {Object} Update stats
   */
  getUpdateStats() {
    return {
      isUpdating: this.isUpdating,
      lastUpdate: this.lastUpdate || null,
      updateCount: this.updateCount || 0
    }
  }
}

// Export singleton instance
export const cookieUpdateService = new CookieUpdateService()