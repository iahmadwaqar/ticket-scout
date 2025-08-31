/**
 * Status Constants and Utility Functions
 * 
 * This file contains all status constants and utility functions for:
 * - Profile statuses
 * - Login statuses  
 * - Operational statuses
 * - Cookie statuses
 * 
 * Also includes utility functions to check if certain operations
 * are allowed based on the current status.
 */

// =============================================================================
// PROFILE STATUSES
// =============================================================================
export const PROFILE_STATUSES = {
  // Basic states
  IDLE: 'Idle',
  LAUNCHING: 'Launching',
  READY: 'Running',
  ACTIVE: 'Active',
  STARTING: 'Starting',
  STOPPING: 'Stopping',
  STOPPED: 'Stopped',
  CLOSING: 'Closing',
  CLOSED: 'Closed',
  
  // Authentication states
  LOGGED_IN: 'LoggedIn',
  LOGGING_IN: 'LoggingIn',
  LOGIN_FAILED: 'LoginFailed',
  SESSION_EXPIRED: 'SessionExpired',
  LOGGED_OUT: 'LoggedOut',
  
  // Navigation and operation states
  NAVIGATING: 'Navigating',
  SCRAPING: 'Scraping',
  SEARCHING_TICKETS: 'SearchingTickets',
  RANDOM_BROWSING: 'RandomBrowsing',
  IN_QUEUE: 'InQueue',
  WAITING_FOR_CAPTCHA: 'WaitingForCaptcha',
  RATE_LIMITED: 'RateLimited',
  
  // Completion states
  SUCCESS: 'Success',
  COMPLETED: 'Completed',
  
  // Error states
  ERROR: 'Error',
  ERROR_LAUNCHING: 'Error Launching',
  ERROR_CLOSING: 'Error Closing',
  ERROR_NAVIGATING: 'Error Navigating',
  ERROR_SCRAPING: 'Error Scraping',
  ERROR_LOGIN: 'Error Login',
  
  // Cookie related states
  COOKIES_LOADING: 'Cookies Loading',
  COOKIES_LOADED: 'Cookies Loaded',
  COOKIES_SAVING: 'Cookies Saving',
  COOKIES_SAVED: 'Cookies Saved',
  COOKIES_FAILED: 'Cookies Failed',
  
  // Additional operational states
  PAUSED: 'Paused',
  RESUMING: 'Resuming',
  RESTARTING: 'Restarting',
  UPDATING: 'Updating',
  INITIALIZING: 'Initializing'
}

// =============================================================================
// LOGIN STATUSES  
// =============================================================================
export const LOGIN_STATUSES = {
  LOGGED_OUT: 'LoggedOut',
  LOGGING_IN: 'LoggingIn', 
  LOGGED_IN: 'LoggedIn',
  LOGIN_FAILED: 'LoginFailed',
  SESSION_EXPIRED: 'SessionExpired',
  SESSION_INVALID: 'SessionInvalid',
  AUTHENTICATION_REQUIRED: 'AuthenticationRequired',
  TWO_FACTOR_REQUIRED: 'TwoFactorRequired',
  CAPTCHA_REQUIRED: 'CaptchaRequired'
}

// =============================================================================
// OPERATIONAL STATUSES
// =============================================================================
export const OPERATIONAL_STATUSES = {
  IDLE: 'idle',
  ACTIVE: 'active', 
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  ERROR: 'error',
  PAUSED: 'paused',
  INITIALIZING: 'initializing'
}

// =============================================================================
// COOKIE STATUSES
// =============================================================================
export const COOKIE_STATUSES = {
  FRESH: 'Fresh',
  EXPIRED: 'Expired', 
  INVALID: 'Invalid',
  LOADING: 'Loading',
  SAVING: 'Saving',
  SAVED: 'Saved',
  FAILED: 'Failed',
  NOT_AVAILABLE: 'NotAvailable',
  UPDATING: 'Updating'
}

// =============================================================================
// STATUS GROUPS FOR UTILITY FUNCTIONS
// =============================================================================

