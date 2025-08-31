import { logger } from '../../utils/logger-service.js'

/**
 * Text Verification Service
 * Implements page content verification using CDP
 * Reference from Python: textVerify.py → textCheck()
 */
export class TextCheckService {
  /**
   * Wait for specific text to appear on page
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {string} text - Text to search for
   * @param {number} maxWait - Maximum wait time in seconds (default: 40)
   * @param {number} interval - Polling interval in seconds (default: 3)
   * @returns {Promise<boolean>} True if text found, false if timeout
   */
  async textCheck(cdp, profileId, text, maxWait = 40, interval = 3) {
    try {
      const startTime = Date.now()
      const timeoutMs = maxWait * 1000
      const intervalMs = interval * 1000

      logger.info(profileId, `Checking for text: "${text}" (timeout: ${maxWait}s, interval: ${interval}s)`)

      while (Date.now() - startTime < timeoutMs) {
        try {
          // Wait initial 2 seconds before first check (following Python pattern)
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Get page source using CDP Runtime.evaluate
          const result = await cdp.Runtime.evaluate({
            expression: "document.documentElement.outerHTML"
          })

          const pageSource = result?.result?.value || ""
          
          if (pageSource.includes(text)) {
            logger.info(profileId, `Text "${text}" found on page`)
            return true
          }

          // Wait interval before next check
          await new Promise(resolve => setTimeout(resolve, intervalMs))
          
        } catch (error) {
          logger.warn(profileId, `Error during text check iteration: ${error.message}`)
          // Continue with next iteration despite error
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      logger.warn(profileId, `Text "${text}" not found within ${maxWait} seconds`)
      return false

    } catch (error) {
      logger.error(profileId, `Text check failed: ${error.message}`)
      return false
    }
  }

  /**
   * Check for element existence using CSS selector
   * @param {Object} cdp - CDP client instance  
   * @param {string} profileId - Profile ID for logging
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in seconds (default: 10)
   * @returns {Promise<boolean>} True if element found
   */
  async elementExists(cdp, profileId, selector, timeout = 10) {
    try {
      const startTime = Date.now()
      const timeoutMs = timeout * 1000

      logger.info(profileId, `Checking for element: "${selector}" (timeout: ${timeout}s)`)

      while (Date.now() - startTime < timeoutMs) {
        try {
          const result = await cdp.Runtime.evaluate({
            expression: `document.querySelector('${selector}') !== null`
          })

          if (result?.result?.value === true) {
            logger.info(profileId, `Element "${selector}" found`)
            return true
          }

          await new Promise(resolve => setTimeout(resolve, 500))

        } catch (error) {
          logger.warn(profileId, `Error during element check iteration: ${error.message}`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      logger.warn(profileId, `Element "${selector}" not found within ${timeout} seconds`)
      return false

    } catch (error) {
      logger.error(profileId, `Element check failed: ${error.message}`)
      return false
    }
  }
}

// Export singleton instance
export const textCheckService = new TextCheckService()