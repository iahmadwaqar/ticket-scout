import { logger } from '../../utils/logger-service.js'
import { profileStore } from '../profile/profileStore.js'

/**
 * Session Bridge Service
 * Converts CDP browser sessions to HTTP sessions for monitoring
 * Reference from Python: exchangeData.py → sessionConnect()
 */
export class SessionBridgeService {
  constructor() {
    this.activeSessions = new Map() // profileId -> session info
  }

  /**
   * Create HTTP session from CDP browser instance
   * @param {string} profileId - Profile ID
   * @param {Object} config - Session configuration
   * @returns {Promise<Object>} Session creation result
   */
  async createSessionFromBrowser(profileId, config = {}) {
    try {
      logger.info(profileId, 'Creating HTTP session from browser')

      // Get CDP instance from profileStore
      const instances = profileStore.getGoLoginInstances(profileId)
      if (!instances?.cdp) {
        throw new Error('No CDP instance found for profile')
      }

      // Extract cookies from browser
      const cookies = await this.extractCookiesFromBrowser(instances.cdp, profileId)
      
      // Get profile data for proxy configuration
      const profile = profileStore.getProfile(profileId)
      if (!profile) {
        throw new Error('Profile not found in store')
      }

      // Create HTTP session with extracted cookies
      const session = await this.createHttpSession(profileId, cookies, profile, config)
      
      // Store session info
      this.activeSessions.set(profileId, {
        session,
        createdAt: new Date(),
        cookieCount: cookies.length,
        profileId
      })

      logger.info(profileId, `HTTP session created with ${cookies.length} cookies`)
      
      return {
        success: true,
        session,
        cookieCount: cookies.length,
        profileId
      }

    } catch (error) {
      logger.error(profileId, `Failed to create session: ${error.message}`)
      return {
        success: false,
        error: error.message,
        profileId
      }
    }
  }

