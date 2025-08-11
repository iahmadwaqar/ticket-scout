/**
 * Error Handler - Comprehensive error handling for profile operations
 * 
 * This file contains the ErrorHandler class with methods for different error types
 * and comprehensive error handling for launch, stop, and close operations.
 * 
 * Features:
 * - ErrorHandler class with methods for different error types
 * - Structured error handling with appropriate logging levels
 * - Profile status updates based on error types
 * - Toast notifications for user feedback
 * - Error classification and recovery strategies
 */

import { logger } from '../logger-service'
import { ProfileStore } from './profile-store'
import type { EnhancedProfile, ToastMessage } from '../../renderer/src/types'
import { sendToast } from '../service-handlers'
import { BrowserWindow } from 'electron'

/**
 * Error types for classification
 */
export enum ErrorType {
  LAUNCH_ERROR = 'LAUNCH_ERROR',
  STOP_ERROR = 'STOP_ERROR',
  CLOSE_ERROR = 'CLOSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORE_ERROR = 'STORE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Error handling result interface
 */
export interface ErrorHandlingResult {
  handled: boolean
  shouldRetry: boolean
  profileKeptInStore: boolean
  message: string
}

/**
 * Error context interface for additional error information
 */
export interface ErrorContext {
  profileId: string
  operation: 'launch' | 'stop' | 'close'
  profileName?: string
  additionalInfo?: Record<string, any>
}

/**
 * Comprehensive error handler for profile operations with classification and recovery
 * 
 * This class provides centralized error handling for all profile operations including
 * launch, stop, and close operations. It features:
 * - Error classification by type and severity
 * - Automatic retry recommendations based on error characteristics
 * - Profile status updates with appropriate error states
 * - Toast notifications for user feedback
 * - Comprehensive logging with structured error information
 * - Integration with the global profile store for state management
 * 
 * The ErrorHandler ensures that all errors are properly logged, classified, and
 * handled according to their type and severity, providing consistent error
 * management across the entire profile management system.
 * 
 * @example
 * ```typescript
 * const errorHandler = new ErrorHandler(profileStore)
 * const result = errorHandler.handleLaunchError(profileId, error, context)
 * ```
 */
export class ErrorHandler {
  private profileStore: ProfileStore

  constructor(profileStore: ProfileStore) {
    this.profileStore = profileStore
  }

  /**
   * Send enhanced profile status update from error handler
   * @param profileId - The profile ID
   * @param message - Optional message to include
   */
  private sendEnhancedStatusUpdate(profileId: string, message?: string): void {
    try {
      const currentProfile = this.profileStore.getProfile(profileId)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      
      if (mainWindow && currentProfile) {
        const enhancedUpdate = {
          profileId,
          status: currentProfile.status,
          message: message || `Profile status: ${currentProfile.status}`,
          ticketCount: currentProfile.ticketCount,
          lastActivity: currentProfile.lastActivity,
          errorMessage: currentProfile.errorMessage,
          operationalState: currentProfile.operationalState,
          launchedAt: currentProfile.launchedAt,
          stoppedAt: currentProfile.stoppedAt,
          profileName: currentProfile.name,
          loginState: currentProfile.loginState,
          priority: currentProfile.priority,
          seats: currentProfile.seats
        }
        
        mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
        logger.info(profileId, `Enhanced profile status update sent from error handler: ${currentProfile.status}`)
      }
    } catch (error) {
      logger.error(profileId, `Failed to send enhanced status update from error handler: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Handle launch errors with status updates and logging
   * @param profileId - The ID of the profile that failed to launch
   * @param error - The error that occurred
   * @param context - Additional context information
   * @returns ErrorHandlingResult with handling details
   */
  handleLaunchError(profileId: string, error: Error, context?: Partial<ErrorContext>): ErrorHandlingResult {
    const errorMessage = error.message || 'Unknown launch error'
    const profileName = context?.profileName || profileId
    
    try {
      // Log detailed error information
      logger.error(profileId, `Launch operation failed: ${errorMessage}`)
      
      // Classify error type and severity
      const errorType = this.classifyError(error, 'launch')
      const severity = this.determineSeverity(errorType, error)
      
      // Log error classification for debugging
      logger.info(profileId, `Error classified as ${errorType} with severity ${severity}`)
      
      // Update profile status to Error
      this.profileStore.setError(profileId, `Launch failed: ${errorMessage}`)
      
      // Send enhanced status update to renderer
      this.sendEnhancedStatusUpdate(profileId, `Launch failed: ${errorMessage}`)
      
      // Send error toast notification
      sendToast({
        title: 'Profile Launch Failed',
        description: `Failed to launch profile ${profileName}: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000
      })
      
      // Log additional context if provided
      if (context?.additionalInfo) {
        logger.info(profileId, `Additional error context: ${JSON.stringify(context.additionalInfo)}`)
      }
      
      return {
        handled: true,
        shouldRetry: this.shouldRetryOperation(errorType, severity),
        profileKeptInStore: true, // Always keep profile in store for launch errors
        message: `Launch error handled: ${errorMessage}`
      }
      
    } catch (handlingError) {
      // Handle errors in error handling
      const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown handling error'
      logger.error(profileId, `Error handling launch error: ${handlingErrorMessage}`)
      
      return {
        handled: false,
        shouldRetry: false,
        profileKeptInStore: true,
        message: `Failed to handle launch error: ${handlingErrorMessage}`
      }
    }
  }

