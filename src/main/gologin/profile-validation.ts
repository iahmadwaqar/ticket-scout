/**
 * Profile Validation and Sanitization Module
 * 
 * This module provides comprehensive validation and sanitization functions
 * for profile data updates from the renderer process, ensuring data integrity
 * and preventing invalid data from entering the system.
 * 
 * Features:
 * - Validation functions for profile data updates
 * - Sanitization for profile fields
 * - Type guards for EnhancedProfile interface
 * - IPC message payload validation
 */

import type { Profile, EnhancedProfile, ProfileStatus, PriorityLevel } from '../../renderer/src/types'
import { logger } from '../logger-service'

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedData?: any
}

/**
 * Profile field validation rules
 */
interface ProfileFieldRules {
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  allowedValues?: readonly string[]
}

/**
 * Profile validation schema
 */
const PROFILE_VALIDATION_SCHEMA: Record<keyof EnhancedProfile, ProfileFieldRules> = {
  id: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  status: {
    required: true,
    type: 'string',
    allowedValues: ['Idle', 'Launching', 'Ready', 'LoggedIn', 'Navigating', 'Scraping', 'Success', 'Error', 'Stopping', 'Stopped'] as const
  },
  loginState: {
    required: true,
    type: 'string',
    allowedValues: ['Logged In', 'Logged Out'] as const
  },
  supporterId: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  password: {
    required: false,
    type: 'string',
    maxLength: 200
  },
  cardInfo: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 500
  },
  expiry: {
    required: true,
    type: 'string',
    pattern: /^(0[1-9]|1[0-2])\/\d{2}$/
  },
  cvv: {
    required: true,
    type: 'string',
    pattern: /^\d{3,4}$/
  },
  seats: {
    required: true,
    type: 'number',
    min: 1,
    max: 10
  },
  url: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    pattern: /^https?:\/\/.+/
  },
  proxy: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 500
  },
  priority: {
    required: true,
    type: 'string',
    allowedValues: ['High', 'Medium', 'Low'] as const
  },
  ticketCount: {
    required: true,
    type: 'number',
    min: 0,
    max: 1000000
  },
  lastActivity: {
    required: true,
    type: 'string',
    minLength: 1
  },
  errorMessage: {
    required: false,
    type: 'string',
    maxLength: 1000
  },
  operationalState: {
    required: true,
    type: 'string',
    allowedValues: ['idle', 'active', 'error', 'stopping'] as const
  },
  launchedAt: {
    required: false,
    type: 'string',
    minLength: 1
  },
  stoppedAt: {
    required: false,
    type: 'string',
    minLength: 1
  }
}

/**
 * Sanitize a string value by trimming whitespace and removing potentially harmful characters
 * @param value - The string value to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
function sanitizeString(value: string, maxLength?: number): string {
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
 * Sanitize a number value by ensuring it's within bounds
 * @param value - The number value to sanitize
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized number
 */
function sanitizeNumber(value: number, min?: number, max?: number): number {
  let sanitized = value
  
  // Ensure it's a finite number
  if (!Number.isFinite(sanitized)) {
    sanitized = 0
  }
  
  // Apply bounds
  if (min !== undefined && sanitized < min) {
    sanitized = min
  }
  if (max !== undefined && sanitized > max) {
    sanitized = max
  }
  
  return sanitized
}

/**
 * Validate and sanitize a single profile field
 * @param fieldName - Name of the field being validated
 * @param value - Value to validate
 * @param rules - Validation rules for the field
 * @returns Validation result with sanitized data
 */
