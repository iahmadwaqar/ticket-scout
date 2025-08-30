import crypto from 'crypto'
import { logger } from '../../utils/logger-service.js'
import { CARD_DECRYPT_CONFIG } from '../../../shared/config.js'

/**
 * Card decryption utility following Python implementation
 */
function cardDecrypt(encryptedBase64) {
  try {
    const secretKeyText = CARD_DECRYPT_CONFIG.SECRET_KEY
    const secretKey = Buffer.from(secretKeyText.padEnd(32, '\0'), 'utf8')
    const iv = Buffer.from(CARD_DECRYPT_CONFIG.IV, 'utf8')
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv)
    decipher.setAutoPadding(false)
    
    const encrypted = Buffer.from(encryptedBase64, 'base64')
    let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    
    // Remove PKCS7 padding
    const padLength = decrypted[decrypted.length - 1]
    decrypted = decrypted.slice(0, decrypted.length - padLength)
    
    return decrypted.toString('utf8')
  } catch (error) {
    logger.error('Crypto', `Card decryption failed: ${error.message}`)
    return ''
  }
}

/**
 * Match model representing user profiles from database
 * Maps to Python Match class
 */
export class MatchModel {
  constructor(data = {}) {
    this.data = data
  }

  // Required fields based on Python usage
  getEmail() { return this.data.email || '' }
  getPassword() { return this.data.password || '' }
  getEventId() { return this.data.eventid || '' }
  getProfileId() { return this.data.profileid || '' }
  getMatchUrl() { return this.data.matchurl || '' }
  getToken() { return this.data.token || '' }
  getProxy() { return this.data.proxy || '' }
  getLink() { return this.data.link || '' }

  // Optional fields
  getFirstName() { return this.data.firstname || '' }
  getLastName() { return this.data.lastname || '' }
  getPostalCode() { return this.data.postalcode || '' }
  getPr() { return this.data.pr || '' }
  getCardType() { return this.data.cardtype || '' }
  getCvv() { return this.data.cvv || '' }
  getStatus() { return this.data.status || '' }
  getProfileName() { return this.data.profilename || '' }
  getTicketLimit() { return this.data.ticketlimit || '' }

  // Card decryption method
  getDecryptedCardNumber() {
    const encryptedCard = this.data.cardnumber
    if (!encryptedCard) return ''
    return cardDecrypt(encryptedCard)
  }

  getEncryptedCardNumber() {
    return this.data.cardnumber || ''
  }

  // Date formatting following Python patterns
  getFormattedExpiry() {
    const expiry = this.data.expiry
    if (!expiry) return ''
    
    try {
      let expiryDate
      if (typeof expiry === 'string') {
        // Handle different date formats from API
        if (expiry.includes('GMT') || expiry.includes('UTC')) {
          expiryDate = new Date(expiry)
        } else {
          expiryDate = new Date(expiry)
        }
      } else {
        expiryDate = new Date(expiry)
      }
      
      if (isNaN(expiryDate.getTime())) return ''
      
      // Format as YYYY/MM following Python pattern
      const year = expiryDate.getFullYear()
      const month = String(expiryDate.getMonth() + 1).padStart(2, '0')
      return `${year}/${month}`
    } catch (error) {
      logger.error('Model', `Date formatting failed: ${error.message}`)
      return ''
    }
  }

  getRawExpiry() {
    return this.data.expiry
  }

  // Cookies handling - can be array or single value
  getCookies() {
    const cookies = this.data.cookies
    if (!cookies) return []
    if (Array.isArray(cookies)) return cookies
    return [cookies]
  }

  // Generate GoLogin-compatible profile ID
  getGoLoginProfileId() {
    // If profileid exists in DB and is a valid GoLogin ID, use it
    const profileId = this.getProfileId()
    if (profileId) {
      return profileId
    }
    return '';
  }

  // Basic validation following Python required fields
  isValid() {
    return !!(this.getEmail() && this.getEventId())
  }

  // Get all data for debugging
  getRawData() {
    return this.data
  }
}

/**
 * BrowserData model representing browser configuration
 * Maps to Python BrowserData class
 */
