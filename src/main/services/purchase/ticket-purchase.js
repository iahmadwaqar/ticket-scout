import { logger } from '../../utils/logger-service.js'
import { profileStore } from '../profile/profileStore.js'
import { seatViewService } from '../verification/seat-view.js'

/**
 * Ticket Purchase Service
 * Implements seat reservation and purchase flow
 * Reference from Python: exchangeData.py → ticket POST request logic
 */
export class TicketPurchaseService {
  constructor() {
    this.purchaseAttempts = new Map() // profileId -> attempt count
  }

  /**
   * Attempt ticket purchase
   * @param {Object} monitoringState - Current monitoring state
   * @param {Object} ticketCheckResult - Result from ticket availability check
   * @returns {Object} Purchase result
   */
  async attemptPurchase(monitoringState, ticketCheckResult) {
    const { profileId, session, profile, config } = monitoringState

    try {
      logger.info(profileId, `Attempting ticket purchase - Type: ${ticketCheckResult.ticketType}`)

      // Build ticket purchase data
      const ticketData = this.buildTicketData(profile, config)
      const ticketHeaders = this.buildTicketHeaders(profile.browserData, profile.matchUrl)
      const ticketUrl = this.buildTicketUrl(profile.browserData)

      // First purchase attempt
      let response = await this.postTicketRequest(session, ticketUrl, ticketHeaders, ticketData, profileId)

      // Handle 400 status with retry logic (Python pattern)
      if (response.status === 400) {
        logger.info(profileId, 'Received 400, retrying with 1 seat')
        const retryData = this.buildRetryTicketData(profile, config)
        response = await this.postTicketRequest(session, ticketUrl, ticketHeaders, retryData, profileId)
      }

      // Process purchase response
      return await this.processPurchaseResponse(response, monitoringState, ticketData)

    } catch (error) {
      logger.error(profileId, `Purchase attempt failed: ${error.message}`)
      return { success: false, error: error.message, shouldStop: false }
    }
  }

  /**
   * Build ticket purchase data following Python structure
   */
  buildTicketData(profile, config) {
    const seatCount = config.seatCount || profile.seats || 1
    const seatSet = [{
      SeatCount: seatCount,
      PriceTypeGuid: profile.browserData.priceTypeId
    }]

    const selectedAreas = config.selectedAreas || profile.browserData.areaIds || []

    return {
      eventId: profile.eventId,
      priceLevels: JSON.stringify(profile.browserData.priceLevels),
      seatsToSet: JSON.stringify(seatSet),
      promoData: '',
      areas: JSON.stringify(selectedAreas)
    }
  }

  /**
   * Build retry ticket data with 1 seat (Python 400 error handling)
   */
  buildRetryTicketData(profile, config) {
    const seatSet = [{
      SeatCount: 1,
      PriceTypeGuid: profile.browserData.priceTypeId
    }]

    const selectedAreas = config.selectedAreas || profile.browserData.areaIds || []

    return {
      eventId: profile.eventId,
      priceLevels: JSON.stringify(profile.browserData.priceLevels),
      seatsToSet: JSON.stringify(seatSet),
      promoData: '',
      areas: JSON.stringify(selectedAreas)
    }
  }

  /**
   * Build ticket purchase headers following Python pattern
   */
  buildTicketHeaders(browserData, matchUrl) {
    return {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': `https://${browserData.hostUrl}`,
      'priority': 'u=1, i',
      'referer': matchUrl,
      'sec-ch-device-memory': '8',
      'sec-ch-ua': browserData.uaHalf,
      'sec-ch-ua-arch': '"arm"',
      'sec-ch-ua-full-version-list': browserData.uaFull,
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': browserData.userAgent,
      'x-requested-with': 'XMLHttpRequest'
    }
  }

  /**
   * Build ticket purchase URL
   */
  buildTicketUrl(browserData) {
    return `https://${browserData.hostUrl}/handlers/api.ashx/0.1/TicketingController.SetEventTickets`
  }

