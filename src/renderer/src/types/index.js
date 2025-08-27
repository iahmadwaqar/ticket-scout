// Profile status constants
export const PROFILE_STATUS = Object.freeze({
  IDLE: 'Idle',
  LAUNCHING: 'Launching',
  READY: 'Ready',
  LOGGED_IN: 'LoggedIn',
  NAVIGATING: 'Navigating',
  SCRAPING: 'Scraping',
  SEARCHING_TICKETS: 'SearchingTickets',
  WAITING_FOR_CAPTCHA: 'WaitingForCaptcha',
  IN_QUEUE: 'InQueue',
  RANDOM_BROWSING: 'RandomBrowsing',
  SESSION_EXPIRED: 'SessionExpired',
  RATE_LIMITED: 'RateLimited',
  SUCCESS: 'Success',
  ERROR: 'Error',
  STOPPING: 'Stopping',
  STOPPED: 'Stopped',
  RUNNING: 'Running',
  NEXT: 'Next'
})

// Priority level constants
export const PRIORITY_LEVEL = Object.freeze({
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
})

// Login state constants
export const LOGIN_STATE = Object.freeze({
  LOGGED_IN: 'Logged In',
  LOGGED_OUT: 'Logged Out'
})

// Operational state constants
export const OPERATIONAL_STATE = Object.freeze({
  IDLE: 'idle',
  ACTIVE: 'active',
  ERROR: 'error',
  STOPPING: 'stopping'
})

// Scraping state constants
export const SCRAPING_STATE = Object.freeze({
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
  WAITING_USER: 'waiting_user',
  ERROR: 'error'
})

// Captcha handling constants
export const CAPTCHA_HANDLING = Object.freeze({
  MANUAL: 'manual',
  AUTO: 'auto'
})

// Throttling state constants
export const THROTTLING_STATE = Object.freeze({
  NONE: 'None',
  ACTIVE: 'Active',
  HIGH: 'High'
})

// Log severity constants
export const LOG_SEVERITY = Object.freeze({
  INFO: 'Info',
  WARNING: 'Warning',
  ERROR: 'Error'
})

// Toast variant constants
export const TOAST_VARIANT = Object.freeze({
  DEFAULT: 'default',
  DESTRUCTIVE: 'destructive',
  SUCCESS: 'success'
})

// Profile schema for structure reference
export const ProfileSchema = Object.freeze({
  id: 'string',
  name: 'string',
  status: 'string', // ProfileStatus
  loginState: 'string', // 'Logged In' | 'Logged Out'
  supporterId: 'string',
  password: 'string?', // optional
  cardInfo: 'string',
  expiry: 'string',
  cvv: 'string',
  seats: 'number',
  url: 'string',
  proxy: 'string',
  priority: 'string' // PriorityLevel
})

// Scraping config schema
export const ScrapingConfigSchema = Object.freeze({
  targetTickets: 'number',
  maxRetries: 'number',
  delayBetweenActions: 'number',
  randomBrowsingPages: 'array',
  autoLogin: 'boolean',
  handleCaptcha: 'string' // 'manual' | 'auto'
})

// Enhanced profile schema
export const EnhancedProfileSchema = Object.freeze({
  ...ProfileSchema,
  ticketCount: 'number',
  lastActivity: 'string',
  errorMessage: 'string?', // optional
  operationalState: 'string', // 'idle' | 'active' | 'error' | 'stopping'
  launchedAt: 'string?', // optional
  stoppedAt: 'string?', // optional
  scrapingConfig: 'object?', // optional ScrapingConfig
  lastScrapingActivity: 'string?', // optional
  scrapingState: 'string?', // optional scraping state
  currentPage: 'string?', // optional
  retryCount: 'number?' // optional
})

// System metrics schema
export const SystemMetricsSchema = Object.freeze({
  cpuUsage: 'number',
  memoryUsage: 'number',
  concurrencyLimit: 'number',
  throttlingState: 'string' // 'None' | 'Active' | 'High'
})

// Log entry schema
export const LogEntrySchema = Object.freeze({
  id: 'number',
  timestamp: 'string',
  profileId: 'string', // string | 'Global'
  severity: 'string', // 'Info' | 'Warning' | 'Error'
  message: 'string'
})

// Toast message schema
export const ToastMessageSchema = Object.freeze({
  title: 'string',
  description: 'string?', // optional
  variant: 'string?', // optional 'default' | 'destructive' | 'success'
  duration: 'number?' // optional
})

// Validation functions
export const validateProfile = (profile) => {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Invalid profile object')
  }
  
  const requiredStringFields = ['id', 'name', 'status', 'loginState', 'supporterId', 'cardInfo', 'expiry', 'cvv', 'url', 'proxy', 'priority']
  for (const field of requiredStringFields) {
    if (typeof profile[field] !== 'string') {
      throw new Error(`Profile must have string ${field} property`)
    }
  }
  
  if (typeof profile.seats !== 'number') {
    throw new Error('Profile must have number seats property')
  }
  
  if (profile.password !== undefined && typeof profile.password !== 'string') {
    throw new Error('Profile password must be string if provided')
  }
  
  // Validate status is a valid ProfileStatus
  if (!Object.values(PROFILE_STATUS).includes(profile.status)) {
    throw new Error(`Invalid profile status: ${profile.status}`)
  }
  
  // Validate priority is a valid PriorityLevel
  if (!Object.values(PRIORITY_LEVEL).includes(profile.priority)) {
    throw new Error(`Invalid profile priority: ${profile.priority}`)
  }
  
  // Validate loginState
  if (!Object.values(LOGIN_STATE).includes(profile.loginState)) {
    throw new Error(`Invalid profile loginState: ${profile.loginState}`)
  }
  
  return profile
}