// Statuses that allow launching
const LAUNCHABLE_STATUSES = [
  PROFILE_STATUSES.IDLE,
  PROFILE_STATUSES.STOPPED, 
  PROFILE_STATUSES.ERROR,
  PROFILE_STATUSES.ERROR_LAUNCHING,
  PROFILE_STATUSES.ERROR_CLOSING,
  PROFILE_STATUSES.ERROR_NAVIGATING,
  PROFILE_STATUSES.ERROR_SCRAPING,
  PROFILE_STATUSES.ERROR_LOGIN,
  PROFILE_STATUSES.CLOSED,
  PROFILE_STATUSES.COMPLETED,
  PROFILE_STATUSES.SUCCESS
]

// Statuses that allow stopping
const STOPPABLE_STATUSES = [
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.LOGGING_IN,
  PROFILE_STATUSES.NAVIGATING,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.IN_QUEUE,
  PROFILE_STATUSES.WAITING_FOR_CAPTCHA,
  PROFILE_STATUSES.SESSION_EXPIRED,
  PROFILE_STATUSES.RATE_LIMITED,
  PROFILE_STATUSES.LAUNCHING,
  PROFILE_STATUSES.PAUSED,
  PROFILE_STATUSES.COOKIES_LOADING,
  PROFILE_STATUSES.COOKIES_SAVING,
  PROFILE_STATUSES.RESUMING,
  PROFILE_STATUSES.UPDATING,
  PROFILE_STATUSES.INITIALIZING
]

// Statuses that allow closing
const CLOSEABLE_STATUSES = [
  PROFILE_STATUSES.IDLE,
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.STOPPED,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.NAVIGATING,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.IN_QUEUE,
  PROFILE_STATUSES.WAITING_FOR_CAPTCHA,
  PROFILE_STATUSES.SESSION_EXPIRED,
  PROFILE_STATUSES.RATE_LIMITED,
  PROFILE_STATUSES.ERROR,
  PROFILE_STATUSES.ERROR_LAUNCHING,
  PROFILE_STATUSES.ERROR_CLOSING,
  PROFILE_STATUSES.ERROR_NAVIGATING,
  PROFILE_STATUSES.ERROR_SCRAPING,
  PROFILE_STATUSES.ERROR_LOGIN,
  PROFILE_STATUSES.LOGIN_FAILED,
  PROFILE_STATUSES.SUCCESS,
  PROFILE_STATUSES.COMPLETED,
  PROFILE_STATUSES.PAUSED,
  PROFILE_STATUSES.COOKIES_LOADED,
  PROFILE_STATUSES.COOKIES_SAVED,
  PROFILE_STATUSES.COOKIES_FAILED
]

// Statuses that allow login operations
const LOGINABLE_STATUSES = [
  LOGIN_STATUSES.LOGGED_OUT,
  LOGIN_STATUSES.LOGIN_FAILED,
  LOGIN_STATUSES.SESSION_EXPIRED,
  LOGIN_STATUSES.SESSION_INVALID,
  LOGIN_STATUSES.AUTHENTICATION_REQUIRED,
  LOGIN_STATUSES.TWO_FACTOR_REQUIRED
]

// Statuses that allow navigation
const NAVIGATABLE_STATUSES = [
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.COOKIES_LOADED
]

// Statuses that allow scraping
const SCRAPEABLE_STATUSES = [
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.NAVIGATING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.IN_QUEUE
]

// Statuses that allow ticket searching
const SEARCHABLE_STATUSES = [
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.NAVIGATING,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.RANDOM_BROWSING
]

// Statuses that allow pausing
const PAUSEABLE_STATUSES = [
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.IN_QUEUE,
  PROFILE_STATUSES.NAVIGATING
]

// Statuses that allow resuming
const RESUMEABLE_STATUSES = [
  PROFILE_STATUSES.PAUSED,
  PROFILE_STATUSES.STOPPED
]

// Statuses that allow restarting
const RESTARTABLE_STATUSES = [
  PROFILE_STATUSES.ERROR,
  PROFILE_STATUSES.ERROR_LAUNCHING,
  PROFILE_STATUSES.ERROR_NAVIGATING,
  PROFILE_STATUSES.ERROR_SCRAPING,
  PROFILE_STATUSES.ERROR_LOGIN,
  PROFILE_STATUSES.LOGIN_FAILED,
  PROFILE_STATUSES.SESSION_EXPIRED,
  PROFILE_STATUSES.STOPPED,
  PROFILE_STATUSES.COMPLETED,
  PROFILE_STATUSES.SUCCESS,
  PROFILE_STATUSES.COOKIES_FAILED
]