  /**
   * Post ticket request with retry logic
   */
  async postTicketRequest(session, url, headers, data, profileId) {
    try {
      logger.info(profileId, 'Posting ticket purchase request')
      const response = await session.post(url, data, { headers })
      logger.info(profileId, `Purchase response: ${response.status}`)
      return response
    } catch (error) {
      logger.warn(profileId, `First purchase request failed: ${error.message}, retrying`)
      
      try {
        const response = await session.post(url, data, { headers })
        logger.info(profileId, `Retry purchase response: ${response.status}`)
        return response
      } catch (retryError) {
        logger.error(profileId, `Purchase retry failed: ${retryError.message}`)
        profileStore.updateStatus(profileId, 'TProxyError')
        throw retryError
      }
    }
  }

  /**
   * Process purchase response following Python logic
   */
  async processPurchaseResponse(response, monitoringState, ticketData) {
    const { profileId, profile } = monitoringState

    logger.info(profileId, `Processing purchase response: ${response.status}`)

    switch (response.status) {
      case 200:
        return await this.handleSuccessfulPurchase(response, monitoringState)

      case 400:
        return await this.handle400Response(response, monitoringState, ticketData)

      case 403:
        profileStore.updateStatus(profileId, '403TError')
        return { success: false, shouldStop: true, error: 'Forbidden error' }

      case 406:
        profileStore.updateStatus(profileId, '406TError')
        return { success: false, shouldStop: true, error: 'Rate limit error' }

      default:
        profileStore.updateStatus(profileId, 'UnknownTError')
        return { success: false, shouldStop: true, error: `Unknown status: ${response.status}` }
    }
  }

  /**
   * Handle successful purchase (200 response)
   */
  async handleSuccessfulPurchase(response, monitoringState) {
    const { profileId, profile } = monitoringState

    try {
      // Navigate to order page using CDP
      await this.navigateToOrderPage(profileId, profile)

      // Process ticket details
      const ticketDetails = await this.extractTicketDetails(response, profileId)
      
      // Update profile status
      profileStore.updateStatus(profileId, 'Tickets')
      profileStore.updateProfileField(profileId, 'operationalState', 'completed')

      // Send notifications
      await this.sendNotifications(ticketDetails, profile)

      logger.info(profileId, 'Purchase completed successfully')
      
      return { 
        success: true, 
        shouldStop: true, 
        ticketDetails,
        message: 'Purchase completed successfully' 
      }

    } catch (error) {
      logger.error(profileId, `Error processing successful purchase: ${error.message}`)
      return { 
        success: true, 
        shouldStop: true, 
        error: error.message,
        message: 'Purchase completed but processing failed' 
      }
    }
  }

  /**
   * Handle 400 response (continue monitoring)
   */
  async handle400Response(response, monitoringState, ticketData) {
    const { profileId } = monitoringState

    try {
      // Log the attempt and continue monitoring
      logger.info(profileId, 'Tickets no longer available (400), continuing monitoring')

      // Process seat details following Python Seatdetails function
      const matchPageContent = monitoringState.lastMatchPageContent || ''
      const ticketPageResponse = response.data || response.text || ''
      const selectedAreas = monitoringState.config?.selectedAreas || []
      
      // Use seat view service to analyze ticket fall
      const seatData = seatViewService.viewSeat(
        matchPageContent, 
        ticketPageResponse, 
        profileId, 
        selectedAreas
      )
      
      if (seatViewService.isTicketFall(seatData)) {
        // Update status with ticket fall time (following Python pattern)
        const currentTime = new Date()
        const timeString = currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        profileStore.updateStatus(profileId, `TicketFall_${timeString}`)
        logger.info(profileId, `Ticket fall detected at ${timeString}`)
      }

      // Navigate to order page to check current state
      await this.navigateToOrderPage(profileId, monitoringState.profile)

      // Update profile status to show monitoring continues
      profileStore.updateStatus(profileId, 'SearchingTickets')

      return { 
        success: false, 
        shouldStop: false, 
        message: 'Tickets no longer available, continuing monitoring' 
      }

    } catch (error) {
      logger.error(profileId, `Error handling 400 response: ${error.message}`)
      return { success: false, shouldStop: false }
    }
  }

