import { logger } from './logger-service.js'

/**
 * Retry Service
 * Implements retry logic for internet-related failures with exponential backoff
 * Following project specification for 5-15 seconds delay and smart error classification
 */
export class RetryService {
  constructor() {
    this.defaultOptions = {
      maxRetries: 3,
      minDelay: 5000,  // 5 seconds minimum
      maxDelay: 15000, // 15 seconds maximum
      backoffFactor: 1.5
    }
  }

  /**
   * Execute operation with retry logic for internet-related failures
   * @param {Function} operation - Async operation to execute
   * @param {Object} options - Retry configuration
   * @param {string} profileId - Profile ID for logging
   * @param {string} operationName - Name of operation for logging
   * @param {Function} onRetry - Optional callback called before each retry (attempt, maxRetries, delay)
   * @returns {Promise<Object>} Operation result
   */
  async executeWithRetry(operation, options = {}, profileId = 'unknown', operationName = 'operation', onRetry = null) {
    const config = { ...this.defaultOptions, ...options }
    let lastError = null
    let attempt = 0

    while (attempt <= config.maxRetries) {
      try {
        if (attempt > 0) {
          logger.info(profileId, `Retry attempt ${attempt}/${config.maxRetries} for ${operationName}`)
        }

        const result = await operation()
        
        if (attempt > 0) {
          logger.info(profileId, `${operationName} succeeded on retry attempt ${attempt}`)
        }
        
        return result

      } catch (error) {
        lastError = error
        attempt++

        // Check if this is a retryable error
        if (!this.isRetryableError(error)) {
          logger.warn(profileId, `${operationName} failed with non-retryable error: ${error.message}`)
          throw error
        }

        // If we've exhausted all retries
        if (attempt > config.maxRetries) {
          logger.error(profileId, `${operationName} failed after ${config.maxRetries} retries: ${error.message}`)
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config)
        logger.warn(profileId, `${operationName} failed (attempt ${attempt}), retrying in ${delay/1000}s: ${error.message}`)

        // Call retry callback if provided
        if (onRetry && typeof onRetry === 'function') {
          try {
            onRetry(attempt, config.maxRetries, delay)
          } catch (callbackError) {
            logger.warn(profileId, `Retry callback error: ${callbackError.message}`)
          }
        }

        // Wait before retry
        await this.delay(delay)
      }
    }

    // This should never be reached, but just in case
    throw lastError
  }

  /**
   * Determine if an error is worth retrying (internet/network related)
   * @param {Error} error - Error to classify
   * @returns {boolean} True if error should be retried
   */
  isRetryableError(error) {
    if (!error) return false

    const errorMessage = (error.message || error.toString()).toLowerCase()

    // Network connectivity errors
    const networkErrors = [
      'network',
      'connection',
      'timeout',
      'etimedout',
      'econnrefused',
      'econnreset',
      'ehostunreach',
      'enetunreach',
      'dns',
      'getaddrinfo',
      'socket hang up',
      'fetch failed',
      'request failed',
      'connection closed',
      'connection lost'
    ]

    // CDP/WebSocket specific errors
    const cdpErrors = [
      'websocket',
      'ws connection',
      'inspector',
      'devtools',
      'browser disconnected',
      'target closed',
      'session not created',
      'cannot connect to browser'
    ]

    // Navigation/Page load errors
    const navigationErrors = [
      'navigation timeout',
      'page load timeout',
      'load timeout',
      'navigation failed',
      'net::err_network_changed',
      'net::err_internet_disconnected',
      'net::err_name_not_resolved',
      'net::err_connection_timed_out',
      'net::err_connection_refused'
    ]

    // Check if error message contains any retryable keywords
    const allRetryableErrors = [...networkErrors, ...cdpErrors, ...navigationErrors]
    const isRetryable = allRetryableErrors.some(keyword => errorMessage.includes(keyword))

    // Exclude authentication/validation errors (these should not be retried)
    const nonRetryableErrors = [
      'authentication',
      'unauthorized',
      'invalid credentials',
      'login failed',
      'captcha',
      'validation',
      'invalid input',
      'forbidden',
      'not found',
      'bad request'
    ]

    const isNonRetryable = nonRetryableErrors.some(keyword => errorMessage.includes(keyword))

    return isRetryable && !isNonRetryable
  }

  /**
   * Calculate delay with exponential backoff
   * @param {number} attempt - Current attempt number (1-based)
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: delay = minDelay * (backoffFactor ^ (attempt - 1))
    const exponentialDelay = config.minDelay * Math.pow(config.backoffFactor, attempt - 1)
    
    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay)
    
    // Add some jitter to avoid thundering herd (±10%)
    const jitter = cappedDelay * 0.1 * (Math.random() - 0.5)
    
    return Math.round(cappedDelay + jitter)
  }

  /**
   * Promise-based delay utility
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if specific error is a network timeout
   * @param {Error} error - Error to check
   * @returns {boolean} True if network timeout
   */
  isNetworkTimeout(error) {
    if (!error) return false
    const message = (error.message || error.toString()).toLowerCase()
    return message.includes('timeout') || message.includes('etimedout')
  }

  /**
   * Check if specific error is a connection error
   * @param {Error} error - Error to check
   * @returns {boolean} True if connection error
   */
  isConnectionError(error) {
    if (!error) return false
    const message = (error.message || error.toString()).toLowerCase()
    return message.includes('connection') || 
           message.includes('econnrefused') || 
           message.includes('econnreset')
  }

  /**
   * Check if specific error is a DNS error
   * @param {Error} error - Error to check
   * @returns {boolean} True if DNS error
   */
  isDnsError(error) {
    if (!error) return false
    const message = (error.message || error.toString()).toLowerCase()
    return message.includes('dns') || 
           message.includes('getaddrinfo') || 
           message.includes('name_not_resolved')
  }

  /**
   * Create custom retry configuration
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Merged configuration
   */
  createRetryConfig(overrides = {}) {
    return { ...this.defaultOptions, ...overrides }
  }
}

// Export singleton instance
export const retryService = new RetryService()