  /**
   * Extract cookies from CDP browser instance
   * @param {Object} cdp - CDP client
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<Array>} Array of cookies
   */
  async extractCookiesFromBrowser(cdp, profileId) {
    try {
      logger.info(profileId, 'Extracting cookies from browser')

      // Get all cookies using CDP
      const result = await cdp.Network.getCookies()
      const cookies = result.cookies || []

      logger.info(profileId, `Extracted ${cookies.length} cookies from browser`)
      
      return cookies

    } catch (error) {
      logger.error(profileId, `Cookie extraction failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Create HTTP session with cookies and proxy
   * @param {string} profileId - Profile ID
   * @param {Array} cookies - Browser cookies
   * @param {Object} profile - Profile data
   * @param {Object} config - Session config
   * @returns {Promise<Object>} HTTP session object
   */
  async createHttpSession(profileId, cookies, profile, config) {
    try {
      // Use dynamic import for HTTP client to avoid bundling issues
      const { default: axios } = await import('axios')
      
      // Create axios instance with configuration
      const sessionConfig = {
        timeout: config.timeout || 30000,
        headers: {
          'User-Agent': profile.browserData?.userAgent || 'Mozilla/5.0 (Linux; Android 10) Chrome/120.0.0.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      }

      // Add proxy configuration if available
      if (profile.proxy) {
        sessionConfig.proxy = this.parseProxyConfig(profile.proxy)
        logger.info(profileId, `Session configured with proxy: ${profile.proxy}`)
      }

      // Create axios instance
      const session = axios.create(sessionConfig)

      // Configure cookie handling
      this.configureCookieHandling(session, cookies)

      // Add request/response interceptors for logging
      this.addSessionInterceptors(session, profileId)

      return session

    } catch (error) {
      logger.error(profileId, `HTTP session creation failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Parse proxy configuration string
   * @param {string} proxyString - Proxy string (host:port or username:password@host:port)
   * @returns {Object} Proxy configuration
   */
  parseProxyConfig(proxyString) {
    try {
      if (!proxyString) return null

      // Handle format: username:password@host:port
      if (proxyString.includes('@')) {
        const [auth, hostPort] = proxyString.split('@')
        const [username, password] = auth.split(':')
        const [host, port] = hostPort.split(':')
        
        return {
          protocol: 'http',
          host,
          port: parseInt(port),
          auth: { username, password }
        }
      }

      // Handle format: host:port
      const [host, port] = proxyString.split(':')
      return {
        protocol: 'http',
        host,
        port: parseInt(port)
      }

    } catch (error) {
      logger.warn('Global', `Failed to parse proxy config: ${proxyString}`)
      return null
    }
  }

  /**
   * Configure cookie handling for session
   * @param {Object} session - Axios session
   * @param {Array} cookies - Cookies to set
   */
  configureCookieHandling(session, cookies) {
    // Convert CDP cookies to cookie string format
    const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
    
    if (cookieString) {
      session.defaults.headers.common['Cookie'] = cookieString
    }

    // Add request interceptor to maintain cookies
    session.interceptors.request.use(
      (config) => {
        if (!config.headers['Cookie'] && cookieString) {
          config.headers['Cookie'] = cookieString
        }
        return config
      },
      (error) => Promise.reject(error)
    )
  }

  /**
   * Add request/response interceptors for logging and error handling
   * @param {Object} session - Axios session
   * @param {string} profileId - Profile ID for logging
   */
  addSessionInterceptors(session, profileId) {
    // Request interceptor
    session.interceptors.request.use(
      (config) => {
        logger.debug(profileId, `HTTP Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error(profileId, `HTTP Request Error: ${error.message}`)
        return Promise.reject(error)
      }
    )

    // Response interceptor  
    session.interceptors.response.use(
      (response) => {
        logger.debug(profileId, `HTTP Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        const status = error.response?.status || 'No Response'
        const url = error.config?.url || 'Unknown URL'
        logger.warn(profileId, `HTTP Response Error: ${status} ${url}`)
        return Promise.reject(error)
      }
    )
  }

  /**
   * Refresh session cookies from browser
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Refresh result
   */
  async refreshSessionCookies(profileId) {
    try {
      const sessionInfo = this.activeSessions.get(profileId)
      if (!sessionInfo) {
        throw new Error('No active session found')
      }

      // Get fresh cookies from browser
      const instances = profileStore.getGoLoginInstances(profileId)
      if (!instances?.cdp) {
        throw new Error('No CDP instance found')
      }

      const freshCookies = await this.extractCookiesFromBrowser(instances.cdp, profileId)
      
      // Update session cookies
      this.configureCookieHandling(sessionInfo.session, freshCookies)
      
      // Update session info
      sessionInfo.cookieCount = freshCookies.length
      sessionInfo.refreshedAt = new Date()

      logger.info(profileId, `Session cookies refreshed: ${freshCookies.length} cookies`)
      
      return {
        success: true,
        cookieCount: freshCookies.length,
        profileId
      }

    } catch (error) {
      logger.error(profileId, `Session refresh failed: ${error.message}`)
      return {
        success: false,
        error: error.message,
        profileId
      }
    }
  }

  /**
   * Get active session for profile
   * @param {string} profileId - Profile ID
   * @returns {Object|null} Session object or null
   */
  getSession(profileId) {
    const sessionInfo = this.activeSessions.get(profileId)
    return sessionInfo ? sessionInfo.session : null
  }

  /**
   * Check if profile has active session
   * @param {string} profileId - Profile ID
   * @returns {boolean} True if session exists
   */
  hasSession(profileId) {
    return this.activeSessions.has(profileId)
  }

  /**
   * Close session for profile
   * @param {string} profileId - Profile ID
   */
  closeSession(profileId) {
    if (this.activeSessions.has(profileId)) {
      this.activeSessions.delete(profileId)
      logger.info(profileId, 'HTTP session closed')
    }
  }

  /**
   * Close all active sessions
   */
  closeAllSessions() {
    const profileIds = Array.from(this.activeSessions.keys())
    for (const profileId of profileIds) {
      this.closeSession(profileId)
    }
    logger.info('Global', 'All HTTP sessions closed')
  }

  /**
   * Get session statistics
   * @returns {Object} Session stats
   */
  getSessionStats() {
    return {
      activeSessionCount: this.activeSessions.size,
      activeSessions: Array.from(this.activeSessions.keys())
    }
  }
}

// Export singleton instance
export const sessionBridgeService = new SessionBridgeService()