  /**
   * Handle stop errors that prevent close operation on failure
   * @param profileId - The ID of the profile that failed to stop
   * @param error - The error that occurred
   * @param context - Additional context information
   * @returns ErrorHandlingResult with handling details
   */
  handleStopError(profileId: string, error: Error, context?: Partial<ErrorContext>): ErrorHandlingResult {
    const errorMessage = error.message || 'Unknown stop error'
    const profileName = context?.profileName || profileId
    
    try {
      // Log detailed error information
      logger.error(profileId, `Stop operation failed: ${errorMessage}`)
      
      // Classify error type and severity
      const errorType = this.classifyError(error, 'stop')
      const severity = this.determineSeverity(errorType, error)
      
      // Log error classification for debugging
      logger.info(profileId, `Error classified as ${errorType} with severity ${severity}`)
      
      // Update profile status to Error with 'stopping' operational state
      // This prevents close operation from proceeding
      this.profileStore.updateProfile(profileId, {
        status: 'Error',
        operationalState: 'stopping',
        errorMessage: `Stop failed: ${errorMessage}`,
        lastActivity: new Date().toISOString()
      })
      
      // Send enhanced status update to renderer
      this.sendEnhancedStatusUpdate(profileId, `Stop failed: ${errorMessage}`)
      
      // Send error toast notification
      sendToast({
        title: 'Profile Stop Failed',
        description: `Failed to stop profile ${profileName}: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000
      })
      
      // Log additional context if provided
      if (context?.additionalInfo) {
        logger.info(profileId, `Additional error context: ${JSON.stringify(context.additionalInfo)}`)
      }
      
      // Log that close operation is prevented
      logger.warn(profileId, 'Profile close operation prevented due to stop failure')
      
      return {
        handled: true,
        shouldRetry: this.shouldRetryOperation(errorType, severity),
        profileKeptInStore: true, // Always keep profile in store for stop errors
        message: `Stop error handled, close operation prevented: ${errorMessage}`
      }
      
    } catch (handlingError) {
      // Handle errors in error handling
      const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown handling error'
      logger.error(profileId, `Error handling stop error: ${handlingErrorMessage}`)
      
      return {
        handled: false,
        shouldRetry: false,
        profileKeptInStore: true,
        message: `Failed to handle stop error: ${handlingErrorMessage}`
      }
    }
  }

  /**
   * Handle close errors that keep profile in store on failure
   * @param profileId - The ID of the profile that failed to close
   * @param error - The error that occurred
   * @param context - Additional context information
   * @returns ErrorHandlingResult with handling details
   */
  handleCloseError(profileId: string, error: Error, context?: Partial<ErrorContext>): ErrorHandlingResult {
    const errorMessage = error.message || 'Unknown close error'
    const profileName = context?.profileName || profileId
    
    try {
      // Log detailed error information
      logger.error(profileId, `Close operation failed: ${errorMessage}`)
      
      // Classify error type and severity
      const errorType = this.classifyError(error, 'close')
      const severity = this.determineSeverity(errorType, error)
      
      // Log error classification for debugging
      logger.info(profileId, `Error classified as ${errorType} with severity ${severity}`)
      
      // Update profile status to Error but keep in store
      this.profileStore.setError(profileId, `Close failed: ${errorMessage}`)
      
      // Send enhanced status update to renderer
      this.sendEnhancedStatusUpdate(profileId, `Close failed: ${errorMessage}`)
      
      // Send error toast notification
      sendToast({
        title: 'Profile Close Failed',
        description: `Failed to close profile ${profileName}: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000
      })
      
      // Log additional context if provided
      if (context?.additionalInfo) {
        logger.info(profileId, `Additional error context: ${JSON.stringify(context.additionalInfo)}`)
      }
      
      // Log that profile is kept in store
      logger.warn(profileId, 'Profile kept in store due to close failure')
      
      return {
        handled: true,
        shouldRetry: this.shouldRetryOperation(errorType, severity),
        profileKeptInStore: true, // Always keep profile in store for close errors
        message: `Close error handled, profile kept in store: ${errorMessage}`
      }
      
    } catch (handlingError) {
      // Handle errors in error handling
      const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown handling error'
      logger.error(profileId, `Error handling close error: ${handlingErrorMessage}`)
      
      return {
        handled: false,
        shouldRetry: false,
        profileKeptInStore: true,
        message: `Failed to handle close error: ${handlingErrorMessage}`
      }
    }
  }

