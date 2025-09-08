import { logger } from '../../utils/logger-service.js'
import { profileStore } from '../profile/profileStore.js'
import { ticketChecker } from '../verification/ticket-checker.js'
import { sessionBridgeService } from '../gologin/session-bridge.js'
import { seatViewService } from '../verification/seat-view.js'

/**
 * Ticket Monitoring Engine
 * Implements continuous ticket availability checking
 * Reference from Python: exchangeData.py → initCrawler()
 */
export class TicketMonitoringEngine {
  constructor() {
    this.monitoringInstances = new Map() // profileId -> monitoring state
    this.FULL_PRICE_PATTERN = /"fullPrice":(\d\d\.\d*)/
    this.PRICING_PATTERN = /var eventPricing\s*=\s*({.*?});/s
  }

  /**
   * Start monitoring for a profile
   * @param {string} profileId - Profile ID
   * @param {Object} session - HTTP session with cookies
   * @param {Object} config - Monitoring configuration
   */
  async startMonitoring(profileId, session, config) {
    try {
      logger.info(profileId, 'Starting ticket monitoring')

      if (this.monitoringInstances.has(profileId)) {
        logger.warn(profileId, 'Monitoring already active, stopping previous instance')
        this.stopMonitoring(profileId)
      }

      const profile = profileStore.getProfile(profileId)
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`)
      }

      const monitoringState = {
        profileId,
        session,
        config,
        profile,
        isRunning: true,
        counter: 0,
        abortController: new AbortController()
      }

      this.monitoringInstances.set(profileId, monitoringState)

      // Start monitoring loop
      this.initMonitoringLoop(monitoringState)

      return { success: true, profileId }

    } catch (error) {
      logger.error(profileId, `Failed to start monitoring: ${error.message}`)
      return { success: false, error: error.message, profileId }
    }
  }

  /**
   * Stop monitoring for a profile
   * @param {string} profileId - Profile ID
   */
  stopMonitoring(profileId) {
    const monitoringState = this.monitoringInstances.get(profileId)
    if (monitoringState) {
      monitoringState.isRunning = false
      monitoringState.abortController.abort()
      this.monitoringInstances.delete(profileId)
      logger.info(profileId, 'Monitoring stopped')
    }
  }

  /**
   * Main monitoring loop following Python initCrawler logic
   * @param {Object} monitoringState - Monitoring state object
   */
  async initMonitoringLoop(monitoringState) {
    const { profileId, session, config, profile } = monitoringState

    try {
      // Calculate sleep intervals with jitter
      const speedLimit = parseFloat(config.speedLimit || '1')
      const startSleepTime = speedLimit + 1.3
      const endSleepTime = startSleepTime + 0.3

      while (monitoringState.isRunning) {
        // Sleep between requests (except first iteration)
        if (monitoringState.counter > 0) {
          const sleepTime = Math.random() * (endSleepTime - startSleepTime) + startSleepTime
          await this.sleep(sleepTime * 1000)
        }

        monitoringState.counter++

        // Check if monitoring should continue (every 30 iterations)
        if (monitoringState.counter % 30 === 0) {
          if (!this.shouldContinueMonitoring(profileId)) {
            logger.info(profileId, 'Monitoring stopped by external control')
            break
          }
          // Refresh configuration from profile store
          this.refreshConfiguration(monitoringState)
        }

        // Session refresh (every 100 iterations)
        if (monitoringState.counter % 100 === 0) {
          await this.refreshSession(monitoringState)
          if (!monitoringState.session) {
            logger.error(profileId, 'Session refresh failed, stopping monitoring')
            break
          }
        }

        // Fetch match page
        const matchPageResult = await this.fetchMatchPage(monitoringState)
        if (!matchPageResult.success) {
          if (matchPageResult.shouldStop) {
            break
          }
          continue
        }

        // Check for tickets
        const ticketCheckResult = this.checkForTickets(matchPageResult.content, monitoringState)
        if (ticketCheckResult.hasTickets) {
          // Attempt purchase
          const purchaseResult = await this.attemptPurchase(monitoringState, ticketCheckResult)
          if (purchaseResult.success) {
            logger.info(profileId, 'Purchase successful, stopping monitoring')
            break
          } else if (purchaseResult.shouldStop) {
            break
          }
        }
      }

    } catch (error) {
      logger.error(profileId, `Monitoring loop error: ${error.message}`)
    } finally {
      this.stopMonitoring(profileId)
    }
  }

  /**
   * Fetch match page with retry logic
   * @param {Object} monitoringState - Monitoring state
   * @returns {Object} Result with success flag and content
   */
  async fetchMatchPage(monitoringState) {
    const { profileId, session, profile } = monitoringState

    try {
      const matchHeaders = this.buildMatchHeaders(profile.browserData)
      let response = await session.get(profile.matchUrl, { 
        headers: matchHeaders,
        signal: monitoringState.abortController.signal 
      })

      // Handle queue-it redirects
      let content = response.data || response
      if (typeof content === 'string' && content.includes('decodeURIComponent')) {
        response = await this.handleQueueItRedirect(session, content, matchHeaders, profile)
        content = response.data || response
      }

      logger.info(profileId, `Response ${response.status} for ${profileId}: Hit count ${monitoringState.counter}`)

      if (response.status === 200) {
        // Store the match page content for seat view analysis
        monitoringState.lastMatchPageContent = content
        return { success: true, content, response }
      } else {
        // Handle error status codes
        return this.handleErrorStatus(response.status, profileId)
      }

    } catch (error) {
      logger.error(profileId, `Error fetching match page: ${error.message}`)
      
      // Retry once
      try {
        const matchHeaders = this.buildMatchHeaders(profile.browserData)
        const response = await session.get(profile.matchUrl, { 
          headers: matchHeaders,
          signal: monitoringState.abortController.signal 
        })
        const content = response.data || response
        return { success: true, content, response }
      } catch (retryError) {
        logger.error(profileId, `Retry failed: ${retryError.message}`)
        profileStore.updateStatus(profileId, 'ProxyError')
        return { success: false, shouldStop: true }
      }
    }
  }

  /**
   * Handle queue-it redirects following Python logic
   */
  async handleQueueItRedirect(session, content, headers, profile) {
    const match = content.match(/decodeURIComponent\('(.*?)'\)/)
    if (match) {
      const decodedUrl = decodeURIComponent(match[1])
      const queueUrl = `https://${profile.browserData.host}.queue-it.net${decodedUrl}`
      
      headers.referer = queueUrl
      const queueResponse = await session.get(queueUrl, { headers })
      
      if (queueResponse.request.res.responseUrl.includes('.queue-it.net')) {
        headers.referer = queueResponse.request.res.responseUrl
        return await session.get(queueResponse.request.res.responseUrl, { headers })
      }
      
      return queueResponse
    }
    return { data: content }
  }

