import { logger } from '../../utils/logger-service.js'
import { liverpoolLogin } from './domains/liverpool-login.js'
import { manutdLogin } from './domains/manutd-login.js'
import { leedsLogin } from './domains/leeds-login.js'
import { profileStore } from '../profile/profileStore.js'

/**
 * Login Service Factory
 * Implements domain-specific login strategies
 * Reference from Python: loginData.py
 */
export class LoginService {
  constructor() {
    // Domain mapping for login strategies
    this.domainStrategies = {
      'Liverpool': liverpoolLogin,
      'ManchesterUnited': manutdLogin,
      'Leedsunited': leedsLogin
    }
  }

  /**
   * Perform login for a profile based on its domain
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Login result with session
   */
  async performLogin(profileId) {
    try {
      logger.info(profileId, 'Starting login process')

      // Get profile data
      const profile = profileStore.getProfile(profileId)
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`)
      }

      // Get CDP instance
      const instances = profileStore.getGoLoginInstances(profileId)
      if (!instances || !instances.cdp) {
        throw new Error(`No CDP instance found for profile ${profileId}`)
      }

      // Extract domain from profile (following user instruction #1)
      const domain = profile.domain
      if (!domain) {
        throw new Error(`No domain found in profile for ${profileId}`)
      }

      logger.info(profileId, `Detected domain: ${domain}`)

      // Get login strategy for domain
      const loginStrategy = this.domainStrategies[domain]
      if (!loginStrategy) {
        throw new Error(`No login strategy found for domain: ${domain}`)
      }

      // Prepare login parameters
      const loginParams = {
        cdp: instances.cdp,
        profileId: profileId,
        email: profile.email,
        password: profile.password,
        proxy: profile.proxy,
        matchUrl: profile.matchUrl,
        browserData: profile.browserData
      }

      // Execute domain-specific login
      logger.info(profileId, `Executing ${domain} login strategy`)
      const result = await loginStrategy(loginParams)
      console.log('result at loginService', result)

      if (result.success) {
        // Store extracted cookies in profile (following user instruction #3)
        if (result.cookies && result.cookies.length > 0) {
          logger.info(profileId, `Storing ${result.cookies.length} cookies in profile`)
          profileStore.updateProfileField(profileId, 'extractedCookies', result.cookies)
          profileStore.updateProfileField(profileId, 'lastLoginTime', new Date().toISOString())
        }

        logger.info(profileId, 'Login completed successfully')
      }

      return result

    } catch (error) {
      logger.error(profileId, `Login failed: ${error.message}`)
      return {
        success: false,
        error: error.message,
        profileId: profileId
      }
    }
  }

  /**
   * Extract cookies from CDP session
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<Array>} Array of cookies
   */
  async extractCookies(cdp, profileId) {
    try {
      logger.info(profileId, 'Extracting cookies from CDP session')

      const response = await cdp.Network.getCookies()
      const cookies = response.cookies || []

      logger.info(profileId, `Extracted ${cookies.length} cookies`)
      return cookies

    } catch (error) {
      logger.error(profileId, `Cookie extraction failed: ${error.message}`)
      return []
    }
  }

  /**
   * Get available login domains
   * @returns {Array} Array of supported domain names
   */
  getAvailableDomains() {
    return Object.keys(this.domainStrategies)
  }
}

// Export singleton instance
export const loginService = new LoginService()