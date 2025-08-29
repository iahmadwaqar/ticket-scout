import CDP from 'chrome-remote-interface'
import { logger } from '../../utils/logger-service.js'

export class ConnectionManager {
  constructor() {
    this.activeConnections = new Map()
  }

  /**
   * Connect to CDP using WebSocket URL from GoLogin
   * @param {string} wsUrl - WebSocket URL from GoLogin browser
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<Object>} CDP client instance
   */
  async connectCDP(wsUrl, profileId) {
    try {
      logger.info(profileId, `Connecting to CDP: ${wsUrl}`)

      // Parse WebSocket URL to get host and port
      const wsUrlObj = new URL(wsUrl)
      const port = parseInt(wsUrlObj.port)
      const host = wsUrlObj.hostname

      // Connect to CDP
      const cdpClient = await CDP({
        port: port,
        host: host,
        local: true
      })

      // Enable all necessary CDP domains
      await this.enableCDPDomains(cdpClient, profileId)

      logger.info(profileId, 'CDP connection established successfully')
      
      this.activeConnections.set(profileId, cdpClient)
      return cdpClient
    } catch (error) {
      logger.error(profileId, `Failed to connect to CDP: ${error.message}`)
      throw error
    }
  }

  /**
   * Enable necessary CDP domains for navigation, input, clicks, API calls
   * @param {Object} cdpClient - CDP client instance
   * @param {string} profileId - Profile ID for logging
   */
  async enableCDPDomains(cdpClient, profileId) {
    try {
      logger.info(profileId, 'Enabling CDP domains')

      const { Page, Runtime, Network } = cdpClient

      // Enable domains in parallel for better performance
      await Promise.all([
        Page.enable(),           // For navigation, page events
        Runtime.enable(),        // For JavaScript execution, console
        Network.enable(),        // For network requests, API calls
        // DOM.enable(),           // For DOM manipulation, element detection
        // Input.enable(),         // For mouse clicks, keyboard input
        // Debugger.enable(),      // For debugging capabilities
        // Security.enable()       // For security state monitoring
      ])

    } catch (error) {
      logger.error(profileId, `Failed to enable CDP domains: ${error.message}`)
      throw error
    }
  }

  /**
   * Close CDP connection with proper sequence like Python tab.stop()
   * @param {Object} cdpClient - CDP client to close
   * @param {string} profileId - Profile ID for logging
   * @returns {Promise<void>}
   */
  async closeCDP(cdpClient, profileId) {
    try {
      if (!cdpClient) {
        logger.warn(profileId, 'No CDP client to close')
        return
      }

      logger.info(profileId, 'Closing CDP connection with proper sequence')
      
      // Step 1: Disable all CDP domains first (like Python tab.stop())
      await this.disableCDPDomains(cdpClient, profileId)
      
      // Step 2: Close the CDP connection
      const CDP_CLOSE_TIMEOUT_MS = 10000 // 10 seconds timeout for CDP close
      
      const closePromise = cdpClient.close()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`CDP close operation timed out after ${CDP_CLOSE_TIMEOUT_MS}ms`))
        }, CDP_CLOSE_TIMEOUT_MS)
      })
      
      await Promise.race([closePromise, timeoutPromise])
      
      this.activeConnections.delete(profileId)
      logger.info(profileId, 'CDP connection closed successfully')
    } catch (error) {
      logger.error(profileId, `Failed to close CDP connection: ${error.message}`)
      
      // Force remove from active connections even if close failed
      this.activeConnections.delete(profileId)
      
      // Don't throw here to allow other cleanup to continue
      logger.warn(profileId, 'CDP connection forcefully removed from active connections')
    }
  }
  
  /**
   * Disable CDP domains (equivalent to Python tab.stop())
   * @param {Object} cdpClient - CDP client instance
   * @param {string} profileId - Profile ID for logging
   */
  async disableCDPDomains(cdpClient, profileId) {
    try {
      logger.info(profileId, 'Disabling CDP domains')

      const { Page, Runtime, Network } = cdpClient
      
      // Disable domains - some may fail, so we handle each separately
      const disablePromises = []
      
      if (Page && typeof Page.disable === 'function') {
        disablePromises.push(
          Page.disable().catch(err => 
            logger.warn(profileId, `Failed to disable Page domain: ${err.message}`)
          )
        )
      }
      
      if (Runtime && typeof Runtime.disable === 'function') {
        disablePromises.push(
          Runtime.disable().catch(err => 
            logger.warn(profileId, `Failed to disable Runtime domain: ${err.message}`)
          )
        )
      }
      
      if (Network && typeof Network.disable === 'function') {
        disablePromises.push(
          Network.disable().catch(err => 
            logger.warn(profileId, `Failed to disable Network domain: ${err.message}`)
          )
        )
      }
      
      // Wait for all disables to complete (or fail)
      await Promise.allSettled(disablePromises)
      
      logger.info(profileId, 'CDP domains disabled')
    } catch (error) {
      logger.warn(profileId, `Error during CDP domains disable: ${error.message}`)
      // Don't throw - this shouldn't prevent the rest of cleanup
    }
  }

  /**
   * Get active CDP connection for profile
   * @param {string} profileId - Profile ID
   * @returns {Object|null} CDP client or null
   */
  getConnection(profileId) {
    return this.activeConnections.get(profileId) || null
  }

  /**
   * Check if profile has active CDP connection
   * @param {string} profileId - Profile ID
   * @returns {boolean} True if connection exists
   */
  hasConnection(profileId) {
    return this.activeConnections.has(profileId)
  }
}