  /**
   * Navigate to order page using CDP
   */
  async navigateToOrderPage(profileId, profile) {
    try {
      const instances = profileStore.getGoLoginInstances(profileId)
      if (instances && instances.cdp) {
        const orderUrl = `${profile.browserData.domainUrl}/Order.aspx`
        await instances.cdp.Page.navigate({ url: orderUrl })
        logger.info(profileId, `Navigated to order page: ${orderUrl}`)
      }
    } catch (error) {
      logger.warn(profileId, `Failed to navigate to order page: ${error.message}`)
    }
  }

  /**
   * Extract ticket details from purchase response
   */
  async extractTicketDetails(response, profileId) {
    try {
      const responseData = response.data || response.text || ''
      
      if (typeof responseData === 'string') {
        // Try to parse as JSON
        const ticketData = JSON.parse(responseData)
        return this.formatTicketDetails(ticketData, profileId)
      } else if (typeof responseData === 'object') {
        return this.formatTicketDetails(responseData, profileId)
      }

      return { ticketType: 'Unknown', details: 'No ticket details available' }

    } catch (error) {
      logger.warn(profileId, `Failed to parse ticket details: ${error.message}`)
      return { ticketType: 'No json found', details: 'Failed to parse response' }
    }
  }

  /**
   * Format ticket details following Python pattern
   */
  formatTicketDetails(ticketData, profileId) {
    try {
      if (!Array.isArray(ticketData) || ticketData.length === 0) {
        return { ticketType: 'Unknown', details: 'No ticket data found' }
      }

      let seatDetailsText = ''
      let ticketType = 'Unknown'

      for (let index = 0; index < ticketData.length; index++) {
        const ticket = ticketData[index]
        
        if (index === 0) {
          seatDetailsText += `\nEvent: ${ticket.ShowName || 'Unknown Event'}\n`
          ticketType = ticket.PriceTypeName || 'Unknown'
        }

        seatDetailsText += `${index + 1}: Area: ${ticket.AreaName || 'N/A'}, ` +
                          `Row: ${ticket.RowName || 'N/A'}, ` +
                          `Seat: ${ticket.SeatName || 'N/A'}, ` +
                          `Price: ${ticket.TotalPrice?.AsString || 'N/A'}\n`
      }

      return {
        ticketType,
        details: seatDetailsText,
        count: ticketData.length,
        rawData: ticketData
      }

    } catch (error) {
      logger.error(profileId, `Error formatting ticket details: ${error.message}`)
      return { ticketType: 'Error', details: 'Failed to format ticket details' }
    }
  }

  /**
   * Send notifications (placeholder for sound/telegram integration)
   */
  async sendNotifications(ticketDetails, profile) {
    try {
      const message = `${ticketDetails.ticketType} Tickets in basket for ${profile.name} (${profile.email})${ticketDetails.details}`
      
      // Log the notification message
      logger.info(profile.id, `Notification: ${message}`)
      
      // TODO: Integrate with sound notification service
      // TODO: Integrate with telegram/message service
      
    } catch (error) {
      logger.error(profile.id, `Failed to send notifications: ${error.message}`)
    }
  }

  /**
   * Get purchase statistics
   */
  getPurchaseStats() {
    return {
      totalAttempts: this.purchaseAttempts.size,
      activeProfiles: Array.from(this.purchaseAttempts.keys())
    }
  }
}

// Export singleton instance
export const ticketPurchaseService = new TicketPurchaseService()