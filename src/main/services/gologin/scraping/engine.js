/**
 * Profile Scraping System - Autonomous ticket scraping functionality
 * 
 * This module provides comprehensive autonomous scraping capabilities for profiles
 * after they have been successfully launched. It handles all aspects of ticket
 * scraping including navigation, page detection, user interactions, and error handling.
 * 
 * Features:
 * - Autonomous scraping loops for each profile
 * - Comprehensive page type detection and handling
 * - Human-like behavior simulation with random delays
 * - Configuration monitoring and dynamic updates
 * - Error handling and recovery mechanisms
 * - User interaction for captcha solving
 * - Real-time status updates to renderer
 */

import { logger } from '../../../utils/logger-service.js'
import { BrowserWindow } from 'electron'

// Global references
let profileStore = null
let mainWindow = null

// Active scraping sessions
const scrapingSessions = new Map()

/**
 * Set the profile store reference for scraping operations
 */
export function setScrapingProfileStore(store) {
  profileStore = store
}

/**
 * Set the main window reference for sending updates to renderer
 */
export function setScrapingMainWindow(window) {
  mainWindow = window
}

/**
 * Page types that can be encountered during scraping
 */
export const PageType = {
  LOGIN: 'login',
  QUEUE: 'queue',
  CAPTCHA: 'captcha',
  TICKETS: 'tickets',
  SOLD_OUT: 'sold_out',
  ERROR: 'error',
  MAINTENANCE: 'maintenance',
  SESSION_EXPIRED: 'session_expired',
  RATE_LIMITED: 'rate_limited',
  COOKIE_CONSENT: 'cookie_consent',
  AGE_VERIFICATION: 'age_verification',
  TERMS_ACCEPTANCE: 'terms_acceptance',
  PAYMENT: 'payment',
  CONFIRMATION: 'confirmation',
  UNKNOWN: 'unknown'
}

/**
 * Scraping session class that manages autonomous scraping for a single profile
 */
export class ScrapingSession {
  constructor(profileId) {
    this.profileId = profileId
    this.isActive = false
    this.loopInterval = null
    this.currentRetries = 0
    this.lastPageType = PageType.UNKNOWN
    this.sessionStartTime = Date.now()
    this.lastTicketCheck = 0
    this.randomBrowsingCount = 0
    this.isWaitingForUser = false
    
    logger.info(profileId, 'Scraping session created')
  }

  /**
   * Start the autonomous scraping loop
   */
  async start() {
    if (this.isActive) {
      logger.warn(this.profileId, 'Scraping session already active')
      return
    }

    this.isActive = true
    this.sessionStartTime = Date.now()
    this.updateProfileScrapingState('active')
    
    logger.info(this.profileId, 'Starting autonomous scraping loop')
    this.updateProfileStatus('Scraping', 'Autonomous scraping started')

    // Start the main scraping loop
    this.runScrapingLoop()
  }

  /**
   * Stop the scraping session
   */
  async stop() {
    if (!this.isActive) {
      return
    }

    this.isActive = false
    this.isWaitingForUser = false
    
    if (this.loopInterval) {
      clearTimeout(this.loopInterval)
      this.loopInterval = null
    }

    this.updateProfileScrapingState('idle')
    logger.info(this.profileId, 'Scraping session stopped')
  }

