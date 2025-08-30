import { logger } from '../../utils/logger-service.js'

/**
 * Proxy Service - Configuration and parsing for browser proxies
 * 
 * Handles proxy string parsing following Python launchBrowser.py patterns
 * Supports two proxy formats:
 * 1. username:password@host:port (with authentication)
 * 2. host|port (without authentication)
 * 
 * Features:
 * - Proxy string parsing and validation
 * - GoLogin proxy configuration generation
 * - Fallback handling for invalid proxies
 * - Proxy rotation and management utilities
 */

export class ProxyService {
  constructor() {
    this.defaultProxyConfig = {
      mode: "none",
      host: "string",
      port: 0,
      username: "string",
      password: "string"
    }
  }

  /**
   * Parse proxy string into GoLogin-compatible proxy configuration
   * Following Python launchBrowser.py proxy parsing logic
   * 
   * @param {string} proxyString - Proxy string in format "user:pass@host:port" or "host|port"
   * @returns {Object} GoLogin proxy configuration object
   */
  parseProxyString(proxyString) {
    try {
      // Handle empty or null proxy strings
      if (!proxyString || typeof proxyString !== 'string' || proxyString.trim() === '') {
        logger.info('Proxy', 'No proxy provided, using no-proxy configuration')
        return this.getNoProxyConfig()
      }

      const trimmedProxy = proxyString.trim()

      // Format 1: username:password@host:port
      if (trimmedProxy.includes('@')) {
        return this.parseAuthenticatedProxy(trimmedProxy)
      }
      
      // Format 2: host|port (no authentication)
      if (trimmedProxy.includes('|')) {
        return this.parseSimpleProxy(trimmedProxy)
      }

      // Invalid format - log and return no-proxy config
      logger.warn('Proxy', `Invalid proxy format: ${proxyString}. Expected formats: "user:pass@host:port" or "host|port"`)
      return this.getNoProxyConfig()
    } catch (error) {
      logger.error('Proxy', `Failed to parse proxy string "${proxyString}": ${error.message}`)
      return this.getNoProxyConfig()
    }
  }

  /**
   * Parse authenticated proxy format: username:password@host:port
   * Following Python logic from launchBrowser.py
   * 
   * @param {string} proxyString - Authenticated proxy string
   * @returns {Object} GoLogin proxy configuration
   */
  parseAuthenticatedProxy(proxyString) {
    try {
      const parts = proxyString.split('@')
      if (parts.length !== 2) {
        throw new Error('Invalid authenticated proxy format')
      }

      const userPass = parts[0] // username:password
      const hostPort = parts[1] // host:port

      // Parse username:password
      const userPassParts = userPass.split(':')
      if (userPassParts.length !== 2) {
        throw new Error('Invalid username:password format')
      }

      // Parse host:port
      const hostPortParts = hostPort.split(':')
      if (hostPortParts.length !== 2) {
        throw new Error('Invalid host:port format')
      }

      const username = userPassParts[0].trim()
      const password = userPassParts[1].trim()
      const host = hostPortParts[0].trim()
      const port = parseInt(hostPortParts[1].trim(), 10)

      // Validate parsed values
      if (!username || !password || !host || isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid proxy credentials or connection details')
      }

      const proxyConfig = {
        mode: "http",
        host: host,
        port: port,
        username: username,
        password: password
      }

      logger.info('Proxy', `Parsed authenticated proxy - Host: ${host}:${port}, User: ${username}`)
      return proxyConfig
    } catch (error) {
      logger.error('Proxy', `Failed to parse authenticated proxy "${proxyString}": ${error.message}`)
      return this.getNoProxyConfig()
    }
  }

