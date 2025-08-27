import { logger } from './logger-service.js'

/**
 * Sanitize a string value by trimming whitespace and removing potentially harmful characters
 * @param value - The string value to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
function sanitizeString(value, maxLength) {
  let sanitized = value.trim()
  
  // Remove null bytes and control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}


/**
 * Validate toast message object
 * @param toast - Toast message object to validate
 * @returns Validation result with sanitized data
 */
export function validateToastMessage(toast) {
  try {
    if (!toast || typeof toast !== 'object') {
      return {
        isValid: false,
        error: 'Toast must be a valid object'
      }
    }

    const errors = []
    const sanitizedToast = {}

    // Validate required title field
    if (!toast.title || typeof toast.title !== 'string' || toast.title.trim() === '') {
      errors.push('title is required and must be a non-empty string')
    } else {
      sanitizedToast.title = sanitizeString(toast.title, 200)
    }

    // Validate optional description field
    if (toast.description !== undefined) {
      if (typeof toast.description !== 'string') {
        errors.push('description must be a string')
      } else {
        sanitizedToast.description = sanitizeString(toast.description, 500)
      }
    }

    // Validate optional variant field
    if (toast.variant !== undefined) {
      const validVariants = ['default', 'destructive', 'success']
      if (!validVariants.includes(toast.variant)) {
        errors.push(`variant must be one of: ${validVariants.join(', ')}`)
      } else {
        sanitizedToast.variant = toast.variant
      }
    }

    // Validate optional duration field
    if (toast.duration !== undefined) {
      if (typeof toast.duration !== 'number' || toast.duration < 0) {
        errors.push('duration must be a non-negative number')
      } else {
        sanitizedToast.duration = Math.max(0, Math.min(30000, toast.duration)) // Cap at 30 seconds
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors.join('; ')
      }
    }

    return {
      isValid: true,
      sanitizedData: sanitizedToast
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Toast validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}


/**
 * Validate IPC message payload for profile operations
 * @param payload - IPC message payload to validate
 * @param expectedFields - Array of expected field names
 * @returns Validation result
 */
export function validateIPCPayload(payload, expectedFields) {
  try {
    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        error: 'IPC payload must be a valid object'
      }
    }
    
    const errors = []
    
    // Check for required fields
    for (const field of expectedFields) {
      if (!(field in payload)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
    
    // Check for unexpected fields (security measure)
    const allowedFields = [...expectedFields, 'timestamp', 'requestId'] // Allow common metadata fields
    for (const field of Object.keys(payload)) {
      if (!allowedFields.includes(field)) {
        errors.push(`Unexpected field: ${field}`)
      }
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors.join('; ')
      }
    }
    
    return {
      isValid: true,
      sanitizedData: payload
    }
  } catch (error) {
    return {
      isValid: false,
      error: `IPC payload validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}


/**
 * Log validation errors for debugging purposes
 * @param context - Context where validation failed
 * @param validationResult - The validation result containing errors
 */
export function logValidationError(context, validationResult) {
  if (!validationResult.isValid && validationResult.error) {
    logger.error('Global', `Validation failed in ${context}: ${validationResult.error}`)
  }
}


/**
 * Validate LaunchAllConfig object
 * @param config - LaunchAllConfig object to validate
 * @returns Validation result with sanitized data
 */
export function validateLaunchAllConfig(config) {
  try {
    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        error: 'Config must be a valid object'
      }
    }

    const errors = []
    const sanitizedConfig = {}

    // Validate start field
    if (typeof config.startProfile !== 'number' || !Number.isInteger(config.startProfile) || config.startProfile < 0) {
      errors.push('startProfile must be a positive integer')
    } else {
      sanitizedConfig.startProfile = Math.max(0, Math.floor(config.startProfile))
    }

    // Validate count field
    if (typeof config.profileCount !== 'number' || !Number.isInteger(config.profileCount) || config.profileCount < 1) {
      errors.push('profileCount must be a positive integer')
    } else {
      sanitizedConfig.profileCount = Math.max(1, Math.min(1000, Math.floor(config.profileCount))) // Cap at 1000
    }

    // Validate domain field
    if (typeof config.club !== 'string' || config.club.trim() === '') {
      errors.push('club must be a non-empty string')
    } else {
      sanitizedConfig.club = sanitizeString(config.club, 200)
    }

    // Validate seats field
    if (typeof config.seats !== 'number' || !Number.isInteger(config.seats) || config.seats < 0) {
      errors.push('seats must be a non-negative integer')
    } else {
      sanitizedConfig.seats = Math.max(0, Math.min(10, Math.floor(config.seats))) // Cap at 10
    }

    // Validate cookies field
    if (typeof config.cookies !== 'boolean') {
      errors.push('cookies must be a boolean')
    } else {
      sanitizedConfig.cookies = config.cookies
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors.join('; ')
      }
    }

    return {
      isValid: true,
      sanitizedData: sanitizedConfig
    }
  } catch (error) {
    return {
      isValid: false,
      error: `LaunchAllConfig validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}
