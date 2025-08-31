// import Logger from "../utils/Logger.js";
// import BrowserService from "./BrowserService.js";
// import NavigationService from "./NavigationService.js";
// import AuthenticationService from "./AuthenticationService.js";
// import { eventURL, eventid } from "../utils/constants.js";
// import axios from "axios";
import { logger } from '../../utils/logger-service.js'
import { profileStore } from './profileStore.js'
import { PROFILE_STATUSES, LOGIN_STATUSES } from '../../../shared/status-constants.js'
import { goLoginService } from '../gologin/index.js'
import { loginService } from '../login/index.js'

/**
 * SingleProfileTicketBot - Manages individual profile operations
 * Handles GoLogin connection, CDP management, and profile lifecycle
 * Designed for future features: navigation, login, clicks, browser control
 */
export class SingleProfileTicketBot {
  constructor(profile, config = {}) {
    // Only store the profile ID - everything else accessible via profileStore
    this.profileId = profile.id
    
    // Store configuration options
    this.config = {
      injectCookies: config.cookies || false,
      ...config
    }
    
    // Bot operational state (not data state - that's in profileStore)
    // Browser instances are stored in profileStore via setGoLoginInstances()
    this.isInitialized = false
    this.retryCount = 0
    this.maxRetries = 3
    
  }

  /**
   * Initialize the profile bot - sets up GoLogin browser and CDP connection
   * This method prepares the bot for future operations
   */
  async initialize() {
    try {
      this.updateStatus(PROFILE_STATUSES.LAUNCHING)
      
      // Get profile data from profileStore
      const profile = profileStore.getProfile(this.profileId)
      if (!profile) {
        throw new Error(`Profile ${this.profileId} not found in store`)
      }
      
      // Validate required fields for GoLogin
      if (!profile.token) {
        throw new Error('Profile token is required for GoLogin initialization')
      }
      
      // Initialize GoLogin browser and CDP connection with cookie configuration
      const result = await goLoginService.initializeProfile(profile, this.config.injectCookies)
      
      this.isInitialized = true
      this.updateStatus(PROFILE_STATUSES.READY)
      
      logger.info(this.profileId, `Profile bot initialized successfully with GoLogin (cookies: ${this.config.injectCookies ? 'enabled' : 'disabled'})`)
      
      return { success: true, instances: result }
    } catch (error) {
      this.updateStatus('Error Launching', error.message)
      throw error
    }
  }

  /**
   * Start the profile bot operations
   */
  async start() {
    try {
      if (!this.isInitialized) {
        throw new Error('Bot must be initialized before starting')
      }
      
      this.updateStatus(PROFILE_STATUSES.RESTARTING)

      await new Promise((resolve) => setTimeout(resolve, 5000))
      
      this.updateStatus(PROFILE_STATUSES.READY)
      
      return { success: true }
    } catch (error) {
      this.updateStatus('Error', error.message)
      throw error
    }
  }

  /**
   * Stop the profile bot operations
   */
  async stop() {
    try {
      this.updateStatus('Stopping')
      
      // TODO: Implement stopping logic
      // - Stop any ongoing operations
      // - Pause navigation
      // - Keep browser instances alive
      
      // Simulate stop delay for now
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      this.updateStatus('Stopped')
      
      return { success: true }
    } catch (error) {
      this.updateStatus('Error', error.message)
      logger.error(this.profileId, `Failed to stop profile bot: ${error.message}`)
      throw error
    }
  }

