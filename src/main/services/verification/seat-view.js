import { logger } from '../../utils/logger-service.js'

/**
 * Seat View Service
 * Implements seat availability checking and ticket fall detection
 * Reference from Python: seatView.py → viewseat()
 */
export class SeatViewService {
  constructor() {
    this.FULL_PRICE_PATTERN = /"fullPrice":(\d\d\.\d),/g
    this.VENUE_AREAS_PATTERN = /venueAreasObj\.init.*?(\{ 'productId'.*?\}\}\] \}),/s
  }

  /**
   * View seat availability and detect ticket falls
   * @param {string} matchPageResponse - Match page HTML content
   * @param {string} ticketPageResponse - Ticket purchase response
   * @param {string} profileName - Profile name for logging
   * @param {Array} areaIds - Area IDs to check
   * @returns {Object|null} Seat data if tickets available, null otherwise
   */
  viewSeat(matchPageResponse, ticketPageResponse, profileName, areaIds = []) {
    let fullData = {}

    try {
      // Extract ticket details using price pattern (exact Python logic)
      const ticketDetails = this.extractTicketPrices(matchPageResponse)
      logger.info(profileName, `Found ticket prices: ${JSON.stringify(Array.from(ticketDetails))}`)

      // Extract venue areas data (exact Python logic)
      const match = this.VENUE_AREAS_PATTERN.exec(matchPageResponse)
      if (match) {
        const loadData = this.parseVenueAreasData(match[1])
        
        if (loadData && loadData.areas) {
          fullData = this.filterAvailableAreas(loadData.areas, areaIds, ticketDetails)
          
          const res400 = JSON.stringify(fullData) + '\n\n' + ticketPageResponse + matchPageResponse
          
          if (Object.keys(fullData).length > 0) {
            this.saveOfflineData('seatdata', res400, profileName, 'Fall', true)
            
            // Log available seats (exact Python format)
            const seatSummary = {}
            for (const [areaName, data] of Object.entries(fullData)) {
              seatSummary[areaName] = data.free
            }
            logger.info(profileName, `Available seats: ${JSON.stringify(seatSummary)}`)
            
            return fullData
          }
        }
      } else {
        this.saveOfflineData('noseatdata', matchPageResponse, profileName, 'NoFall', true)
        logger.warn(profileName, 'No venue areas data found in match page')
      }

    } catch (error) {
      logger.error(profileName, `Seat view error: ${error.message}`)
      this.saveOfflineData('errorseatview', error.message, profileName, 'ViewError', true)
    }

    return fullData
  }

  /**
   * Extract ticket prices from match page (exact Python logic)
   * @param {string} content - Page content
   * @returns {Set} Set of ticket prices under £100
   */
  extractTicketPrices(content) {
    const matches = Array.from(content.matchAll(this.FULL_PRICE_PATTERN))
    const prices = matches
      .map(match => Math.round(parseFloat(match[1])))
      .filter(price => price <= 100)
    
    return new Set(prices)
  }

  /**
   * Parse venue areas data from JavaScript object string (exact Python logic)
   * @param {string} dataString - JavaScript object string
   * @returns {Object|null} Parsed data or null
   */
  parseVenueAreasData(dataString) {
    try {
      // Clean up the data string (exact Python logic)
      let cleanData = dataString.replace(/oColor/g, '"oColor"')
      cleanData = cleanData.replace(/'/g, '"')
      
      return JSON.parse(cleanData)
    } catch (error) {
      logger.warn('Global', `Failed to parse venue areas data: ${error.message}`)
      return null
    }
  }

  /**
   * Filter available areas based on criteria (exact Python logic)
   * @param {Array} areas - Areas data
   * @param {Array} areaIds - Target area IDs
   * @param {Set} ticketDetails - Available ticket prices
   * @returns {Object} Filtered areas data
   */
  filterAvailableAreas(areas, areaIds, ticketDetails) {
    const fullData = {}

    for (const area of areas) {
      // Check if area has free seats (exact Python logic)
      if (parseInt(area.free) <= 0) {
        continue
      }

      // Check if area has reasonable prices (exact Python logic)
      const priceList = area.priceList || {}
      let hasReasonablePrice = false
      
      for (const priceLevelData of Object.values(priceList)) {
        for (const price of Object.values(priceLevelData)) {
          if (parseFloat(price) <= 100) {
            hasReasonablePrice = true
            break
          }
        }
        if (hasReasonablePrice) break
      }

      if (!hasReasonablePrice) {
        continue
      }

      // Check if area is in target list (exact Python logic)
      if (areaIds.length > 0 && !areaIds.includes(area.guid)) {
        continue
      }

      // Extract available price levels (exact Python logic)
      const availablePriceLevels = []
      const priceLevelsAvailability = area.priceLevelsAvailability || {}
      
      for (const [levelId, availability] of Object.entries(priceLevelsAvailability)) {
        if (parseInt(availability) >= 1) {
          availablePriceLevels.push(levelId)
        }
      }

      // Add to results (exact Python logic)
      fullData[area.name] = {
        free: area.free,
        guid: area.guid,
        availablePriceLevels
      }
    }

    return fullData
  }

  /**
   * Save offline data for debugging (placeholder - actual file saving would be handled differently in Electron)
   * @param {string} filename - Base filename
   * @param {string} data - Data to save
   * @param {string} profileName - Profile name
   * @param {string} folder - Folder name
   * @param {boolean} timeRequired - Add timestamp to filename
   */
  saveOfflineData(filename, data, profileName, folder, timeRequired = false) {
    try {
      let finalFilename = filename
      
      if (timeRequired) {
        const now = new Date()
        const timeString = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        }).replace(':', '_')
        finalFilename = `${filename}_${profileName}_${timeString}.html`
      } else {
        finalFilename = `${filename}_${profileName}.html`
      }

      // Log the data instead of actual file saving (Electron would handle this differently)
      logger.debug('Global', `Would save ${finalFilename} to ${folder} folder`)
      logger.debug('Global', `Data length: ${data.length} characters`)
      
    } catch (error) {
      logger.error('Global', `Failed to save offline data: ${error.message}`)
    }
  }

  /**
   * Check if seat data indicates a ticket fall
   * @param {Object} seatData - Seat data from viewSeat
   * @returns {boolean} True if tickets are available
   */
  isTicketFall(seatData) {
    return seatData && Object.keys(seatData).length > 0
  }
}

// Export singleton instance
export const seatViewService = new SeatViewService()