  /**
   * Parse simple proxy format: host|port
   * Following Python logic from launchBrowser.py
   * 
   * @param {string} proxyString - Simple proxy string
   * @returns {Object} GoLogin proxy configuration
   */
  parseSimpleProxy(proxyString) {
    try {
      const parts = proxyString.split('|')
      if (parts.length !== 2) {
        throw new Error('Invalid simple proxy format')
      }

      const host = parts[0].trim()
      const port = parseInt(parts[1].trim(), 10)

      // Validate parsed values
      if (!host || isNaN(port) || port <= 0 || port > 65535) {
        throw new Error('Invalid host or port')
      }

      const proxyConfig = {
        mode: "http",
        host: host,
        port: port,
        username: "",
        password: ""
      }

      logger.info('Proxy', `Parsed simple proxy - Host: ${host}:${port}`)
      return proxyConfig
    } catch (error) {
      logger.error('Proxy', `Failed to parse simple proxy "${proxyString}": ${error.message}`)
      return this.getNoProxyConfig()
    }
  }

  /**
   * Get no-proxy configuration
   * Following Python default proxy configuration
   * 
   * @returns {Object} GoLogin no-proxy configuration
   */
  getNoProxyConfig() {
    return { ...this.defaultProxyConfig }
  }

  /**
   * Validate proxy configuration object
   * 
   * @param {Object} proxyConfig - Proxy configuration to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateProxyConfig(proxyConfig) {
    if (!proxyConfig || typeof proxyConfig !== 'object') {
      return false
    }

    const { mode, host, port, username, password } = proxyConfig

    // Validate required fields
    if (!mode || typeof mode !== 'string') {
      return false
    }

    // For no-proxy mode, less strict validation
    if (mode === 'none') {
      return true
    }

    // For HTTP proxy mode, validate connection details
    if (mode === 'http') {
      if (!host || typeof host !== 'string' || host.trim() === '') {
        return false
      }

      if (typeof port !== 'number' || port <= 0 || port > 65535) {
        return false
      }

      // Username and password can be empty for non-authenticated proxies
      if (typeof username !== 'string' || typeof password !== 'string') {
        return false
      }

      return true
    }

    return false
  }

  /**
   * Check if proxy configuration requires authentication
   * 
   * @param {Object} proxyConfig - Proxy configuration to check
   * @returns {boolean} True if authentication is required
   */
  requiresAuthentication(proxyConfig) {
    if (!this.validateProxyConfig(proxyConfig) || proxyConfig.mode === 'none') {
      return false
    }

    return proxyConfig.username && proxyConfig.username.trim() !== ''
  }

  /**
   * Format proxy configuration for logging (hides credentials)
   * 
   * @param {Object} proxyConfig - Proxy configuration to format
   * @returns {string} Safe string representation for logging
   */
  formatProxyForLogging(proxyConfig) {
    if (!this.validateProxyConfig(proxyConfig)) {
      return 'Invalid proxy configuration'
    }

    if (proxyConfig.mode === 'none') {
      return 'No proxy'
    }

    const hasAuth = this.requiresAuthentication(proxyConfig)
    if (hasAuth) {
      return `${proxyConfig.host}:${proxyConfig.port} (authenticated)`
    } else {
      return `${proxyConfig.host}:${proxyConfig.port} (no auth)`
    }
  }

  /**
   * Create GoLogin-compatible browser options with proxy configuration
   * Following Python browserLaunch function patterns
   * 
   * @param {Object} proxyConfig - Parsed proxy configuration
   * @param {Object} browserOptions - Additional browser options
   * @returns {Object} Complete GoLogin options object
   */
  createGoLoginOptions(proxyConfig, browserOptions = {}) {
    try {
      if (!this.validateProxyConfig(proxyConfig)) {
        logger.warn('Proxy', 'Invalid proxy config provided, using no-proxy configuration')
        proxyConfig = this.getNoProxyConfig()
      }

      // Base options following Python patterns
      const options = {
        name: browserOptions.name || `Profile-${Date.now()}`,
        os: browserOptions.os || 'android',
        proxy: proxyConfig,
        navigator: {
          userAgent: browserOptions.userAgent || '',
          language: browserOptions.language || 'en-US',
          resolution: browserOptions.resolution || '1920x1080'
        }
      }

      logger.info('Proxy', `Created GoLogin options with proxy: ${this.formatProxyForLogging(proxyConfig)}`)
      return options
    } catch (error) {
      logger.error('Proxy', `Failed to create GoLogin options: ${error.message}`)
      
      // Return safe fallback options
      return {
        name: `Fallback-Profile-${Date.now()}`,
        os: 'android',
        proxy: this.getNoProxyConfig(),
        navigator: {
          userAgent: '',
          language: 'en-US',
          resolution: '1920x1080'
        }
      }
    }
  }