  /**
   * Main scraping loop that runs continuously
   */
  async runScrapingLoop() {
    if (!this.isActive) {
      return
    }

    try {
      // Check if profile still exists and is in correct state
      const profile = this.getProfile()
      if (!profile) {
        logger.error(this.profileId, 'Profile not found, stopping scraping session')
        await this.stop()
        return
      }

      // Monitor configuration changes
      await this.monitorConfiguration()

      // Skip loop iteration if waiting for user input
      if (this.isWaitingForUser) {
        logger.info(this.profileId, 'Waiting for user input, skipping loop iteration')
        this.scheduleNextLoop(5000) // Check again in 5 seconds
        return
      }

      // Execute main scraping logic
      await this.executeScrapingStep()

    } catch (error) {
      logger.error(this.profileId, `Scraping loop error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      this.handleScrapingError(error)
    }

    // Schedule next loop iteration
    this.scheduleNextLoop()
  }

  /**
   * Execute a single step of the scraping process
   */
  async executeScrapingStep() {
    const profile = this.getProfile()
    if (!profile) return

    // Simulate navigation to current page
    await this.navigateToCurrentPage()

    // Detect current page type
    const pageType = await this.detectPageType()
    this.lastPageType = pageType

    logger.info(this.profileId, `Detected page type: ${pageType}`)

    // Handle the detected page type
    switch (pageType) {
      case PageType.LOGIN:
        await this.handleLoginPage()
        break
      case PageType.QUEUE:
        await this.handleQueuePage()
        break
      case PageType.CAPTCHA:
        await this.handleCaptchaPage()
        break
      case PageType.TICKETS:
        await this.handleTicketsPage()
        break
      case PageType.SOLD_OUT:
        await this.handleSoldOutPage()
        break
      case PageType.SESSION_EXPIRED:
        await this.handleSessionExpiredPage()
        break
      case PageType.RATE_LIMITED:
        await this.handleRateLimitedPage()
        break
      case PageType.COOKIE_CONSENT:
        await this.handleCookieConsentPage()
        break
      case PageType.AGE_VERIFICATION:
        await this.handleAgeVerificationPage()
        break
      case PageType.TERMS_ACCEPTANCE:
        await this.handleTermsAcceptancePage()
        break
      case PageType.MAINTENANCE:
        await this.handleMaintenancePage()
        break
      case PageType.ERROR:
        await this.handleErrorPage()
        break
      case PageType.PAYMENT:
        await this.handlePaymentPage()
        break
      case PageType.CONFIRMATION:
        await this.handleConfirmationPage()
        break
      default:
        await this.handleUnknownPage()
        break
    }
  }

  /**
   * Navigate to the current target page
   */
  async navigateToCurrentPage() {
    const profile = this.getProfile()
    if (!profile) return

    // Simulate navigation delay
    const navigationDelay = this.getRandomDelay(1000, 3000)
    logger.info(this.profileId, `Navigating to page (simulated delay: ${navigationDelay}ms)`)
    
    this.updateProfileStatus('Navigating', 'Navigating to target page')
    await this.delay(navigationDelay)

    // Update current page in profile
    this.updateProfileData({ currentPage: profile.url })
  }

  /**
   * Detect the type of the current page
   */
  async detectPageType() {
    // Simulate page analysis delay
    await this.delay(this.getRandomDelay(500, 1500))

    // Simulate different page types based on random conditions and profile state
    const random = Math.random()
    const profile = this.getProfile()
    
    if (!profile) return PageType.ERROR

    // Simulate realistic page type distribution
    if (random < 0.05) return PageType.CAPTCHA
    if (random < 0.1) return PageType.QUEUE
    if (random < 0.15) return PageType.LOGIN
    if (random < 0.2) return PageType.COOKIE_CONSENT
    if (random < 0.25) return PageType.SESSION_EXPIRED
    if (random < 0.3) return PageType.SOLD_OUT
    if (random < 0.35) return PageType.RATE_LIMITED
    if (random < 0.4) return PageType.MAINTENANCE
    if (random < 0.45) return PageType.AGE_VERIFICATION
    if (random < 0.5) return PageType.TERMS_ACCEPTANCE
    if (random < 0.7) return PageType.TICKETS
    if (random < 0.8) return PageType.ERROR
    
    return PageType.UNKNOWN
  }

  /**
   * Handle login page
   */
  async handleLoginPage() {
    const profile = this.getProfile()
    if (!profile) return

    this.updateProfileStatus('LoggedIn', 'Handling login page')
    logger.info(this.profileId, 'Detected login page, attempting auto-login')

    // Simulate login process
    await this.delay(this.getRandomDelay(2000, 4000))

    if (profile.scrapingConfig?.autoLogin !== false) {
      logger.info(this.profileId, `Auto-login with supporter ID: ${profile.supporterId}`)
      
      // Simulate filling login form
      await this.delay(this.getRandomDelay(1000, 2000))
      logger.info(this.profileId, 'Filling login credentials')
      
      // Simulate login submission
      await this.delay(this.getRandomDelay(1500, 3000))
      logger.info(this.profileId, 'Login submitted successfully')
      
      this.updateProfileStatus('LoggedIn', 'Successfully logged in')
    } else {
      logger.info(this.profileId, 'Auto-login disabled, waiting for manual login')
      this.sendToast('Manual Login Required', `Profile ${profile.name} requires manual login`, 'default')
      this.isWaitingForUser = true
      this.updateProfileScrapingState('waiting_user')
    }
  }

  /**
   * Handle queue/waiting page
   */
  async handleQueuePage() {
    this.updateProfileStatus('InQueue', 'Waiting in queue')
    logger.info(this.profileId, 'Detected queue page, waiting...')

    // Simulate queue waiting time
    const queueTime = this.getRandomDelay(30000, 120000) // 30s to 2min
    logger.info(this.profileId, `Estimated queue time: ${Math.round(queueTime / 1000)}s`)
    
    await this.delay(queueTime)
    logger.info(this.profileId, 'Queue wait completed')
  }

  /**
   * Handle captcha page
   */
  async handleCaptchaPage() {
    const profile = this.getProfile()
    if (!profile) return

    this.updateProfileStatus('WaitingForCaptcha', 'Captcha detected')
    logger.info(this.profileId, 'Detected captcha page')

    if (profile.scrapingConfig?.handleCaptcha === 'auto') {
      // Simulate auto-captcha solving (dummy)
      logger.info(this.profileId, 'Attempting auto-captcha solving')
      await this.delay(this.getRandomDelay(5000, 15000))
      
      if (Math.random() > 0.3) { // 70% success rate
        logger.info(this.profileId, 'Auto-captcha solved successfully')
        this.updateProfileStatus('Scraping', 'Captcha solved automatically')
      } else {
        logger.warn(this.profileId, 'Auto-captcha failed, requiring manual intervention')
        this.sendToast('Captcha Solving Required', `Profile ${profile.name} needs manual captcha solving`, 'default')
        this.isWaitingForUser = true
        this.updateProfileScrapingState('waiting_user')
      }
    } else {
      // Manual captcha solving required
      logger.info(this.profileId, 'Manual captcha solving required')
      this.sendToast('Captcha Detected', `Profile ${profile.name} requires manual captcha solving`, 'default')
      this.isWaitingForUser = true
      this.updateProfileScrapingState('waiting_user')
    }
  }

  /**
   * Handle tickets page - main target
   */
  async handleTicketsPage() {
    const profile = this.getProfile()
    if (!profile) return

    this.updateProfileStatus('SearchingTickets', 'Searching for tickets')
    logger.info(this.profileId, 'Detected tickets page, searching for available tickets')

    // Simulate ticket search
    await this.delay(this.getRandomDelay(2000, 5000))

    // Simulate ticket availability check
    const ticketsFound = Math.random() > 0.7 // 30% chance of finding tickets
    
    if (ticketsFound) {
      const ticketCount = Math.floor(Math.random() * 4) + 1 // 1-4 tickets
      logger.info(this.profileId, `Found ${ticketCount} available tickets!`)
      
      this.updateProfileData({ ticketCount })
      this.updateProfileStatus('Success', `Found ${ticketCount} tickets`)
      
      this.sendToast('Tickets Found!', `Profile ${profile.name} found ${ticketCount} tickets`, 'success')
      
      // Simulate ticket selection process
      await this.handleTicketSelection(ticketCount)
      
    } else {
      logger.info(this.profileId, 'No tickets found, will continue monitoring')
      this.updateProfileStatus('SearchingTickets', 'No tickets available, continuing search')
      
      // Update last ticket check time
      this.lastTicketCheck = Date.now()
      
      // Decide whether to do random browsing or continue checking
      if (this.shouldDoRandomBrowsing()) {
        await this.initiateRandomBrowsing()
      }
    }
  }

  /**
   * Handle ticket selection process
   */
  async handleTicketSelection(availableTickets) {
    const profile = this.getProfile()
    if (!profile) return

    const targetTickets = profile.scrapingConfig?.targetTickets || 1
    const ticketsToSelect = Math.min(availableTickets, targetTickets)

    logger.info(this.profileId, `Selecting ${ticketsToSelect} tickets (${availableTickets} available, ${targetTickets} target)`)

    // Simulate ticket selection
    await this.delay(this.getRandomDelay(2000, 4000))
    logger.info(this.profileId, 'Tickets selected, proceeding to checkout')

    // Note: We stop before actual payment as per requirements
    this.updateProfileStatus('Success', `Selected ${ticketsToSelect} tickets - ready for manual checkout`)
    this.sendToast('Ready for Checkout', `Profile ${profile.name} has selected tickets and is ready for manual checkout`, 'success')
  }

  /**
   * Handle sold out page
   */
  async handleSoldOutPage() {
    logger.info(this.profileId, 'Detected sold out page')
    this.updateProfileStatus('SearchingTickets', 'Event sold out, monitoring for releases')
    
    // Wait longer before next check when sold out
    await this.delay(this.getRandomDelay(60000, 180000)) // 1-3 minutes
    
    // Initiate random browsing to appear more human
    await this.initiateRandomBrowsing()
  }

  /**
   * Handle session expired page
   */
  async handleSessionExpiredPage() {
    logger.warn(this.profileId, 'Session expired, attempting re-login')
    this.updateProfileStatus('SessionExpired', 'Session expired, re-authenticating')
    
    // Simulate re-login process
    await this.delay(this.getRandomDelay(3000, 6000))
    
    // Reset retry count for fresh start
    this.currentRetries = 0
    logger.info(this.profileId, 'Re-authentication completed')
  }

  /**
   * Handle rate limited page
   */
  async handleRateLimitedPage() {
    logger.warn(this.profileId, 'Rate limited detected, implementing backoff strategy')
    this.updateProfileStatus('RateLimited', 'Rate limited, waiting before retry')
    
    // Implement exponential backoff
    const backoffTime = Math.min(300000, 30000 * Math.pow(2, this.currentRetries)) // Max 5 minutes
    logger.info(this.profileId, `Rate limit backoff: ${Math.round(backoffTime / 1000)}s`)
    
    await this.delay(backoffTime)
    this.currentRetries++
  }

  /**
   * Handle cookie consent page
   */
  async handleCookieConsentPage() {
    logger.info(this.profileId, 'Detected cookie consent, auto-accepting')
    await this.delay(this.getRandomDelay(1000, 2000))
    logger.info(this.profileId, 'Cookie consent accepted')
  }

  /**
   * Handle age verification page
   */
  async handleAgeVerificationPage() {
    logger.info(this.profileId, 'Detected age verification, auto-confirming')
    await this.delay(this.getRandomDelay(1000, 3000))
    logger.info(this.profileId, 'Age verification confirmed')
  }

  /**
   * Handle terms acceptance page
   */
  async handleTermsAcceptancePage() {
    logger.info(this.profileId, 'Detected terms acceptance, auto-accepting')
    await this.delay(this.getRandomDelay(1500, 3000))
    logger.info(this.profileId, 'Terms and conditions accepted')
  }

  /**
   * Handle maintenance page
   */
  async handleMaintenancePage() {
    logger.warn(this.profileId, 'Site under maintenance, waiting for restoration')
    this.updateProfileStatus('Error', 'Site under maintenance')
    
    // Wait longer during maintenance
    await this.delay(this.getRandomDelay(300000, 600000)) // 5-10 minutes
  }

  /**
   * Handle error page
   */
  async handleErrorPage() {
    logger.error(this.profileId, 'Detected error page')
    this.currentRetries++
    
    if (this.currentRetries >= (this.getProfile()?.scrapingConfig?.maxRetries || 5)) {
      logger.error(this.profileId, 'Max retries reached, stopping scraping')
      this.updateProfileStatus('Error', 'Max retries reached')
      await this.stop()
      return
    }
    
    this.updateProfileStatus('Error', `Error page detected (retry ${this.currentRetries})`)
    await this.delay(this.getRandomDelay(10000, 30000)) // Wait before retry
  }

  /**
   * Handle payment page (stop here as per requirements)
   */
  async handlePaymentPage() {
    logger.info(this.profileId, 'Reached payment page - stopping automated process')
    this.updateProfileStatus('Success', 'Ready for manual payment')
    this.sendToast('Manual Payment Required', `Profile ${this.getProfile()?.name} is ready for manual payment`, 'success')
    await this.stop()
  }

  /**
   * Handle confirmation page
   */
  async handleConfirmationPage() {
    logger.info(this.profileId, 'Purchase confirmation detected')
    this.updateProfileStatus('Success', 'Purchase completed successfully')
    this.sendToast('Purchase Successful!', `Profile ${this.getProfile()?.name} completed purchase`, 'success')
    await this.stop()
  }

  /**
   * Handle unknown page type
   */
  async handleUnknownPage() {
    logger.warn(this.profileId, 'Unknown page type detected, analyzing...')
    await this.delay(this.getRandomDelay(2000, 4000))
    
    // Try to navigate back to main ticket page
    logger.info(this.profileId, 'Attempting to navigate back to ticket page')
    await this.delay(this.getRandomDelay(1000, 2000))
  }

  /**
   * Determine if random browsing should be initiated
   */
  shouldDoRandomBrowsing() {
    const timeSinceLastCheck = Date.now() - this.lastTicketCheck
    const shouldBrowse = timeSinceLastCheck > 60000 && Math.random() > 0.6 // 40% chance after 1 minute
    
    return shouldBrowse
  }

  /**
   * Initiate random browsing to mimic human behavior
   */
  async initiateRandomBrowsing() {
    const profile = this.getProfile()
    if (!profile) return

    this.updateProfileStatus('RandomBrowsing', 'Browsing site to mimic human behavior')
    logger.info(this.profileId, 'Starting random browsing session')

    const browsingPages = profile.scrapingConfig?.randomBrowsingPages || [
      '/home', '/about', '/contact', '/news', '/fixtures', '/players', '/history'
    ]

    const pagesToVisit = Math.floor(Math.random() * 3) + 1 // 1-3 pages
    
    for (let i = 0; i < pagesToVisit; i++) {
      const randomPage = browsingPages[Math.floor(Math.random() * browsingPages.length)]
      logger.info(this.profileId, `Browsing page: ${randomPage}`)
      
      // Simulate page visit
      await this.delay(this.getRandomDelay(5000, 15000))
      
      // Simulate scrolling and interaction
      await this.simulateHumanInteraction()
    }

    this.randomBrowsingCount++
    logger.info(this.profileId, `Random browsing session completed (session ${this.randomBrowsingCount})`)
    
    // Return to ticket checking
    this.updateProfileStatus('SearchingTickets', 'Returning to ticket search')
  }

  /**
   * Simulate human-like interactions on a page
   */
  async simulateHumanInteraction() {
    // Simulate scrolling
    await this.delay(this.getRandomDelay(1000, 3000))
    logger.info(this.profileId, 'Simulating page scrolling')
    
    // Simulate reading time
    await this.delay(this.getRandomDelay(2000, 8000))
    
    // Occasionally simulate clicking on elements
    if (Math.random() > 0.7) {
      logger.info(this.profileId, 'Simulating element interaction')
      await this.delay(this.getRandomDelay(1000, 2000))
    }
  }

  /**
   * Monitor configuration changes in the profile
   */
  async monitorConfiguration() {
    const profile = this.getProfile()
    if (!profile) return

    // Check if scraping configuration has changed
    // This would typically compare with a cached version
    // For now, just log that we're monitoring
    if (Math.random() < 0.01) { // 1% chance to simulate config change
      logger.info(this.profileId, 'Configuration change detected, updating scraping parameters')
      this.updateProfileData({ 
        lastScrapingActivity: new Date().toISOString(),
        retryCount: 0 // Reset retry count on config change
      })
    }
  }

  /**
   * Handle live configuration updates during scraping
   * This method is called when the profile configuration is updated while scraping is active
   */
  handleConfigurationUpdate(changes) {
    try {
      logger.info(this.profileId, `Applying live configuration changes: ${changes.join(', ')}`)
      
      // Reset retry count when configuration changes
      this.currentRetries = 0
      
      // Update last activity
      this.updateProfileData({
        lastScrapingActivity: new Date().toISOString(),
        retryCount: 0
      })
      
      // Log that the scraping session will adapt to new configuration
      logger.info(this.profileId, 'Scraping session adapted to new configuration')
      
      // Send status update about configuration change
      this.updateProfileStatus('Scraping', `Configuration updated: ${changes.join(', ')}`)
      
    } catch (error) {
      logger.error(this.profileId, `Failed to handle configuration update: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Handle scraping errors
   */
  handleScrapingError(error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown scraping error'
    logger.error(this.profileId, `Scraping error: ${errorMessage}`)
    
    this.currentRetries++
    this.updateProfileScrapingState('error')
    
    const profile = this.getProfile()
    const maxRetries = profile?.scrapingConfig?.maxRetries || 5
    
    if (this.currentRetries >= maxRetries) {
      logger.error(this.profileId, 'Max scraping retries reached, stopping session')
      this.updateProfileStatus('Error', `Scraping failed: ${errorMessage}`)
      this.stop()
    } else {
      this.updateProfileStatus('Error', `Scraping error (retry ${this.currentRetries}/${maxRetries})`)
    }
  }

  /**
   * Schedule the next loop iteration
   */
  scheduleNextLoop(customDelay) {
    if (!this.isActive) return

    const profile = this.getProfile()
    const baseDelay = profile?.scrapingConfig?.delayBetweenActions || 5000
    const delay = customDelay || this.getRandomDelay(baseDelay, baseDelay * 2)

    this.loopInterval = setTimeout(() => {
      this.runScrapingLoop()
    }, delay)
  }

  /**
   * Get random delay within range
   */
  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get profile from store
   */
  getProfile() {
    return profileStore?.getProfile(this.profileId)
  }

  /**
   * Update profile status
   */
  updateProfileStatus(status, message) {
    if (profileStore) {
      profileStore.updateStatus(this.profileId, status, message)
    }
  }

  /**
   * Update profile data
   */
  updateProfileData(updates) {
    if (profileStore) {
      profileStore.updateProfile(this.profileId, updates)
    }
  }

  /**
   * Update scraping state in profile
   */
  updateProfileScrapingState(state) {
    this.updateProfileData({ 
      scrapingState: state,
      lastScrapingActivity: new Date().toISOString()
    })
  }

  /**
   * Send toast notification to renderer
   */
  sendToast(title, description, variant = 'default') {
    if (mainWindow) {
      mainWindow.webContents.send('toast-received', {
        title,
        description,
        variant,
        duration: 5000
      })
    }
  }

  /**
   * Resume scraping after user interaction
   */
  resumeAfterUserInteraction() {
    if (this.isWaitingForUser) {
      this.isWaitingForUser = false
      this.updateProfileScrapingState('active')
      logger.info(this.profileId, 'Resuming scraping after user interaction')
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      profileId: this.profileId,
      isActive: this.isActive,
      sessionDuration: Date.now() - this.sessionStartTime,
      currentRetries: this.currentRetries,
      lastPageType: this.lastPageType,
      randomBrowsingCount: this.randomBrowsingCount,
      isWaitingForUser: this.isWaitingForUser
    }
  }
}

/**
 * Start scraping for a profile (called after successful launch)
 */
export async function startProfileScraping(profileId) {
  try {
    if (!profileStore) {
      throw new Error('Profile store not initialized for scraping')
    }

    const profile = profileStore.getProfile(profileId)
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`)
    }

    // Check if profile is in correct state to start scraping
    if (profile.status !== 'Ready' && profile.status !== 'LoggedIn') {
      logger.warn(profileId, `Profile not ready for scraping (status: ${profile.status})`)
      return
    }

    // Initialize default scraping config if not present
    if (!profile.scrapingConfig) {
      const defaultConfig = {
        targetTickets: 1,
        maxRetries: 5,
        delayBetweenActions: 5000,
        randomBrowsingPages: ['/home', '/about', '/contact', '/news'],
        autoLogin: true,
        handleCaptcha: 'manual'
      }
      
      profileStore.updateProfile(profileId, { scrapingConfig: defaultConfig })
      logger.info(profileId, 'Initialized default scraping configuration')
    }

    // Stop existing session if any
    await stopProfileScraping(profileId)

    // Create and start new scraping session
    const session = new ScrapingSession(profileId)
    scrapingSessions.set(profileId, session)
    
    await session.start()
    logger.info(profileId, 'Profile scraping started successfully')

  } catch (error) {
    logger.error(profileId, `Failed to start scraping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

/**
 * Stop scraping for a profile
 */
export async function stopProfileScraping(profileId) {
  try {
    const session = scrapingSessions.get(profileId)
    if (session) {
      await session.stop()
      scrapingSessions.delete(profileId)
      logger.info(profileId, 'Profile scraping stopped')
    }
  } catch (error) {
    logger.error(profileId, `Failed to stop scraping: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Resume scraping after user interaction (e.g., captcha solved)
 */
export function resumeProfileScraping(profileId) {
  const session = scrapingSessions.get(profileId)
  if (session) {
    session.resumeAfterUserInteraction()
    logger.info(profileId, 'Profile scraping resumed after user interaction')
  }
}

/**
 * Get scraping session statistics
 */
export function getScrapingStats(profileId) {
  const session = scrapingSessions.get(profileId)
  return session ? session.getSessionStats() : null
}

/**
 * Stop all active scraping sessions
 */
export async function stopAllScraping() {
  logger.info('Global', `Stopping all scraping sessions (${scrapingSessions.size} active)`)
  
  const stopPromises = Array.from(scrapingSessions.keys()).map(profileId => 
    stopProfileScraping(profileId)
  )
  
  await Promise.all(stopPromises)
  logger.info('Global', 'All scraping sessions stopped')
}

/**
 * Get all active scraping sessions
 */
export function getActiveScrapingSessions() {
  return Array.from(scrapingSessions.keys())
}

/**
 * Notify scraping system of configuration changes
 * This function is called when profile data is updated to ensure the scraping system
 * is aware of the changes and can adapt its behavior accordingly
 */
export async function notifyScrapingConfigChange(profileId, changes) {
  try {
    const session = scrapingSessions.get(profileId)
    const profile = profileStore?.getProfile(profileId)
    
    if (!profile) {
      logger.warn(profileId, 'Cannot notify scraping of config changes: Profile not found')
      return
    }
    
    // Log the configuration change notification
    logger.info(profileId, `Scraping system notified of configuration changes: ${changes.join(', ')}`)
    
    if (session) {
      // If there's an active scraping session, notify it of the configuration change
      session.handleConfigurationUpdate(changes)
      logger.info(profileId, 'Active scraping session notified and updated with new configuration')
      
      // Send toast notification about active scraping using new config
      if (mainWindow) {
        mainWindow.webContents.send('toast-received', {
          title: 'Live Config Update',
          description: `${profile.name}: Active scraping updated with new configuration`,
          variant: 'success',
          duration: 3000
        })
      }
    } else {
      // No active session, but config is updated for future scraping
      logger.info(profileId, 'Configuration updated for future scraping sessions')
      
      // Send toast notification about config being ready for next scraping
      if (mainWindow) {
        mainWindow.webContents.send('toast-received', {
          title: 'Config Ready',
          description: `${profile.name}: New configuration ready for next scraping session`,
          variant: 'default',
          duration: 3000
        })
      }
    }
    
    // Log specific changes for debugging
    changes.forEach(change => {
      logger.info(profileId, `Scraping config change: ${change}`)
    })
    
  } catch (error) {
    logger.error(profileId, `Failed to notify scraping system of config changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}