  /**
   * Handle validation errors for profile data
   * @param profileId - The ID of the profile with validation issues
   * @param error - The validation error that occurred
   * @param context - Additional context information
   * @returns ErrorHandlingResult with handling details
   */
  handleValidationError(profileId: string, error: Error, context?: Partial<ErrorContext>): ErrorHandlingResult {
    const errorMessage = error.message || 'Unknown validation error'
    
    try {
      // Log validation error with appropriate level
      logger.warn(profileId, `Validation error: ${errorMessage}`)
      
      // Send warning toast for validation errors
      sendToast({
        title: 'Profile Validation Warning',
        description: `Profile ${profileId}: ${errorMessage}`,
        variant: 'destructive',
        duration: 4000
      })
      
      return {
        handled: true,
        shouldRetry: false, // Validation errors typically don't benefit from retries
        profileKeptInStore: true,
        message: `Validation error handled: ${errorMessage}`
      }
      
    } catch (handlingError) {
      const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown handling error'
      logger.error(profileId, `Error handling validation error: ${handlingErrorMessage}`)
      
      return {
        handled: false,
        shouldRetry: false,
        profileKeptInStore: true,
        message: `Failed to handle validation error: ${handlingErrorMessage}`
      }
    }
  }

  /**
   * Handle unexpected errors with comprehensive logging
   * @param profileId - The ID of the profile where the error occurred
   * @param error - The unexpected error that occurred
   * @param operation - The operation that was being performed
   * @param context - Additional context information
   * @returns ErrorHandlingResult with handling details
   */
  handleUnexpectedError(
    profileId: string, 
    error: Error, 
    operation: 'launch' | 'stop' | 'close',
    context?: Partial<ErrorContext>
  ): ErrorHandlingResult {
    const errorMessage = error.message || 'Unknown unexpected error'
    
    try {
      // Log unexpected error with high severity
      logger.error(profileId, `Unexpected error during ${operation}: ${errorMessage}`)
      
      // Log stack trace for debugging
      if (error.stack) {
        logger.error(profileId, `Stack trace: ${error.stack}`)
      }
      
      // Try to update profile status if store is available
      if (this.profileStore.hasProfile(profileId)) {
        this.profileStore.setError(profileId, `Unexpected ${operation} error: ${errorMessage}`)
        
        // Send enhanced status update to renderer
        this.sendEnhancedStatusUpdate(profileId, `Unexpected ${operation} error: ${errorMessage}`)
      }
      
      // Send critical error toast
      sendToast({
        title: 'Unexpected Error',
        description: `Unexpected error during ${operation} for profile ${profileId}: ${errorMessage}`,
        variant: 'destructive',
        duration: 6000
      })
      
      // Log additional context if provided
      if (context?.additionalInfo) {
        logger.error(profileId, `Additional error context: ${JSON.stringify(context.additionalInfo)}`)
      }
      
      return {
        handled: true,
        shouldRetry: false, // Unexpected errors typically shouldn't be retried automatically
        profileKeptInStore: true,
        message: `Unexpected error handled: ${errorMessage}`
      }
      
    } catch (handlingError) {
      const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : 'Unknown handling error'
      logger.error(profileId, `Error handling unexpected error: ${handlingErrorMessage}`)
      
      return {
        handled: false,
        shouldRetry: false,
        profileKeptInStore: true,
        message: `Failed to handle unexpected error: ${handlingErrorMessage}`
      }
    }
  }