function validateProfileField(fieldName: string, value: any, rules: ProfileFieldRules): ValidationResult {
  try {
    // Check if required field is missing
    if (rules.required && (value === undefined || value === null)) {
      return {
        isValid: false,
        error: `${fieldName} is required`
      }
    }
    
    // Skip validation for optional undefined fields
    if (!rules.required && (value === undefined || value === null)) {
      return {
        isValid: true,
        sanitizedData: value
      }
    }
    
    // Type validation
    if (rules.type === 'string') {
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: `${fieldName} must be a string`
        }
      }
      
      const sanitized = sanitizeString(value, rules.maxLength)
      
      // Length validation
      if (rules.minLength && sanitized.length < rules.minLength) {
        return {
          isValid: false,
          error: `${fieldName} must be at least ${rules.minLength} characters long`
        }
      }
      
      if (rules.maxLength && sanitized.length > rules.maxLength) {
        return {
          isValid: false,
          error: `${fieldName} must be no more than ${rules.maxLength} characters long`
        }
      }
      
      // Pattern validation
      if (rules.pattern && !rules.pattern.test(sanitized)) {
        return {
          isValid: false,
          error: `${fieldName} format is invalid`
        }
      }
      
      // Allowed values validation
      if (rules.allowedValues && !rules.allowedValues.includes(sanitized as any)) {
        return {
          isValid: false,
          error: `${fieldName} must be one of: ${rules.allowedValues.join(', ')}`
        }
      }
      
      return {
        isValid: true,
        sanitizedData: sanitized
      }
    }
    
    if (rules.type === 'number') {
      if (typeof value !== 'number') {
        return {
          isValid: false,
          error: `${fieldName} must be a number`
        }
      }
      
      const sanitized = sanitizeNumber(value, rules.min, rules.max)
      
      // Range validation
      if (rules.min !== undefined && sanitized < rules.min) {
        return {
          isValid: false,
          error: `${fieldName} must be at least ${rules.min}`
        }
      }
      
      if (rules.max !== undefined && sanitized > rules.max) {
        return {
          isValid: false,
          error: `${fieldName} must be no more than ${rules.max}`
        }
      }
      
      return {
        isValid: true,
        sanitizedData: sanitized
      }
    }
    
    return {
      isValid: true,
      sanitizedData: value
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Type guard to check if an object is a valid Profile
 * @param obj - Object to check
 * @returns True if object is a valid Profile
 */
export function isProfile(obj: any): obj is Profile {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  
  const requiredFields: (keyof Profile)[] = [
    'id', 'name', 'status', 'loginState', 'supporterId', 
    'cardInfo', 'expiry', 'cvv', 'seats', 'url', 'proxy', 'priority'
  ]
  
  for (const field of requiredFields) {
    const rules = PROFILE_VALIDATION_SCHEMA[field]
    const result = validateProfileField(field, obj[field], rules)
    if (!result.isValid) {
      return false
    }
  }
  
  return true
}

/**
 * Type guard to check if an object is a valid EnhancedProfile
 * @param obj - Object to check
 * @returns True if object is a valid EnhancedProfile
 */
export function isEnhancedProfile(obj: any): obj is EnhancedProfile {
  if (!isProfile(obj)) {
    return false
  }
  
  const enhancedFields: (keyof EnhancedProfile)[] = [
    'ticketCount', 'lastActivity', 'operationalState'
  ]
  
  for (const field of enhancedFields) {
    const rules = PROFILE_VALIDATION_SCHEMA[field]
    const result = validateProfileField(field, obj[field], rules)
    if (!result.isValid) {
      return false
    }
  }
  
  return true
}

/**
 * Validate and sanitize profile data updates from renderer
 * @param updates - Partial profile data to validate
 * @returns Validation result with sanitized data
 */
export function validateProfileUpdates(updates: Partial<EnhancedProfile>): ValidationResult {
  try {
    // Check for empty updates
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return {
        isValid: false,
        error: 'Updates object cannot be empty'
      }
    }
    
    const sanitizedUpdates: Partial<EnhancedProfile> = {}
    const errors: string[] = []
    
    // Validate each field in the updates
    for (const [fieldName, value] of Object.entries(updates)) {
      if (fieldName in PROFILE_VALIDATION_SCHEMA) {
        const rules = PROFILE_VALIDATION_SCHEMA[fieldName as keyof EnhancedProfile]
        const result = validateProfileField(fieldName, value, rules)
        
        if (!result.isValid) {
          errors.push(result.error!)
        } else {
          sanitizedUpdates[fieldName as keyof EnhancedProfile] = result.sanitizedData
        }
      } else {
        errors.push(`Unknown field: ${fieldName}`)
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
      sanitizedData: sanitizedUpdates
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}

/**
 * Validate a complete profile object
 * @param profile - Profile object to validate
 * @returns Validation result with sanitized data
 */
export function validateCompleteProfile(profile: any): ValidationResult {
  try {
    if (!profile || typeof profile !== 'object') {
      return {
        isValid: false,
        error: 'Profile must be a valid object'
      }
    }
    
    const sanitizedProfile: Partial<EnhancedProfile> = {}
    const errors: string[] = []
    
    // Validate all required fields
    for (const [fieldName, rules] of Object.entries(PROFILE_VALIDATION_SCHEMA)) {
      const value = profile[fieldName]
      const result = validateProfileField(fieldName, value, rules)
      
      if (!result.isValid) {
        errors.push(result.error!)
      } else {
        sanitizedProfile[fieldName as keyof EnhancedProfile] = result.sanitizedData
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
      sanitizedData: sanitizedProfile as EnhancedProfile
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Profile validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}

/**
 * Validate IPC message payload for profile operations
 * @param payload - IPC message payload to validate
 * @param expectedFields - Array of expected field names
 * @returns Validation result
 */
export function validateIPCPayload(payload: any, expectedFields: string[]): ValidationResult {
  try {
    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        error: 'IPC payload must be a valid object'
      }
    }
    
    const errors: string[] = []
    
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
 * Validate profile ID format and sanitize
 * @param profileId - Profile ID to validate
 * @returns Validation result with sanitized profile ID
 */
export function validateProfileId(profileId: any): ValidationResult {
  try {
    if (typeof profileId !== 'string') {
      return {
        isValid: false,
        error: 'Profile ID must be a string'
      }
    }
    
    const sanitized = sanitizeString(profileId, 100)
    
    if (sanitized.length === 0) {
      return {
        isValid: false,
        error: 'Profile ID cannot be empty'
      }
    }
    
    // Check format (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      return {
        isValid: false,
        error: 'Profile ID can only contain letters, numbers, underscores, and hyphens'
      }
    }
    
    return {
      isValid: true,
      sanitizedData: sanitized
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Profile ID validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}

/**
 * Validate timestamp format (ISO 8601)
 * @param timestamp - Timestamp to validate
 * @returns Validation result
 */
export function validateTimestamp(timestamp: any): ValidationResult {
  try {
    if (typeof timestamp !== 'string') {
      return {
        isValid: false,
        error: 'Timestamp must be a string'
      }
    }
    
    const sanitized = sanitizeString(timestamp)
    
    if (sanitized.length === 0) {
      return {
        isValid: false,
        error: 'Timestamp cannot be empty'
      }
    }
    
    // Validate ISO 8601 format
    const date = new Date(sanitized)
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Timestamp must be a valid ISO 8601 date string'
      }
    }
    
    return {
      isValid: true,
      sanitizedData: sanitized
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Timestamp validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}

/**
 * Validate LaunchAllConfig object
 * @param config - LaunchAllConfig object to validate
 * @returns Validation result with sanitized data
 */
export function validateLaunchAllConfig(config: any): ValidationResult {
  try {
    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        error: 'Config must be a valid object'
      }
    }

    const errors: string[] = []
    const sanitizedConfig: any = {}

    // Validate start field
    if (typeof config.start !== 'number' || !Number.isInteger(config.start) || config.start < 1) {
      errors.push('start must be a positive integer')
    } else {
      sanitizedConfig.start = Math.max(1, Math.floor(config.start))
    }

    // Validate count field
    if (typeof config.count !== 'number' || !Number.isInteger(config.count) || config.count < 1) {
      errors.push('count must be a positive integer')
    } else {
      sanitizedConfig.count = Math.max(1, Math.min(1000, Math.floor(config.count))) // Cap at 1000
    }

    // Validate domain field
    if (typeof config.domain !== 'string' || config.domain.trim() === '') {
      errors.push('domain must be a non-empty string')
    } else {
      sanitizedConfig.domain = sanitizeString(config.domain, 200)
    }

    // Validate seats field
    if (typeof config.seats !== 'number' || !Number.isInteger(config.seats) || config.seats < 0) {
      errors.push('seats must be a non-negative integer')
    } else {
      sanitizedConfig.seats = Math.max(0, Math.min(10, Math.floor(config.seats))) // Cap at 10
    }

    // Validate model field
    if (typeof config.model !== 'string' || config.model.trim() === '') {
      errors.push('model must be a non-empty string')
    } else {
      sanitizedConfig.model = sanitizeString(config.model, 100)
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

/**
 * Validate toast message object
 * @param toast - Toast message object to validate
 * @returns Validation result with sanitized data
 */
export function validateToastMessage(toast: any): ValidationResult {
  try {
    if (!toast || typeof toast !== 'object') {
      return {
        isValid: false,
        error: 'Toast must be a valid object'
      }
    }

    const errors: string[] = []
    const sanitizedToast: any = {}

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
 * Validate log entry parameters
 * @param profileId - Profile ID (can be 'Global')
 * @param severity - Log severity level
 * @param message - Log message
 * @returns Validation result with sanitized data
 */
export function validateLogEntry(profileId: any, severity: any, message: any): ValidationResult {
  try {
    const errors: string[] = []
    const sanitizedData: any = {}

    // Validate profileId (can be 'Global' or a valid profile ID)
    if (profileId === 'Global') {
      sanitizedData.profileId = 'Global'
    } else {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        errors.push(`profileId: ${profileIdValidation.error}`)
      } else {
        sanitizedData.profileId = profileIdValidation.sanitizedData
      }
    }

    // Validate severity
    const validSeverities = ['Info', 'Warning', 'Error']
    if (!validSeverities.includes(severity)) {
      errors.push(`severity must be one of: ${validSeverities.join(', ')}`)
    } else {
      sanitizedData.severity = severity
    }

    // Validate message
    if (typeof message !== 'string' || message.trim() === '') {
      errors.push('message must be a non-empty string')
    } else {
      sanitizedData.message = sanitizeString(message, 1000)
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors.join('; ')
      }
    }

    return {
      isValid: true,
      sanitizedData
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Log entry validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    }
  }
}

/**
 * Log validation errors for debugging purposes
 * @param context - Context where validation failed
 * @param validationResult - The validation result containing errors
 */
export function logValidationError(context: string, validationResult: ValidationResult): void {
  if (!validationResult.isValid && validationResult.error) {
    logger.error('Global', `Validation failed in ${context}: ${validationResult.error}`)
  }
}