export class BrowserDataModel {
  constructor(data = {}) {
    this.data = data
  }

  // Required fields based on Python usage
  getUserAgent() { return this.data.useragent || '' }
  getUaFull() { return this.data.uafull || '' }
  getUaHalf() { return this.data.uahalf || '' }
  getDomain() { return this.data.domain || '' }
  getDomainUrl() { return this.data.domainurl || '' }
  getHost() { return this.data.host || '' }
  getHostUrl() { return this.data.hosturl || '' }
  getHomepageUrl() { return this.data.homepageurl || '' }

  // Optional fields
  getPriceTypeId() { return this.data.pricetypeid || '' }
  getPriceLevels() { return this.data.pricelevels || '' }
  getDeleteCookies() { return this.data.deletecookies || '' }
  getCookieDomain() { return this.data.cookiedomain || '' }
  getKeyword1() { return this.data.keyword1 || '' }
  getKeyword2() { return this.data.keyword2 || '' }

  // Area IDs handling - can be array or string
  getAreaIds() {
    const areaIds = this.data.areaids
    if (!areaIds) return []
    if (Array.isArray(areaIds)) return areaIds
    if (typeof areaIds === 'string') {
      try {
        return JSON.parse(areaIds)
      } catch {
        return areaIds.split(',').map(id => id.trim()).filter(id => id)
      }
    }
    return []
  }

  // Save cookies configuration
  getSaveCookies() {
    const saveCookies = this.data.savecookies
    if (!saveCookies) return null
    if (typeof saveCookies === 'object') return saveCookies
    if (typeof saveCookies === 'string') {
      try {
        return JSON.parse(saveCookies)
      } catch {
        return null
      }
    }
    return null
  }

  // Basic validation
  isValid() {
    return !!(this.getDomain() && this.getUserAgent())
  }

  // Get all data for debugging
  getRawData() {
    return this.data
  }
}

/**
 * Cookie model representing individual cookie data
 * Maps to Python Cookie class
 */
export class CookieModel {
  constructor(data = {}) {
    this.data = data
  }

  // Required fields based on Python usage
  getName() { return this.data.name || '' }
  getValue() { return this.data.value || '' }
  getDomain() { return this.data.domain || '' }

  // Optional fields
  getEventId() { return this.data.eventid || '' }
  getExpires() { return this.data.expires }
  getProxy() { return this.data.proxy || '' }
  getEmail() { return this.data.email || '' }
  getDtCollected() { return this.data.dtcollected }

  // Format for browser usage
  toBrowserCookie() {
    const cookie = {
      name: this.getName(),
      value: this.getValue(),
      domain: this.getDomain()
    }
    
    const expires = this.getExpires()
    if (expires && expires !== -1) {
      cookie.expires = expires
    }
    
    return cookie
  }

  // Format for API saving
  toApiFormat() {
    return {
      eventid: this.getEventId(),
      proxy: this.getProxy(),
      email: this.getEmail(),
      name: this.getName(),
      value: this.getValue(),
      domain: this.getDomain(),
      expires: this.getExpires() !== -1 ? this.getExpires() : null
    }
  }

  // Basic validation
  isValid() {
    return !!(this.getName() && this.getValue() && this.getDomain())
  }

  // Get all data for debugging
  getRawData() {
    return this.data
  }
}

/**
 * Utility functions for handling arrays of models
 */
export class ModelUtils {
  static createMatchModels(apiData) {
    if (!Array.isArray(apiData)) return []
    return apiData.map(data => new MatchModel(data))
  }

  static createCookieModels(cookieData) {
    if (!Array.isArray(cookieData)) return []
    return cookieData.map(data => new CookieModel(data))
  }

  static createBrowserDataModel(apiData) {
    return new BrowserDataModel(apiData)
  }

  // Filter valid models
  static filterValidMatches(matchModels) {
    return matchModels.filter(model => model.isValid())
  }

  static filterValidCookies(cookieModels) {
    return cookieModels.filter(model => model.isValid())
  }
}

// Export individual models and utility
export { cardDecrypt }