export const validateScrapingConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid scraping config object')
  }
  
  const requiredNumberFields = ['targetTickets', 'maxRetries', 'delayBetweenActions']
  for (const field of requiredNumberFields) {
    if (typeof config[field] !== 'number') {
      throw new Error(`Scraping config must have number ${field} property`)
    }
  }
  
  if (!Array.isArray(config.randomBrowsingPages)) {
    throw new Error('Scraping config must have array randomBrowsingPages property')
  }
  
  if (typeof config.autoLogin !== 'boolean') {
    throw new Error('Scraping config must have boolean autoLogin property')
  }
  
  if (!Object.values(CAPTCHA_HANDLING).includes(config.handleCaptcha)) {
    throw new Error(`Invalid scraping config handleCaptcha: ${config.handleCaptcha}`)
  }
  
  return config
}

export const validateEnhancedProfile = (profile) => {
  // First validate as basic profile
  validateProfile(profile)
  
  if (typeof profile.ticketCount !== 'number') {
    throw new Error('Enhanced profile must have number ticketCount property')
  }
  
  if (typeof profile.lastActivity !== 'string') {
    throw new Error('Enhanced profile must have string lastActivity property')
  }
  
  if (profile.errorMessage !== undefined && typeof profile.errorMessage !== 'string') {
    throw new Error('Enhanced profile errorMessage must be string if provided')
  }
  
  if (!Object.values(OPERATIONAL_STATE).includes(profile.operationalState)) {
    throw new Error(`Invalid enhanced profile operationalState: ${profile.operationalState}`)
  }
  
  if (profile.launchedAt !== undefined && typeof profile.launchedAt !== 'string') {
    throw new Error('Enhanced profile launchedAt must be string if provided')
  }
  
  if (profile.stoppedAt !== undefined && typeof profile.stoppedAt !== 'string') {
    throw new Error('Enhanced profile stoppedAt must be string if provided')
  }
  
  if (profile.scrapingConfig !== undefined) {
    validateScrapingConfig(profile.scrapingConfig)
  }
  
  if (profile.lastScrapingActivity !== undefined && typeof profile.lastScrapingActivity !== 'string') {
    throw new Error('Enhanced profile lastScrapingActivity must be string if provided')
  }
  
  if (profile.scrapingState !== undefined && !Object.values(SCRAPING_STATE).includes(profile.scrapingState)) {
    throw new Error(`Invalid enhanced profile scrapingState: ${profile.scrapingState}`)
  }
  
  if (profile.currentPage !== undefined && typeof profile.currentPage !== 'string') {
    throw new Error('Enhanced profile currentPage must be string if provided')
  }
  
  if (profile.retryCount !== undefined && typeof profile.retryCount !== 'number') {
    throw new Error('Enhanced profile retryCount must be number if provided')
  }
  
  return profile
}

export const validateSystemMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') {
    throw new Error('Invalid system metrics object')
  }
  
  const requiredNumberFields = ['cpuUsage', 'memoryUsage', 'concurrencyLimit']
  for (const field of requiredNumberFields) {
    if (typeof metrics[field] !== 'number') {
      throw new Error(`System metrics must have number ${field} property`)
    }
  }
  
  if (!Object.values(THROTTLING_STATE).includes(metrics.throttlingState)) {
    throw new Error(`Invalid system metrics throttlingState: ${metrics.throttlingState}`)
  }
  
  return metrics
}

export const validateLogEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid log entry object')
  }
  
  if (typeof entry.id !== 'number') {
    throw new Error('Log entry must have number id property')
  }
  
  const requiredStringFields = ['timestamp', 'profileId', 'severity', 'message']
  for (const field of requiredStringFields) {
    if (typeof entry[field] !== 'string') {
      throw new Error(`Log entry must have string ${field} property`)
    }
  }
  
  if (!Object.values(LOG_SEVERITY).includes(entry.severity)) {
    throw new Error(`Invalid log entry severity: ${entry.severity}`)
  }
  
  return entry
}

export const validateToastMessage = (toast) => {
  if (!toast || typeof toast !== 'object') {
    throw new Error('Invalid toast message object')
  }
  
  if (typeof toast.title !== 'string') {
    throw new Error('Toast message must have string title property')
  }
  
  if (toast.description !== undefined && typeof toast.description !== 'string') {
    throw new Error('Toast message description must be string if provided')
  }
  
  if (toast.variant !== undefined && !Object.values(TOAST_VARIANT).includes(toast.variant)) {
    throw new Error(`Invalid toast message variant: ${toast.variant}`)
  }
  
  if (toast.duration !== undefined && typeof toast.duration !== 'number') {
    throw new Error('Toast message duration must be number if provided')
  }
  
  return toast
}