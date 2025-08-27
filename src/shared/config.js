// Configuration for GoLogin settings

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