// Statuses that allow UI expansion/details view
const EXPANDABLE_STATUSES = [
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.IN_QUEUE,
  PROFILE_STATUSES.WAITING_FOR_CAPTCHA,
  PROFILE_STATUSES.ERROR,
  PROFILE_STATUSES.PAUSED
]

// Statuses that allow cookie operations
const COOKIE_SAVEABLE_STATUSES = [
  PROFILE_STATUSES.READY,
  PROFILE_STATUSES.ACTIVE,
  PROFILE_STATUSES.LOGGED_IN,
  PROFILE_STATUSES.NAVIGATING,
  PROFILE_STATUSES.SCRAPING,
  PROFILE_STATUSES.SEARCHING_TICKETS,
  PROFILE_STATUSES.RANDOM_BROWSING,
  PROFILE_STATUSES.IN_QUEUE,
  PROFILE_STATUSES.SUCCESS,
  PROFILE_STATUSES.COMPLETED,
  PROFILE_STATUSES.COOKIES_LOADED
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a profile can be launched based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be launched
 */
export const isLaunchable = (status) => {
  return LAUNCHABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be stopped based on its current status
 * @param {string} status - Current profile status  
 * @returns {boolean} True if profile can be stopped
 */
export const isStoppable = (status) => {
  return STOPPABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be closed based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be closed
 */
export const isCloseable = (status) => {
  return CLOSEABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can perform login operations based on both login status and profile status
 * @param {string} loginStatus - Current login status
 * @param {string} profileStatus - Current profile status (optional, for enhanced validation)
 * @returns {boolean} True if profile can perform login
 */
export const canLogin = (loginStatus, profileStatus = null) => {
  // Check if login status allows login
  const loginStatusValid = LOGINABLE_STATUSES.includes(loginStatus)
  
  // If no profile status provided, only check login status (backward compatibility)
  if (!profileStatus) {
    return loginStatusValid
  }
  
  // Check if profile status is in a good condition for login
  const profileStatusValid = [
    PROFILE_STATUSES.READY,
    PROFILE_STATUSES.ACTIVE,
    PROFILE_STATUSES.IDLE,
    PROFILE_STATUSES.LOGGED_IN,
    PROFILE_STATUSES.SESSION_EXPIRED,
    PROFILE_STATUSES.LOGIN_FAILED,
    PROFILE_STATUSES.ERROR_LOGIN,
    PROFILE_STATUSES.NAVIGATING,
    PROFILE_STATUSES.COOKIES_LOADED
  ].includes(profileStatus)
  
  // Check that profile is not in problematic states
  const profileNotInBadState = ![
    PROFILE_STATUSES.LAUNCHING,
    PROFILE_STATUSES.STOPPING,
    PROFILE_STATUSES.CLOSING,
    PROFILE_STATUSES.STOPPED,
    PROFILE_STATUSES.CLOSED,
    PROFILE_STATUSES.ERROR,
    PROFILE_STATUSES.ERROR_LAUNCHING,
    PROFILE_STATUSES.ERROR_CLOSING,
    PROFILE_STATUSES.ERROR_NAVIGATING,
    PROFILE_STATUSES.ERROR_SCRAPING,
    PROFILE_STATUSES.COOKIES_LOADING,
    PROFILE_STATUSES.COOKIES_SAVING,
    PROFILE_STATUSES.UPDATING,
    PROFILE_STATUSES.INITIALIZING,
    PROFILE_STATUSES.RESUMING,
    PROFILE_STATUSES.RESTARTING
  ].includes(profileStatus)
  
  return loginStatusValid && profileStatusValid && profileNotInBadState
}

/**
 * Check if a profile can navigate to URLs based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can navigate
 */
export const canNavigate = (status) => {
  return NAVIGATABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can perform scraping based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can scrape
 */
export const canScrape = (status) => {
  return SCRAPEABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can search for tickets based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can search tickets
 */
export const canSearchTickets = (status) => {
  return SEARCHABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be paused based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be paused
 */
export const canPause = (status) => {
  return PAUSEABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be resumed based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be resumed
 */
export const canResume = (status) => {
  return RESUMEABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be restarted based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be restarted
 */
export const canRestart = (status) => {
  return RESTARTABLE_STATUSES.includes(status)
}

/**
 * Check if a profile can be expanded in UI based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile can be expanded/detailed view
 */
export const canExpand = (status) => {
  return EXPANDABLE_STATUSES.includes(status)
}

/**
 * Check if cookies can be saved for a profile based on its current status
 * @param {string} status - Current profile status
 * @returns {boolean} True if cookies can be saved
 */
export const canSaveCookies = (status) => {
  return COOKIE_SAVEABLE_STATUSES.includes(status)
}

/**
 * Check if a profile is currently logged in
 * @param {string} status - Current profile status
 * @returns {boolean} True if profile is logged in
 */
export const isLoggedIn = (status) => {
  return status === PROFILE_STATUSES.LOGGED_IN
}

// =============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a status represents an error state
 * @param {string} status - Status to check
 * @returns {boolean} True if status is an error state
 */
export const isErrorStatus = (status) => {
  return status.startsWith('Error') || 
         status === PROFILE_STATUSES.LOGIN_FAILED ||
         status === PROFILE_STATUSES.COOKIES_FAILED
}

/**
 * Check if a status represents an active/working state
 * @param {string} status - Status to check
 * @returns {boolean} True if status represents active work
 */
export const isActiveStatus = (status) => {
  return [
    PROFILE_STATUSES.ACTIVE,
    PROFILE_STATUSES.LAUNCHING,
    PROFILE_STATUSES.LOGGED_IN,
    PROFILE_STATUSES.LOGGING_IN,
    PROFILE_STATUSES.NAVIGATING,
    PROFILE_STATUSES.SCRAPING,
    PROFILE_STATUSES.SEARCHING_TICKETS,
    PROFILE_STATUSES.RANDOM_BROWSING,
    PROFILE_STATUSES.IN_QUEUE,
    PROFILE_STATUSES.COOKIES_LOADING,
    PROFILE_STATUSES.COOKIES_SAVING,
    PROFILE_STATUSES.RESUMING,
    PROFILE_STATUSES.RESTARTING
  ].includes(status)
}

/**
 * Check if a status represents a completed state
 * @param {string} status - Status to check
 * @returns {boolean} True if status represents completion
 */
export const isCompletedStatus = (status) => {
  return [
    PROFILE_STATUSES.SUCCESS,
    PROFILE_STATUSES.COMPLETED,
    PROFILE_STATUSES.STOPPED,
    PROFILE_STATUSES.CLOSED,
    PROFILE_STATUSES.COOKIES_SAVED
  ].includes(status)
}

/**
 * Check if a status represents a waiting/idle state
 * @param {string} status - Status to check
 * @returns {boolean} True if status represents waiting/idle
 */
export const isWaitingStatus = (status) => {
  return [
    PROFILE_STATUSES.IDLE,
    PROFILE_STATUSES.READY,
    PROFILE_STATUSES.WAITING_FOR_CAPTCHA,
    PROFILE_STATUSES.PAUSED,
    PROFILE_STATUSES.SESSION_EXPIRED,
    PROFILE_STATUSES.RATE_LIMITED
  ].includes(status)
}

/**
 * Get the operational status based on profile status
 * @param {string} profileStatus - Current profile status
 * @returns {string} Corresponding operational status
 */
export const getOperationalStatus = (profileStatus) => {
  if (isErrorStatus(profileStatus)) {
    return OPERATIONAL_STATUSES.ERROR
  }
  
  if (isActiveStatus(profileStatus)) {
    return OPERATIONAL_STATUSES.ACTIVE
  }
  
  if (profileStatus === PROFILE_STATUSES.STOPPING) {
    return OPERATIONAL_STATUSES.STOPPING
  }
  
  if (profileStatus === PROFILE_STATUSES.PAUSED) {
    return OPERATIONAL_STATUSES.PAUSED
  }
  
  if (profileStatus === PROFILE_STATUSES.INITIALIZING) {
    return OPERATIONAL_STATUSES.INITIALIZING
  }
  
  if (isCompletedStatus(profileStatus) || isWaitingStatus(profileStatus)) {
    return OPERATIONAL_STATUSES.IDLE
  }
  
  return OPERATIONAL_STATUSES.IDLE
}