import { logger } from '../../utils/logger-service.js'

export class CookieService {
  constructor() {
    this.baseUrl = 'https://api.gologin.com'
  }

  /**
   * Inject cookies into GoLogin profile via API
   * @param {string} token - GoLogin token
   * @param {string} profileId - GoLogin profile ID
   * @param {Array} cookies - Array of cookie objects
   * @returns {Promise<boolean>} Success status
   */
  async injectCookies(token, profileId, cookies) {
    if (!token) {
      logger.warn(profileId, 'No GoLogin token provided for cookie injection')
      return false
    }

    if (!cookies || cookies.length === 0) {
      logger.info(profileId, 'No cookies to inject')
      return true
    }

    try {
      logger.info(profileId, `Injecting ${cookies.length} cookies into GoLogin profile`)

      const response = await fetch(`${this.baseUrl}/browser/${profileId}/cookies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.formatCookiesForGoLogin(cookies))
      })

      if (response.ok) {
        logger.info(profileId, 'Cookies injected successfully')
        return true
      } else {
        logger.error(profileId, `Cookie injection failed: ${response.status} ${response.statusText}`)
        return false
      }
    } catch (error) {
      logger.error(profileId, `Cookie injection error: ${error.message}`)
      return false
    }
  }

  /**
   * Format cookies for GoLogin API
   * @param {Array} cookies - Raw cookie array
   * @returns {Array} Formatted cookies
   */
  formatCookiesForGoLogin(cookies) {
    return cookies.map(cookie => {
      // Basic cookie format conversion
      return {
        name: cookie.name || cookie.Name,
        value: cookie.value || cookie.Value,
        domain: cookie.domain || cookie.Domain,
        path: cookie.path || cookie.Path || '/',
        expires: cookie.expires || cookie.Expires,
        httpOnly: cookie.httpOnly || cookie.HttpOnly || false,
        secure: cookie.secure || cookie.Secure || false,
        sameSite: cookie.sameSite || cookie.SameSite || 'Lax'
      }
    })
  }

  /**
   * Extract cookies from profile data
   * @param {Object} profile - Profile object
   * @returns {Array} Cookie array
   */
  extractCookiesFromProfile(profile) {
    if (!profile.cookies) {
      return []
    }

    // Handle different cookie formats
    if (typeof profile.cookies === 'string') {
      try {
        return JSON.parse(profile.cookies)
      } catch (error) {
        logger.warn(profile.id, `Failed to parse cookies string: ${error.message}`)
        return []
      }
    }

    if (Array.isArray(profile.cookies)) {
      return profile.cookies
    }

    return []
  }
}

// Export singleton instance
export const cookieService = new CookieService()