  /**
   * Classify error type based on error message and operation
   * @param error - The error to classify
   * @param operation - The operation that was being performed
   * @returns ErrorType classification
   */
  private classifyError(error: Error, operation: 'launch' | 'stop' | 'close'): ErrorType {
    const errorMessage = error.message.toLowerCase()
    
    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || errorMessage.includes('econnrefused')) {
      return ErrorType.NETWORK_ERROR
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return ErrorType.TIMEOUT_ERROR
    }
    
    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('validation') || 
        errorMessage.includes('required') || errorMessage.includes('missing')) {
      return ErrorType.VALIDATION_ERROR
    }
    
    // Store-related errors
    if (errorMessage.includes('store') || errorMessage.includes('not found') || 
        errorMessage.includes('already exists')) {
      return ErrorType.STORE_ERROR
    }
    
    // Operation-specific errors
    switch (operation) {
      case 'launch':
        return ErrorType.LAUNCH_ERROR
      case 'stop':
        return ErrorType.STOP_ERROR
      case 'close':
        return ErrorType.CLOSE_ERROR
      default:
        return ErrorType.UNKNOWN_ERROR
    }
  }

  /**
   * Determine error severity based on error type and message
   * @param errorType - The classified error type
   * @param error - The original error
   * @returns ErrorSeverity level
   */
  private determineSeverity(errorType: ErrorType, error: Error): ErrorSeverity {
    const errorMessage = error.message.toLowerCase()
    
    // Critical errors that affect system stability
    if (errorMessage.includes('memory') || errorMessage.includes('crash') || 
        errorMessage.includes('fatal') || errorType === ErrorType.STORE_ERROR) {
      return ErrorSeverity.CRITICAL
    }
    
    // High severity errors that prevent core functionality
    if (errorType === ErrorType.LAUNCH_ERROR || errorType === ErrorType.CLOSE_ERROR ||
        errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      return ErrorSeverity.HIGH
    }
    
    // Medium severity errors that affect operations but allow recovery
    if (errorType === ErrorType.STOP_ERROR || errorType === ErrorType.NETWORK_ERROR ||
        errorType === ErrorType.TIMEOUT_ERROR) {
      return ErrorSeverity.MEDIUM
    }
    
    // Low severity errors that are recoverable
    if (errorType === ErrorType.VALIDATION_ERROR) {
      return ErrorSeverity.LOW
    }
    
    // Default to medium for unknown errors
    return ErrorSeverity.MEDIUM
  }

  /**
   * Determine if an operation should be retried based on error type and severity
   * @param errorType - The classified error type
   * @param severity - The error severity
   * @returns True if operation should be retried
   */
  private shouldRetryOperation(errorType: ErrorType, severity: ErrorSeverity): boolean {
    // Never retry critical errors or validation errors
    if (severity === ErrorSeverity.CRITICAL || errorType === ErrorType.VALIDATION_ERROR) {
      return false
    }
    
    // Retry network and timeout errors
    if (errorType === ErrorType.NETWORK_ERROR || errorType === ErrorType.TIMEOUT_ERROR) {
      return true
    }
    
    // Don't retry high severity errors by default
    if (severity === ErrorSeverity.HIGH) {
      return false
    }
    
    // Retry medium and low severity errors
    return severity === ErrorSeverity.MEDIUM || severity === ErrorSeverity.LOW
  }



  /**
   * Log error with appropriate detail level
   * @param profileId - The profile ID for context
   * @param error - The error to log
   * @param operation - The operation that failed
   * @param additionalDetails - Additional details to include
   */
  logError(
    profileId: string, 
    error: Error, 
    operation: string, 
    additionalDetails?: Record<string, any>
  ): void {
    try {
      // Log basic error information
      logger.error(profileId, `${operation} failed: ${error.message}`)
      
      // Log stack trace for debugging (but not too verbose)
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(0, 5) // Limit stack trace lines
        logger.error(profileId, `Stack trace: ${stackLines.join(' | ')}`)
      }
      
      // Log additional details if provided
      if (additionalDetails && Object.keys(additionalDetails).length > 0) {
        logger.info(profileId, `Additional details: ${JSON.stringify(additionalDetails, null, 2)}`)
      }
      
      // Log error type and name for classification
      logger.info(profileId, `Error type: ${error.constructor.name}`)
      
    } catch (loggingError) {
      // Fallback logging if main logging fails
      console.error(`Failed to log error for profile ${profileId}:`, loggingError)
      console.error('Original error:', error)
    }
  }

  /**
   * Log operation success with appropriate detail level
   * @param profileId - The profile ID for context
   * @param operation - The operation that succeeded
   * @param message - Success message
   * @param additionalDetails - Additional details to include
   */
  logSuccess(
    profileId: string, 
    operation: string, 
    message: string,
    additionalDetails?: Record<string, any>
  ): void {
    try {
      // Log success information without being too verbose
      logger.info(profileId, `${operation} completed successfully: ${message}`)
      
      // Log additional details if provided (but keep it concise)
      if (additionalDetails && Object.keys(additionalDetails).length > 0) {
        const relevantDetails = Object.entries(additionalDetails)
          .filter(([key, value]) => value !== undefined && value !== null)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
        
        if (Object.keys(relevantDetails).length > 0) {
          logger.info(profileId, `Operation details: ${JSON.stringify(relevantDetails)}`)
        }
      }
      
    } catch (loggingError) {
      // Fallback logging if main logging fails
      console.error(`Failed to log success for profile ${profileId}:`, loggingError)
    }
  }

  /**
   * Create error context for operations
   * @param profileId - The profile ID
   * @param operation - The operation being performed
   * @param profile - The profile object (optional)
   * @param additionalInfo - Additional context information
   * @returns ErrorContext object
   */
  createErrorContext(
    profileId: string,
    operation: 'launch' | 'stop' | 'close',
    profile?: EnhancedProfile,
    additionalInfo?: Record<string, any>
  ): ErrorContext {
    return {
      profileId,
      operation,
      profileName: profile?.name,
      additionalInfo: {
        profileStatus: profile?.status,
        operationalState: profile?.operationalState,
        lastActivity: profile?.lastActivity,
        ...additionalInfo
      }
    }
  }
}