  /**
   * Close the profile bot and clean up all resources
   * Ensures cleanup happens regardless of GoLogin service failures
   */
  async close() {
    try {
      this.updateStatus('Closing')
      
      let goLoginCloseSuccess = false
      
      // Attempt to use GoLogin service to close browser and CDP connections
      try {
        await goLoginService.closeProfile(this.profileId)
        goLoginCloseSuccess = true
        logger.info(this.profileId, 'GoLogin service closed profile successfully')
      } catch (goLoginError) {
        logger.warn(this.profileId, `GoLogin service close failed, proceeding with manual cleanup: ${goLoginError.message}`)
        
        // Manual cleanup if GoLogin service fails
        try {
          await goLoginService.cleanupProfile(this.profileId)
          logger.info(this.profileId, 'Manual GoLogin cleanup completed')
        } catch (cleanupError) {
          logger.warn(this.profileId, `Manual GoLogin cleanup also failed: ${cleanupError.message}`)
          // Continue with profileStore cleanup even if GoLogin cleanup fails
        }
      }
      
      // Always perform profileStore cleanup regardless of GoLogin success
      try {
        // Clear bot instance from profileStore
        profileStore.clearBotInstance(this.profileId)
        
        // Clear GoLogin instances from profileStore
        profileStore.clearGoLoginInstances(this.profileId)
        
        this.isInitialized = false
        this.updateStatus('Closed')
        
        // Remove successfully closed profile from store
        profileStore.removeProfile(this.profileId)
        
        logger.info(this.profileId, 'Profile bot closed and cleaned up successfully')
        
        return { success: true, message: 'Profile closed successfully' }
        
      } catch (storeError) {
        // If profileStore cleanup fails, still try to update status
        logger.error(this.profileId, `ProfileStore cleanup failed: ${storeError.message}`)
        
        try {
          this.updateStatus('Error Closing', storeError.message)
        } catch (statusError) {
          logger.error(this.profileId, `Failed to update status after cleanup error: ${statusError.message}`)
        }
        
        throw storeError
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown close error'
      
      // Try to update status even if other operations failed
      try {
        this.updateStatus('Error Closing', errorMessage)
      } catch (statusError) {
        logger.error(this.profileId, `Failed to update status after close error: ${statusError.message}`)
      }
      
      logger.error(this.profileId, `Failed to close profile bot: ${errorMessage}`)
      
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Update the profile status in profileStore (single source of truth)
   * @param {string} status - New status to set
   * @param {string} message - Optional message
   */
  updateStatus(status, message = null) {
    // Use profileStore as single source of truth
    profileStore.updateStatus(this.profileId, status, message)
  }

  /**
   * Update the profile login state in profileStore (single source of truth)
   * @param {string} status - New status to set
   * @param {string} message - Optional message
   */
  updateLoginState(status, message = null) {
    // Use profileStore as single source of truth
    profileStore.updateLoginState(this.profileId, status, message)
  }

  /**
   * Get current bot state from profileStore (single source of truth)
   * @returns {Object} Current bot state
   */
  getState() {
    const profile = profileStore.getProfile(this.profileId)
    const instances = profileStore.getGoLoginInstances(this.profileId)
    
    return {
      profileId: this.profileId,
      profileName: profile?.name || 'Unknown',
      status: profile?.status || 'Unknown',
      operationalState: profile?.operationalState || 'idle',
      lastActivity: profile?.lastActivity,
      errorMessage: profile?.errorMessage,
      isInitialized: this.isInitialized,
      retryCount: this.retryCount,
      // Browser instances from profileStore
      hasGoLoginInstance: !!instances?.gologin,
      hasBrowser: !!instances?.browser,
      hasCdpClient: !!instances?.cdp,
      hasStoredInstances: !!instances
    }
  }

  /**
   * Get profile data from profileStore
   * @returns {Object} Profile data
   */
  getProfile() {
    return profileStore.getProfile(this.profileId)
  }

  /**
   * Check if bot is running based on profileStore status
   * @returns {boolean} True if bot is running
   */
  isRunning() {
    const profile = profileStore.getProfile(this.profileId)
    return profile?.operationalState === 'active'
  }

  /**
   * Get current status from profileStore
   * @returns {string} Current status
   */
  getStatus() {
    const profile = profileStore.getProfile(this.profileId)
    return profile?.status || 'Unknown'
  }

  /**
   * Get browser instances from profileStore
   * @returns {Object} Browser instances {gologin, browser, cdp}
   */
  getBrowserInstances() {
    return profileStore.getGoLoginInstances(this.profileId)
  }

  /**
   * Get specific browser instance from profileStore
   * @param {string} type - Type of instance ('gologin', 'browser', 'cdp')
   * @returns {Object} Specific browser instance
   */
  getBrowserInstance(type) {
    const instances = profileStore.getGoLoginInstances(this.profileId)
    return instances?.[type]
  }

  /**
   * Check if browser instances are available
   * @returns {boolean} True if browser instances exist
   */
  hasBrowserInstances() {
    const instances = profileStore.getGoLoginInstances(this.profileId)
    return !!instances
  }

  // =======================================================================
  // FUTURE FEATURES - These methods will be implemented in future iterations
  // =======================================================================

  /**
   * Navigate to a specific URL
   * @param {string} url - URL to navigate to
   * @returns {Promise<Object>} Navigation result
   */
  async navigateTo(url) {
    // TODO: Implement navigation logic using CDP
    this.updateStatus('Navigating', `Navigating to: ${url}`)
    logger.info(this.profileId, `Navigate to: ${url} (Not implemented yet)`)
    return { success: false, message: 'Navigation not implemented yet' }
  }

  /**
   * Perform login for the profile using domain-specific strategy
   * @returns {Promise<Object>} Login result
   */
  async login() {
    try {
      logger.info(this.profileId, 'Starting login process')
      
      // Step 1: Change status to LoggingIn and login state to LoggingIn (following user instruction #2)
      this.updateStatus(PROFILE_STATUSES.LOGGING_IN, 'Attempting login')
      this.updateLoginState(LOGIN_STATUSES.LOGGING_IN, 'Starting login process')
      
      // Step 2: Perform actual login using login service
      const loginResult = await loginService.performLogin(this.profileId)
      
      if (loginResult.success) {
        // Step 3: Update status to LoggedIn (both status and login state)
        this.updateStatus(PROFILE_STATUSES.LOGGED_IN, 'Login successful')
        this.updateLoginState(LOGIN_STATUSES.LOGGED_IN, 'Authentication completed')
        
        logger.info(this.profileId, 'Login completed successfully')
        return { success: true, message: 'Login completed successfully' }
        
      } else {
        // Handle specific login errors
        let errorStatus = PROFILE_STATUSES.ERROR_LOGIN
        let loginState = LOGIN_STATUSES.LOGIN_FAILED
        let errorMessage = loginResult.error || 'Unknown login error'
        
        // Handle specific error cases
        if (loginResult.requiresCaptcha) {
          loginState = LOGIN_STATUSES.CAPTCHA_REQUIRED
          errorMessage = 'Captcha required'
        } else if (loginResult.requiresManualSubmission) {
          errorMessage = 'Manual intervention required'
        }
        
        this.updateStatus(errorStatus, `Login error: ${errorMessage}`)
        this.updateLoginState(loginState, `Login failed: ${errorMessage}`)
        
        logger.error(this.profileId, `Login failed: ${errorMessage}`)
        return { success: false, message: errorMessage }
      }
      
    } catch (error) {
      // In case of error: change profile status to Error Login and login state to LoginFailed
      const errorMessage = error instanceof Error ? error.message : 'Unknown login error'
      logger.error(this.profileId, `Login failed: ${errorMessage}`)
      
      this.updateStatus(PROFILE_STATUSES.ERROR_LOGIN, `Login error: ${errorMessage}`)
      this.updateLoginState(LOGIN_STATUSES.LOGIN_FAILED, `Login failed: ${errorMessage}`)
      
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Bring profile to front
   * @returns {Promise<Object>} Bring to front result
   */
  async bringToFront() {
    try {
      logger.info(this.profileId, 'Bringing profile to front')
      
      // Use GoLogin service to bring browser to front
      const result = await goLoginService.bringProfileToFront(this.profileId)
      
      if (result.success) {
        logger.info(this.profileId, 'Profile brought to front successfully')
        return { success: true, message: 'Profile brought to front successfully' }
      } else {
        throw new Error(result.message || 'Failed to bring profile to front')
      }
      
    } catch (error) {
      // In case of error: change profile status to Error BringingToFront
      const errorMessage = error instanceof Error ? error.message : 'Unknown bringing to front error'
      logger.error(this.profileId, `Bringing to front failed: ${errorMessage}`)
      
      this.updateStatus(PROFILE_STATUSES.ERROR_BRINGING_TO_FRONT, `Bringing to front error: ${errorMessage}`)
      
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Click on an element
   * @param {string} selector - CSS selector or element identifier
   * @returns {Promise<Object>} Click result
   */
  async click(selector) {
    // TODO: Implement click logic using CDP
    logger.info(this.profileId, `Click element: ${selector} (Not implemented yet)`)
    return { success: false, message: 'Click not implemented yet' }
  }

  /**
   * Type text into an input field
   * @param {string} selector - CSS selector for input field
   * @param {string} text - Text to type
   * @returns {Promise<Object>} Type result
   */
  async type(selector, text) {
    // TODO: Implement typing logic using CDP
    logger.info(this.profileId, `Type text in ${selector} (Not implemented yet)`)
    return { success: false, message: 'Type not implemented yet' }
  }

  /**
   * Wait for an element to appear
   * @param {string} selector - CSS selector to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} Wait result
   */
  async waitForElement(selector, timeout = 30000) {
    // TODO: Implement element waiting logic using CDP
    logger.info(this.profileId, `Wait for element: ${selector} (Not implemented yet)`)
    return { success: false, message: 'WaitForElement not implemented yet' }
  }

  /**
   * Execute custom JavaScript in the browser
   * @param {string} script - JavaScript code to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeScript(script) {
    // TODO: Implement script execution using CDP
    logger.info(this.profileId, 'Execute script (Not implemented yet)')
    return { success: false, message: 'ExecuteScript not implemented yet' }
  }

  /**
   * Take a screenshot of the current page
   * @returns {Promise<Object>} Screenshot result
   */
  async takeScreenshot() {
    // TODO: Implement screenshot using CDP
    logger.info(this.profileId, 'Take screenshot (Not implemented yet)')
    return { success: false, message: 'Screenshot not implemented yet' }
  }

  // =======================================================================
  // PRIVATE HELPER METHODS
  // =======================================================================

  /**
   * Create GoLogin instance (future implementation)
   * @returns {Promise<Object>} GoLogin instance
   */
  async createGoLoginInstance() {
    // TODO: Implement GoLogin instance creation
    // - Load profile configuration
    // - Set up proxy if needed
    // - Configure browser settings
    // - Return GoLogin instance
    throw new Error('GoLogin instance creation not implemented yet')
  }

  /**
   * Connect to CDP (Chrome DevTools Protocol)
   * @param {URL} wsUrl - WebSocket URL for CDP connection
   * @returns {Promise<Object>} CDP client
   */
  async connectCDP(wsUrl) {
    // TODO: Implement CDP connection
    // - Connect to browser via WebSocket
    // - Set up CDP client
    // - Enable necessary domains (Runtime, Page, Network, etc.)
    // - Return CDP client
    throw new Error('CDP connection not implemented yet')
  }
}
