import { logger } from '../../utils/logger-service.js'

/**
 * Advanced Ticket Availability Checker
 * Implements complex multi-seat checking logic
 * Reference from Python: ticketChecker.py → checkTicket()
 */
export class TicketChecker {
  constructor() {
    // Precompiled regex patterns following Python implementation
    this.PRICING_PATTERN = /var eventPricing\s*=\s*({.*?});/s
    this.FULL_PRICE_PATTERN = /"fullPrice":(\d\d\.\d*)/g
  }

  /**
   * Advanced ticket availability check - exact Python implementation
   * @param {string} html - HTML page content
   * @param {number} seatCount - Number of seats requested (default: 1)
   * @param {Array} filter - Area IDs to check (default: [])
   * @returns {boolean} True if tickets are available
   */
  checkTicket(html, seatCount = 1, filter = []) {
    try {
      // Quick check for empty pricing (exact Python logic)
      if (html.includes('eventPricing = {};')) {
        console.log('no event')
        return false
      }

      // Check for full price pattern (exact Python logic)
      if (!this.FULL_PRICE_PATTERN.test(html)) {
        return false
      }

      // For single seat, return true if price pattern found (exact Python logic)
      if (seatCount === 1) {
        return true
      }

      // Extract pricing match (exact Python logic)
      const match = this.PRICING_PATTERN.exec(html)
      if (!match) {
        console.log('no price match')
        return false
      }

      // Check for sold out (exact Python logic)
      if (html.includes('This event is sold out')) {
        return false
      }

      // Parse event pricing JSON (exact Python logic)
      let eventPricing
      try {
        eventPricing = JSON.parse(match[1])
      } catch (error) {
        return false
      }

      // Iterate through areas (exact Python logic)
      for (const [areaIdValue, details] of Object.entries(eventPricing)) {
        // Filter by area IDs if specified (exact Python logic)
        if (filter.length > 0 && !filter.includes(areaIdValue)) {
          continue
        }

        // Check availability (exact Python logic)
        const availability = parseInt(details.availability || 0)
        if (availability < seatCount) {
          continue
        }

        // Check pricing structure (exact Python logic)
        const areaPricing = details.pricing?.areaPricing
        if (!areaPricing) {
          continue
        }

        // Get first area pricing (exact Python logic)
        const firstArea = Object.values(areaPricing)[0]
        if (!firstArea) {
          continue
        }

        // Check price levels (exact Python logic)
        const priceLevels = firstArea.priceLevels
        if (!priceLevels) {
          continue
        }

        // Get first price and check threshold (exact Python logic)
        const firstPrice = Object.values(priceLevels)[0]
        if (firstPrice && parseFloat(firstPrice.fullPrice || 999.0) <= 100) {
          return true
        }
      }

      return false

    } catch (error) {
      logger.error('Global', `Ticket check error: ${error.message}`)
      return false
    }
  }

  /**
   * Extract ticket details for logging/display
   * @param {Object} eventPricing - Parsed event pricing data
   * @param {Array} areaIds - Area IDs to check
   * @returns {Array} Array of ticket details
   */
  extractTicketDetails(eventPricing, areaIds = []) {
    const tickets = []

    try {
      for (const [areaId, areaData] of Object.entries(eventPricing)) {
        if (areaIds.length > 0 && !areaIds.includes(areaId)) {
          continue
        }

        const availability = parseInt(areaData.availability || 0)
        const areaPricing = areaData.pricing?.areaPricing

        if (areaPricing) {
          const firstAreaPricing = Object.values(areaPricing)[0]
          const priceLevels = firstAreaPricing?.priceLevels

          if (priceLevels) {
            for (const [priceId, priceData] of Object.entries(priceLevels)) {
              tickets.push({
                areaId,
                priceId,
                availability,
                fullPrice: priceData.fullPrice,
                displayPrice: priceData.displayPrice || priceData.fullPrice,
                areaName: areaData.name || `Area ${areaId}`
              })
            }
          }
        }
      }

      return tickets

    } catch (error) {
      logger.error('Global', `Ticket details extraction error: ${error.message}`)
      return []
    }
  }

  /**
   * Simple price pattern check (fallback method)
   * @param {string} content - Page content
   * @returns {boolean} True if price pattern found
   */
  hasPricePattern(content) {
    return this.FULL_PRICE_PATTERN.test(content)
  }
}

// Export singleton instance
export const ticketChecker = new TicketChecker()