  /**
   * Check for ticket availability following Python checkTicket logic
   */
  checkForTickets(content, monitoringState) {
    const { profile, config } = monitoringState

    // Check if access keyword is present
    if (!content.includes(config.keyword1 || profile.browserData.keyword1 || '')) {
      profileStore.updateStatus(monitoringState.profileId, 'KeyNotFound')
      return { hasTickets: false, shouldStop: true }
    }

    // Quick check for empty pricing
    if (content.includes('eventPricing = {};')) {
      return { hasTickets: false }
    }

    const seatCount = config.seatCount || profile.seats || 1
    const selectedAreas = config.selectedAreas || profile.browserData.areaIds || []
    const selectedType = config.selectedType || 'All'

    // For "All" area type, use full price pattern
    if (selectedType === 'All' || selectedAreas.length === 0) {
      const priceMatch = this.FULL_PRICE_PATTERN.exec(content)
      return { 
        hasTickets: !!priceMatch, 
        ticketType: 'all',
        price: priceMatch ? priceMatch[1] : null 
      }
    }

    // Use advanced ticket checker for specific areas and multi-seat requests
    const hasTickets = ticketChecker.checkTicket(content, seatCount, selectedAreas)
    
    if (hasTickets) {
      logger.info(monitoringState.profileId, `Tickets found - seats: ${seatCount}, areas: ${selectedAreas.join(',')}`)
      return {
        hasTickets: true,
        ticketType: seatCount === 1 ? 'single' : 'multi-seat',
        seatCount,
        selectedAreas
      }
    }

    return { hasTickets: false }
  }



