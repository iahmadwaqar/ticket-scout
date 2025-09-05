import { logger } from '../../utils/logger-service.js'

/**
 * Navigation Service
 * Handles CDP-based navigation operations
 */
export class NavigationService {
  /**
   * Navigate to URL using CDP
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging  
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<Object>} Navigation result
   */
  async navigateToUrl(cdp, profileId, url, options = {}) {
    try {
      const {
        waitForLoad = true,
        timeout = 30000,
        referrer = null,
        transitionType = 'typed'
      } = options

      logger.info(profileId, `Navigating to: ${url}`)

      // Build navigation parameters
      const navigationParams = { url }
      if (referrer) {
        navigationParams.referrer = referrer
      }
      if (transitionType) {
        navigationParams.transitionType = transitionType
      }

      // Perform navigation
      const result = await cdp.Page.navigate(navigationParams)

      if (waitForLoad) {
        // Wait for page load with timeout
        await Promise.race([
          new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Navigation timeout after ${timeout}ms`))
            }, timeout)

            cdp.Page.loadEventFired(() => {
              clearTimeout(timeoutId)
              resolve()
            })
          }),
          // Fallback: wait minimum time even if load event doesn't fire
          new Promise(resolve => setTimeout(resolve, Math.min(timeout, 5000)))
        ])
      }

      logger.info(profileId, `Navigation completed: ${url}`)
      return { 
        success: true, 
        url: url,
        frameId: result.frameId 
      }

    } catch (error) {
      logger.error(profileId, `Navigation failed to ${url}: ${error.message}`)
      return { 
        success: false, 
        error: error.message,
        url: url 
      }
    }
  }

  /**
   * Execute JavaScript on page
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {string} expression - JavaScript expression to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeJavaScript(cdp, profileId, expression) {
    try {
      logger.info(profileId, `Executing JavaScript: ${expression.substring(0, 100)}...`)

      const result = await cdp.Runtime.evaluate({
        expression: expression,
        awaitPromise: true,
        returnByValue: true
      })

      if (result.exceptionDetails) {
        throw new Error(`JavaScript execution error: ${result.exceptionDetails.text}`)
      }

      logger.info(profileId, 'JavaScript executed successfully')
      return {
        success: true,
        result: result.result
      }

    } catch (error) {
      logger.error(profileId, `JavaScript execution failed: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Fill form field using CSS selector
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {string} selector - CSS selector for the field
   * @param {string} value - Value to fill
   * @returns {Promise<Object>} Fill result
   */
  async fillField(cdp, profileId, selector, value) {
    try {
      logger.info(profileId, `Filling field "${selector}" with value`)

      const expression = `document.querySelector("${selector}").value = "${value}"`
      return await this.executeJavaScript(cdp, profileId, expression)

    } catch (error) {
      logger.error(profileId, `Field fill failed for "${selector}": ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Click element using CSS selector
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {string} selector - CSS selector for the element
   * @returns {Promise<Object>} Click result
   */
  async clickElement(cdp, profileId, selector) {
    try {
      logger.info(profileId, `Clicking element "${selector}"`)

      const expression = `
        (() => {
          const element = document.querySelector("${selector}");
          if (element) {
            element.click();
            return true;
          }
          return false;
        })()
      `
      
      const result = await this.executeJavaScript(cdp, profileId, expression)
      
      if (result.success && result.result?.value === true) {
        logger.info(profileId, `Element "${selector}" clicked successfully`)
        return { success: true }
      } else {
        throw new Error(`Element "${selector}" not found or click failed`)
      }

    } catch (error) {
      logger.error(profileId, `Click failed for "${selector}": ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Press key on element using CSS selector
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {string} selector - CSS selector for the element
   * @param {string} key - Key to press (e.g., 'Enter', 'Tab')
   * @returns {Promise<Object>} Key press result
   */
  async pressKey(cdp, profileId, selector, key) {
    try {
      logger.info(profileId, `Pressing "${key}" key on element "${selector}"`)

      const expression = `
        (() => {
          const element = document.querySelector("${selector}");
          if (element) {
            element.focus();
            const event = new KeyboardEvent('keydown', {
              key: '${key}',
              code: '${key}',
              which: ${key === 'Enter' ? 13 : key === 'Tab' ? 9 : 0},
              keyCode: ${key === 'Enter' ? 13 : key === 'Tab' ? 9 : 0}
            });
            element.dispatchEvent(event);
            return true;
          }
          return false;
        })()
      `
      
      const result = await this.executeJavaScript(cdp, profileId, expression)
      
      if (result.success && result.result?.value === true) {
        logger.info(profileId, `Key "${key}" pressed successfully on "${selector}"`)
        return { success: true }
      } else {
        throw new Error(`Element "${selector}" not found or key press failed`)
      }

    } catch (error) {
      logger.error(profileId, `Key press failed for "${selector}": ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Wait for page to be ready
   * @param {Object} cdp - CDP client instance
   * @param {string} profileId - Profile ID for logging
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} True if ready
   */
  async waitForPageReady(cdp, profileId, timeout = 10000) {
    try {
      logger.info(profileId, `Waiting for page ready (timeout: ${timeout}ms)`)

      await Promise.race([
        new Promise((resolve) => {
          cdp.Page.loadEventFired(() => resolve())
        }),
        new Promise((resolve) => setTimeout(resolve, timeout))
      ])

      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000))

      logger.info(profileId, 'Page ready')
      return true

    } catch (error) {
      logger.error(profileId, `Wait for page ready failed: ${error.message}`)
      return false
    }
  }
}

// Export singleton instance
export const navigationService = new NavigationService()