  /**
   * Parse proxy from profile data (from API or ProfileStore)
   * Integrates with existing profile system
   * 
   * @param {Object} profile - Profile object containing proxy data
   * @returns {Object} Parsed proxy configuration
   */
  parseProxyFromProfile(profile) {
    try {
      if (!profile || typeof profile !== 'object') {
        logger.warn('Proxy', 'No profile provided for proxy parsing')
        return this.getNoProxyConfig()
      }

      // Try to get proxy from different possible fields
      let proxyString = profile.proxy || profile.proxyString || profile.proxyConfig

      if (!proxyString) {
        logger.info('Proxy', `No proxy configured for profile: ${profile.id || 'unknown'}`)
        return this.getNoProxyConfig()
      }

      const proxyConfig = this.parseProxyString(proxyString)
      logger.info('Proxy', `Parsed proxy for profile ${profile.id || 'unknown'}: ${this.formatProxyForLogging(proxyConfig)}`)
      
      return proxyConfig
    } catch (error) {
      logger.error('Proxy', `Failed to parse proxy from profile: ${error.message}`)
      return this.getNoProxyConfig()
    }
  }

  /**
   * Get proxy statistics for monitoring and debugging
   * 
   * @param {Array} profiles - Array of profiles to analyze
   * @returns {Object} Proxy usage statistics
   */
  getProxyStatistics(profiles) {
    try {
      if (!Array.isArray(profiles)) {
        return { total: 0, withProxy: 0, withoutProxy: 0, withAuth: 0, withoutAuth: 0 }
      }

      let total = profiles.length
      let withProxy = 0
      let withoutProxy = 0
      let withAuth = 0
      let withoutAuth = 0

      for (const profile of profiles) {
        const proxyConfig = this.parseProxyFromProfile(profile)
        
        if (proxyConfig.mode === 'none') {
          withoutProxy++
        } else {
          withProxy++
          
          if (this.requiresAuthentication(proxyConfig)) {
            withAuth++
          } else {
            withoutAuth++
          }
        }
      }

      return {
        total,
        withProxy,
        withoutProxy,
        withAuth,
        withoutAuth
      }
    } catch (error) {
      logger.error('Proxy', `Failed to calculate proxy statistics: ${error.message}`)
      return { total: 0, withProxy: 0, withoutProxy: 0, withAuth: 0, withoutAuth: 0 }
    }
  }

  /**
   * Test proxy parsing with common formats
   * Utility method for validation and debugging
   * 
   * @returns {Object} Test results with examples
   */
  testProxyParsing() {
    const testCases = [
      'user:pass@proxy.example.com:8080',  // Authenticated
      'proxy.example.com|3128',            // Simple
      '',                                   // Empty
      null,                                 // Null
      'invalid-format',                     // Invalid
      'user:pass@invalid',                  // Invalid auth format
      'host|invalid-port'                   // Invalid simple format
    ]

    const results = {}
    
    for (const testCase of testCases) {
      try {
        const parsed = this.parseProxyString(testCase)
        results[testCase || 'null'] = {
          success: true,
          config: parsed,
          formatted: this.formatProxyForLogging(parsed),
          requiresAuth: this.requiresAuthentication(parsed)
        }
      } catch (error) {
        results[testCase || 'null'] = {
          success: false,
          error: error.message
        }
      }
    }

    logger.info('Proxy', 'Proxy parsing test completed')
    return results
  }
}

// Export singleton instance
export const proxyService = new ProxyService()