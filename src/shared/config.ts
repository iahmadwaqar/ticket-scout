// Configuration interface for GoLogin settings
export interface GoLoginConfig {
  token: string
}

// Default configuration
export const DEFAULT_GOLOGIN_CONFIG: GoLoginConfig = {
  token: ''
}

// Configuration storage keys
export const CONFIG_KEYS = {
  GOLOGIN_TOKEN: 'gologin_token'
} as const