  /**
   * Build match page headers following Python pattern
   */
  buildMatchHeaders(browserData) {
    return {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'priority': 'u=0, i',
      'referer': browserData.homepageUrl,
      'sec-ch-device-memory': '8',
      'sec-ch-ua': browserData.uaHalf,
      'sec-ch-ua-arch': '"arm"',
      'sec-ch-ua-full-version-list': browserData.uaFull,
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': browserData.userAgent
    }
  }

  /**
   * Handle HTTP error status codes
   */
  handleErrorStatus(statusCode, profileId) {
    const statusMessages = {
      400: '400NotFound',
      403: '403Forbidden', 
      404: '404NotFound',
      406: '406RateLimit'
    }

    const message = statusMessages[statusCode] || 'UnknownError'
    profileStore.updateStatus(profileId, message)
    
    return { 
      success: false, 
      shouldStop: statusCode !== 429 // Continue for rate limiting, stop for others
    }
  }

  /**
   * Refresh session following Python logic
   */
  async refreshSession(monitoringState) {
    try {
      logger.info(monitoringState.profileId, 'Refreshing HTTP session')
      
      // Refresh session cookies from browser
      const refreshResult = await sessionBridgeService.refreshSessionCookies(monitoringState.profileId)
      
      if (refreshResult.success) {
        logger.info(monitoringState.profileId, `Session refreshed with ${refreshResult.cookieCount} cookies`)
      } else {
        logger.warn(monitoringState.profileId, `Session refresh failed: ${refreshResult.error}`)
        
        // Try to recreate session from browser
        const createResult = await sessionBridgeService.createSessionFromBrowser(monitoringState.profileId)
        
        if (createResult.success) {
          monitoringState.session = createResult.session
          logger.info(monitoringState.profileId, 'Session recreated successfully')
        } else {
          logger.error(monitoringState.profileId, `Session recreation failed: ${createResult.error}`)
          monitoringState.session = null
        }
      }
      
    } catch (error) {
      logger.error(monitoringState.profileId, `Session refresh error: ${error.message}`)
      monitoringState.session = null
    }
  }

  /**
   * Check if monitoring should continue
   */
  shouldContinueMonitoring(profileId) {
    const profile = profileStore.getProfile(profileId)
    if (!profile) return false
    
    // Check if profile status indicates it should continue
    const stopStatuses = ['Stopped', 'Error', 'Completed', 'Disabled']
    return !stopStatuses.includes(profile.status)
  }

  /**
   * Refresh configuration from profile store
   */
  refreshConfiguration(monitoringState) {
    // Update configuration from profile store
    const profile = profileStore.getProfile(monitoringState.profileId)
    if (profile) {
      monitoringState.profile = profile
      // Update config if needed
    }
  }

  /**
   * Attempt ticket purchase
   */
  async attemptPurchase(monitoringState, ticketCheckResult) {
    // This calls the purchase service (Step 11)
    const { ticketPurchaseService } = await import('../purchase/ticket-purchase.js')
    return await ticketPurchaseService.attemptPurchase(monitoringState, ticketCheckResult)
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get monitoring status for a profile
   */
  getMonitoringStatus(profileId) {
    const state = this.monitoringInstances.get(profileId)
    return state ? {
      isRunning: state.isRunning,
      counter: state.counter,
      profileId: state.profileId
    } : null
  }

  /**
   * Stop all monitoring instances
   */
  stopAllMonitoring() {
    for (const profileId of this.monitoringInstances.keys()) {
      this.stopMonitoring(profileId)
    }
  }
}

// Export singleton instance
export const ticketMonitoringEngine = new TicketMonitoringEngine()