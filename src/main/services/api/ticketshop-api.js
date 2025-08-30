import { logger } from '../../utils/logger-service.js'
import { TICKETSHOP_API_CONFIG } from '../../../shared/config.js'

export class TicketShopApiService {
  constructor() {
    this.baseUrl = TICKETSHOP_API_CONFIG.BASE_URL
    this.authHeader = TICKETSHOP_API_CONFIG.AUTHORIZATION_HEADER
  }

  async domainInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/listdomains`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader
        }
      })
      return await response.json()
    } catch (error) {
      logger.error('API', `domainInfo failed: ${error.message}`)
      throw error
    }
  }

  async matchData(searchdomain, email = null) {
    try {
      const params = new URLSearchParams({ domain: searchdomain })
      if (email) {
        params.append('email', email)
      }

      const response = await fetch(`${this.baseUrl}/allusers?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader
        }
      })
      return await response.json()
    } catch (error) {
      logger.error('API', `matchData failed: ${error.message}`)
      throw error
    }
  }

  async eventInfo(domain = null) {
    try {
      const params = new URLSearchParams()
      if (domain) {
        params.append('domain', domain)
      }

      const response = await fetch(`${this.baseUrl}/browserdata?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader
        }
      })
      return await response.json()
    } catch (error) {
      logger.error('API', `eventInfo failed: ${error.message}`)
      throw error
    }
  }

  async getCookies() {
    try {
      const response = await fetch(`${this.baseUrl}/cookies`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader
        }
      })
      const cookiesdata = await response.json()
      return cookiesdata || []
    } catch (error) {
      logger.error('API', `getCookies failed: ${error.message}`)
      throw error
    }
  }

  async saveCookies(cookies) {
    try {
      const response = await fetch(`${this.baseUrl}/updatecookies`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cookies: cookies })
      })
      return await response.json()
    } catch (error) {
      logger.error('API', `saveCookies failed: ${error.message}`)
      throw error
    }
  }
}

export const ticketShopApi = new TicketShopApiService()