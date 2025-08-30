// Configuration for GoLogin settings

// TicketShop API Configuration
export const TICKETSHOP_API_CONFIG = {
  BASE_URL: 'https://www.ticketsiteshop.co.uk',
  AUTHORIZATION_HEADER: 'ticketsiteshop1432'
}

// Card Decryption Configuration
export const CARD_DECRYPT_CONFIG = {
  SECRET_KEY: 'ticketsiteshopbarrypsafe@1432',
  IV: '6383067782260052'
}

// Default configuration
export const DEFAULT_GOLOGIN_CONFIG = {
  token: ''
}

// Configuration storage keys
export const CONFIG_KEYS = {
  GOLOGIN_TOKEN: 'gologin_token'
}

// Runtime validation for GoLogin configuration
export const validateGoLoginConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid GoLogin config')
  }
  if (typeof config.token !== 'string') {
    throw new Error('GoLogin config token must be a string')
  }
  return config
}

// Structure reference object for GoLogin configuration
export const GoLoginConfigSchema = Object.freeze({
  token: 'string'
})