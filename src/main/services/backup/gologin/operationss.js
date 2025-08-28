/**
 * Profile Operations - Individual profile control functions
 *
 * This file contains individual profile operation functions
 * for launching, stopping, and closing specific profiles.
 *
 * Features:
 * - launchProfile function for starting individual profiles
 * - stopProfile function for gracefully stopping profiles
 * - closeProfile function for stopping and removing profiles
 * - Comprehensive error handling for all profile operations
 */

import { logger } from '../../../utils/logger-service.js'
import { ProfileStore } from '../../profile/profileStore.js'
import { ErrorHandler } from '../../gologin/error-handler.js'
import { sendToast } from '../../../utils/toast-service.js'
import { BrowserWindow } from 'electron'
import {
  startProfileScraping,
  stopProfileScraping,
  setScrapingProfileStore,
  setScrapingMainWindow
} from '../gologin/scraping/engine.js'

// Global profile store instance (will be injected by the main service)
let globalProfileStore = null

// Global error handler instance
let globalErrorHandler = null

// Map to track active GoLogin instances for each profile
const activeGologinInstances = new Map()

/**
 * Set the global profile store instance
 * This should be called by the main GoLogin service during initialization
 */
export function setProfileStore(store) {
  globalProfileStore = store
  // Initialize error handler with the store
  globalErrorHandler = new ErrorHandler(store)
  // Initialize scraping system with the store
  setScrapingProfileStore(store)
}

/**
 * Set the main window for scraping system
 */
export function setScrapingWindow(window) {
  setScrapingMainWindow(window)
}

/**
 * Send enhanced profile status update to renderer from profile operations
 * @param profileId - The profile ID
 * @param status - Optional status to update (if not provided, uses current profile status)
 * @param message - Optional message to include
 */
function sendEnhancedProfileStatusUpdate(
  profileId,
  status,
  message
) {
  try {
    if (!globalProfileStore) {
      logger.warn(profileId, 'Cannot send status update: Profile store not initialized')
      return
    }

    // Update status in store if provided
    if (status) {
      globalProfileStore.updateStatus(profileId, status, message)
    }

    // Get current profile data
    const currentProfile = globalProfileStore.getProfile(profileId)
    const mainWindow = BrowserWindow.getAllWindows()[0]

    if (mainWindow) {
      if (currentProfile) {
        // Send enhanced profile status update with all profile data
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
        logger.info(
          profileId,
          `Enhanced profile status update sent from operations: ${currentProfile.status}`
        )
      } else {
        // Send basic update if profile not found
        const basicUpdate = {
          profileId,
          status: status || 'Unknown',
          message: message || 'Profile not found in store',
          ticketCount: 0,
          lastActivity: new Date().toISOString(),
          operationalState: 'idle',
          errorMessage: 'Profile not found in store'
        }

        mainWindow.webContents.send('profile-status-changed', basicUpdate)
        logger.warn(
          profileId,
          'Sent basic profile status update from operations (profile not found)'
        )
      }
    } else {
      logger.error(profileId, 'Cannot send profile status update: Main window not available')
    }
  } catch (error) {
    logger.error(
      profileId,
      `Failed to send enhanced profile status update from operations: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Validate profile operation prerequisites
 * @param profileId - The profile ID to validate
 * @param operation - The operation being performed
 * @returns Operation result if validation fails, null if validation passes
 */
function validateProfileOperation(
  profileId,
  operation
) {
  // Validate profile ID
  if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
    const error = new Error('Profile ID is required and must be a non-empty string')

    if (globalErrorHandler) {
      globalErrorHandler.handleValidationError('unknown', error)
    }

    return {
      success: false,
      message: 'Invalid profile ID',
      profileId: profileId || 'unknown'
    }
  }

  // Validate that profile store is available
  if (!globalProfileStore) {
    const error = new Error('Profile store not initialized')

    if (globalErrorHandler) {
      globalErrorHandler.handleValidationError(profileId, error)
    }

    return {
      success: false,
      message: 'Profile store not initialized',
      profileId
    }
  }

  // Validate that error handler is available
  if (!globalErrorHandler) {
    logger.warn(profileId, 'Error handler not initialized - using fallback error handling')
  }

  return null // Validation passed
}

/**
 * Launch a single profile and update global store
 * @param profileId - The ID of the profile to launch
 * @returns Operation result with success status and messages
 */
export async function launchProfile(profileId) {
  const operationStartTime = Date.now()

  try {
    // Log operation initiation with structured details
    logger.info(profileId, `[LAUNCH] Operation initiated - profileId: ${profileId}`)

    // Validate operation prerequisites
    const validationResult = validateProfileOperation(profileId, 'launch')
    if (validationResult) {
      // Log validation failure with structured details
      logger.error(
        profileId,
        `[LAUNCH] Validation failed - reason: ${validationResult.message}, duration: ${Date.now() - operationStartTime}ms`
      )
      return validationResult
    }

    // Get profile from store
    const profile = globalProfileStore.getProfile(profileId)
    if (!profile) {
      const errorMessage = `Profile with ID ${profileId} not found in store`
      logger.error(
        profileId,
        `[LAUNCH] Profile not found - profileId: ${profileId}, duration: ${Date.now() - operationStartTime}ms`
      )
      return {
        success: false,
        message: errorMessage,
        profileId
      }
    }

    // Log profile state before launch attempt
    logger.info(
      profileId,
      `[LAUNCH] Profile found - name: ${profile.name}, status: ${profile.status}, operationalState: ${profile.operationalState}`
    )

    // Check if profile is already launching or active
    if (profile.operationalState === 'active' || profile.status === 'Launching') {
      const errorMessage = `Profile ${profileId} is already launching or active`
      logger.error(
        profileId,
        `[LAUNCH] Profile already active - status: ${profile.status}, operationalState: ${profile.operationalState}, duration: ${Date.now() - operationStartTime}ms`
      )
      return {
        success: false,
        message: errorMessage,
        profileId
      }
    }

    // Update status to Launching and send enhanced status update
    sendEnhancedProfileStatusUpdate(profileId, 'Launching', 'Profile launch initiated')

    try {
      // Log GoLogin instance creation attempt
      logger.info(
        profileId,
        `[LAUNCH] Creating GoLogin instance - hasToken: ${!!process.env.GOLOGIN_TOKEN}`
      )
      // const token =
      //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk1ZDk5YjVlZWNjYTNhNjlmOWQxZWMiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODk1ZDliNjUzM2M1OWQ2YjUxZTNjYTIifQ.xeWmI6Dzqgx55mrZ6iWRiLMGGqbiswA76mEKE2q0pBw'
      // const gologin = new GoLogin({
      //   token: token,
      //   profile_id: profileId
      // })

      // const result = await gologin.start()
      // console.log(result)
      // if (result.status !== 'success') {
      //   throw new Error(`GoLogin profile launch failed: ${result.status}`)
      // }

      const gologin = {
        'id': '1234',
        'status': 'success'
      }

      const result = {
        'status': 'success',
        'wsEndpoint': 'ws://127.0.0.1:3500'
      }
      await new Promise((resolve) => setTimeout(resolve, 5000))
      // Start the profile
      logger.info(profileId, `[LAUNCH] Starting GoLogin profile - profileId: ${profileId}`)
      const gologinStartTime = Date.now()

      const gologinDuration = Date.now() - gologinStartTime

      // Log GoLogin start result
      logger.info(
        profileId,
        `[LAUNCH] GoLogin start completed - duration: ${gologinDuration}ms, hasResult: ${!!result}`
      )

      // Store the active instance for later cleanup
      activeGologinInstances.set(profileId, { gologin, result })

      // Update status to Ready and send enhanced status update
      sendEnhancedProfileStatusUpdate(profileId, 'Ready', 'Profile launched successfully')

      // Start autonomous scraping after successful launch
      try {
        logger.info(profileId, '[LAUNCH] Starting autonomous scraping system')
        await startProfileScraping(profileId)
        logger.info(profileId, '[LAUNCH] Autonomous scraping started successfully')
      } catch (scrapingError) {
        const scrapingErrorMessage = scrapingError instanceof Error ? scrapingError.message : 'Unknown scraping error'
        logger.error(profileId, `[LAUNCH] Failed to start scraping: ${scrapingErrorMessage}`)
        // Don't fail the launch if scraping fails to start - profile is still launched
        sendToast({
          title: 'Scraping Start Failed',
          description: `Profile ${profile.name || profileId} launched but scraping failed to start`,
          variant: 'destructive',
          duration: 5000
        })
      }

      // Send success toast notification
      sendToast({
        title: 'Profile Launched',
        description: `Profile ${profile.name || profileId} launched successfully`,
        variant: 'success',
        duration: 3000
      })

      // Log success with structured details
      const totalDuration = Date.now() - operationStartTime
      if (globalErrorHandler) {
        globalErrorHandler.logSuccess(profileId, 'launch', 'Profile launched successfully', {
          profileName: profile.name,
          gologinResult: result ? 'present' : 'missing',
          gologinDuration: `${gologinDuration}ms`,
          totalDuration: `${totalDuration}ms`
        })
      } else {
        logger.info(
          profileId,
          `[LAUNCH] Success - profileName: ${profile.name}, totalDuration: ${totalDuration}ms, gologinDuration: ${gologinDuration}ms`
        )
      }

      return {
        success: true,
        message: 'Profile launched successfully',
        profileId
      }
    } catch (launchError) {
      // Log launch failure with structured details
      const error = launchError instanceof Error ? launchError : new Error('Unknown launch error')
      const failureDuration = Date.now() - operationStartTime

      logger.error(
        profileId,
        `[LAUNCH] GoLogin start failed - error: ${error.message}, duration: ${failureDuration}ms, errorType: ${error.constructor.name}`
      )

      if (globalErrorHandler) {
        const context = globalErrorHandler.createErrorContext(profileId, 'launch', profile, {
          gologinToken: process.env.GOLOGIN_TOKEN ? 'present' : 'missing',
          failureDuration: `${failureDuration}ms`,
          errorType: error.constructor.name
        })

        const result = globalErrorHandler.handleLaunchError(profileId, error, context)

        return {
          success: false,
          message: result.message,
          profileId
        }
      } else {
        // Fallback error handling if ErrorHandler is not available
        const errorMessage = error.message
        logger.error(
          profileId,
          `[LAUNCH] Fallback error handling - error: ${errorMessage}, duration: ${failureDuration}ms`
        )

        if (globalProfileStore) {
          globalProfileStore.setError(profileId, errorMessage)
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(profileId, undefined, `Launch failed: ${errorMessage}`)
        }

        return {
          success: false,
          message: `Launch failed: ${errorMessage}`,
          profileId
        }
      }
    }
  } catch (error) {
    // Handle unexpected errors using ErrorHandler
    const err = error instanceof Error ? error : new Error('Unknown error during launch')
    const unexpectedErrorDuration = Date.now() - operationStartTime

    logger.error(
      profileId,
      `[LAUNCH] Unexpected error - error: ${err.message}, duration: ${unexpectedErrorDuration}ms, errorType: ${err.constructor.name}`
    )

    if (globalErrorHandler) {
      const result = globalErrorHandler.handleUnexpectedError(profileId, err, 'launch', {
        profileId,
        operation: 'launch',
        unexpectedErrorDuration: `${unexpectedErrorDuration}ms`,
        errorType: err.constructor.name
      })

      return {
        success: false,
        message: result.message,
        profileId
      }
    } else {
      // Fallback error handling if ErrorHandler is not available
      const errorMessage = err.message
      logger.error(
        profileId,
        `[LAUNCH] Unexpected error fallback - error: ${errorMessage}, duration: ${unexpectedErrorDuration}ms`
      )

      if (globalProfileStore) {
        try {
          globalProfileStore.setError(profileId, errorMessage)
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(
            profileId,
            undefined,
            `Unexpected launch error: ${errorMessage}`
          )
        } catch (storeError) {
          logger.error(
            profileId,
            `[LAUNCH] Store update failed - storeError: ${storeError instanceof Error ? storeError.message : 'Unknown store error'}`
          )
        }
      }

      return {
        success: false,
        message: `Unexpected error: ${errorMessage}`,
        profileId
      }
    }
  }
}

/**
 * Stop a single profile gracefully without removing from store
 * @param profileId - The ID of the profile to stop
 * @returns Operation result with success status and messages
 */
export async function stopProfile(profileId) {
  const operationStartTime = Date.now()

  try {
    // Log operation initiation with structured details
    logger.info(profileId, `[STOP] Operation initiated - profileId: ${profileId}`)

    // Validate operation prerequisites
    const validationResult = validateProfileOperation(profileId, 'stop')
    if (validationResult) {
      // Log validation failure with structured details
      logger.error(
        profileId,
        `[STOP] Validation failed - reason: ${validationResult.message}, duration: ${Date.now() - operationStartTime}ms`
      )
      return validationResult
    }

    // Get profile from store
    const profile = globalProfileStore.getProfile(profileId)
    if (!profile) {
      const errorMessage = `Profile with ID ${profileId} not found in store`
      logger.error(
        profileId,
        `[STOP] Profile not found - profileId: ${profileId}, duration: ${Date.now() - operationStartTime}ms`
      )
      return {
        success: false,
        message: errorMessage,
        profileId
      }
    }

    // Log profile state before stop attempt
    logger.info(
      profileId,
      `[STOP] Profile found - name: ${profile.name}, status: ${profile.status}, operationalState: ${profile.operationalState}`
    )

    // Check if profile is already stopped or stopping
    if (profile.status === 'Stopped' || profile.status === 'Stopping') {
      const message = `Profile ${profileId} is already stopped or stopping`
      const duration = Date.now() - operationStartTime
      logger.info(
        profileId,
        `[STOP] Already stopped/stopping - status: ${profile.status}, duration: ${duration}ms`
      )
      return {
        success: true,
        message,
        profileId
      }
    }

    // Check if profile is in idle state (nothing to stop)
    if (profile.operationalState === 'idle' && profile.status === 'Idle') {
      const message = `Profile ${profileId} is already idle`
      const duration = Date.now() - operationStartTime
      logger.info(profileId, `[STOP] Already idle - marking as stopped, duration: ${duration}ms`)
      globalProfileStore.updateStatus(profileId, 'Stopped', 'Profile was already idle')
      return {
        success: true,
        message,
        profileId
      }
    }

    // Update status to Stopping and send enhanced status update
    sendEnhancedProfileStatusUpdate(profileId, 'Stopping', 'Profile stop initiated')

    // Stop scraping first if active
    try {
      logger.info(profileId, '[STOP] Stopping autonomous scraping system')
      await stopProfileScraping(profileId)
      logger.info(profileId, '[STOP] Autonomous scraping stopped successfully')
    } catch (scrapingError) {
      const scrapingErrorMessage = scrapingError instanceof Error ? scrapingError.message : 'Unknown scraping error'
      logger.error(profileId, `[STOP] Failed to stop scraping: ${scrapingErrorMessage}`)
      // Continue with profile stop even if scraping stop fails
    }

    try {
      // Get active GoLogin instance
      const activeInstance = activeGologinInstances.get(profileId)

      if (activeInstance) {
        logger.info(profileId, `[STOP] Active instance found - stopping GoLogin profile`)

        // Stop the GoLogin profile
        const gologinStopTime = Date.now()
        await activeInstance.gologin.stop()
        const gologinStopDuration = Date.now() - gologinStopTime

        // Remove from active instances but keep in store
        activeGologinInstances.delete(profileId)

        logger.info(
          profileId,
          `[STOP] GoLogin profile stopped - duration: ${gologinStopDuration}ms`
        )
      } else {
        logger.info(profileId, `[STOP] No active instance found - marking as stopped`)
      }

      // Update status to Stopped (keep in store) and send enhanced status update
      sendEnhancedProfileStatusUpdate(profileId, 'Stopped', 'Profile stopped successfully')

      // Send success toast notification
      sendToast({
        title: 'Profile Stopped',
        description: `Profile ${profile.name || profileId} stopped successfully`,
        variant: 'default',
        duration: 3000
      })

      // Log success with structured details
      const totalDuration = Date.now() - operationStartTime
      if (globalErrorHandler) {
        globalErrorHandler.logSuccess(profileId, 'stop', 'Profile stopped successfully', {
          profileName: profile.name,
          hadActiveInstance: activeInstance ? true : false,
          totalDuration: `${totalDuration}ms`
        })
      } else {
        logger.info(
          profileId,
          `[STOP] Success - profileName: ${profile.name}, hadActiveInstance: ${!!activeInstance}, totalDuration: ${totalDuration}ms`
        )
      }

      return {
        success: true,
        message: 'Profile stopped successfully',
        profileId
      }
    } catch (stopError) {
      // Log stop failure with structured details
      const error = stopError instanceof Error ? stopError : new Error('Unknown stop error')
      const failureDuration = Date.now() - operationStartTime

      logger.error(
        profileId,
        `[STOP] GoLogin stop failed - error: ${error.message}, duration: ${failureDuration}ms, errorType: ${error.constructor.name}`
      )

      if (globalErrorHandler) {
        const context = globalErrorHandler.createErrorContext(profileId, 'stop', profile, {
          hasActiveInstance: activeGologinInstances.has(profileId),
          failureDuration: `${failureDuration}ms`,
          errorType: error.constructor.name
        })

        const result = globalErrorHandler.handleStopError(profileId, error, context)

        return {
          success: false,
          message: result.message,
          profileId
        }
      } else {
        // Fallback error handling if ErrorHandler is not available
        const errorMessage = error.message
        logger.error(
          profileId,
          `[STOP] Fallback error handling - error: ${errorMessage}, duration: ${failureDuration}ms`
        )

        if (globalProfileStore) {
          globalProfileStore.updateProfile(profileId, {
            status: 'Error',
            operationalState: 'stopping',
            errorMessage: `Stop failed: ${errorMessage}`,
            lastActivity: new Date().toISOString()
          })
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(profileId, undefined, `Stop failed: ${errorMessage}`)
        }

        return {
          success: false,
          message: `Stop failed: ${errorMessage}`,
          profileId
        }
      }
    }
  } catch (error) {
    // Handle unexpected errors using ErrorHandler
    const err = error instanceof Error ? error : new Error('Unknown error during stop')
    const unexpectedErrorDuration = Date.now() - operationStartTime

    logger.error(
      profileId,
      `[STOP] Unexpected error - error: ${err.message}, duration: ${unexpectedErrorDuration}ms, errorType: ${err.constructor.name}`
    )

    if (globalErrorHandler) {
      const result = globalErrorHandler.handleUnexpectedError(profileId, err, 'stop', {
        profileId,
        operation: 'stop',
        unexpectedErrorDuration: `${unexpectedErrorDuration}ms`,
        errorType: err.constructor.name
      })

      return {
        success: false,
        message: result.message,
        profileId
      }
    } else {
      // Fallback error handling if ErrorHandler is not available
      const errorMessage = err.message
      logger.error(
        profileId,
        `[STOP] Unexpected error fallback - error: ${errorMessage}, duration: ${unexpectedErrorDuration}ms`
      )

      if (globalProfileStore) {
        try {
          globalProfileStore.updateProfile(profileId, {
            status: 'Error',
            operationalState: 'stopping',
            errorMessage: `Unexpected stop error: ${errorMessage}`,
            lastActivity: new Date().toISOString()
          })
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(
            profileId,
            undefined,
            `Unexpected stop error: ${errorMessage}`
          )
        } catch (storeError) {
          logger.error(
            profileId,
            `[STOP] Store update failed - storeError: ${storeError instanceof Error ? storeError.message : 'Unknown store error'}`
          )
        }
      }

      return {
        success: false,
        message: `Unexpected error: ${errorMessage}`,
        profileId
      }
    }
  }
}

/**
 * Close a single profile (stop and remove from global store)
 * @param profileId - The ID of the profile to close
 * @returns Operation result with success status and messages
 */
export async function closeProfile(profileId) {
  const operationStartTime = Date.now()

  try {
    // Log operation initiation with structured details
    logger.info(profileId, `[CLOSE] Operation initiated - profileId: ${profileId}`)

    // Validate operation prerequisites
    const validationResult = validateProfileOperation(profileId, 'close')
    if (validationResult) {
      // Log validation failure with structured details
      logger.error(
        profileId,
        `[CLOSE] Validation failed - reason: ${validationResult.message}, duration: ${Date.now() - operationStartTime}ms`
      )
      return validationResult
    }

    // Get profile from store
    const profile = globalProfileStore.getProfile(profileId)
    if (!profile) {
      const errorMessage = `Profile with ID ${profileId} not found in store`
      logger.error(
        profileId,
        `[CLOSE] Profile not found - profileId: ${profileId}, duration: ${Date.now() - operationStartTime}ms`
      )
      return {
        success: false,
        message: errorMessage,
        profileId
      }
    }

    // Log profile state before close attempt
    logger.info(
      profileId,
      `[CLOSE] Profile found - name: ${profile.name}, status: ${profile.status}, operationalState: ${profile.operationalState}`
    )

    // First, attempt to stop the profile if it's active
    if (
      profile.operationalState === 'active' ||
      (profile.status !== 'Stopped' && profile.status !== 'Idle')
    ) {
      logger.info(
        profileId,
        `[CLOSE] Profile active - stopping before close, status: ${profile.status}, operationalState: ${profile.operationalState}`
      )

      const stopStartTime = Date.now()
      const stopResult = await stopProfile(profileId)
      const stopDuration = Date.now() - stopStartTime

      if (!stopResult.success) {
        // If stop fails, don't proceed with close - keep profile in store
        const errorMessage = `Cannot close profile: Stop operation failed - ${stopResult.message}`
        logger.error(
          profileId,
          `[CLOSE] Stop failed - cannot proceed with close, stopDuration: ${stopDuration}ms, stopError: ${stopResult.message}`
        )

        // Use ErrorHandler to handle the close prevention
        if (globalErrorHandler) {
          const error = new Error(`Stop operation failed: ${stopResult.message}`)
          const context = globalErrorHandler.createErrorContext(profileId, 'close', profile, {
            stopFailureReason: stopResult.message,
            stopDuration: `${stopDuration}ms`
          })

          globalErrorHandler.handleCloseError(profileId, error, context)
        }

        return {
          success: false,
          message: errorMessage,
          profileId
        }
      } else {
        logger.info(
          profileId,
          `[CLOSE] Stop successful - proceeding with close, stopDuration: ${stopDuration}ms`
        )
      }
    } else {
      logger.info(profileId, `[CLOSE] Profile already stopped/idle - proceeding with close`)

      // Ensure scraping is stopped even if profile was already stopped
      try {
        logger.info(profileId, '[CLOSE] Ensuring scraping is stopped')
        await stopProfileScraping(profileId)
        logger.info(profileId, '[CLOSE] Scraping stop confirmed')
      } catch (scrapingError) {
        const scrapingErrorMessage = scrapingError instanceof Error ? scrapingError.message : 'Unknown scraping error'
        logger.error(profileId, `[CLOSE] Failed to stop scraping: ${scrapingErrorMessage}`)
        // Continue with close even if scraping stop fails
      }
    }

    try {
      // Ensure any remaining GoLogin instance is cleaned up
      const activeInstance = activeGologinInstances.get(profileId)
      if (activeInstance) {
        logger.info(profileId, `[CLOSE] Cleaning up remaining GoLogin instance`)
        try {
          const cleanupStartTime = Date.now()
          await activeInstance.gologin.stop()
          const cleanupDuration = Date.now() - cleanupStartTime
          logger.info(
            profileId,
            `[CLOSE] GoLogin cleanup successful - duration: ${cleanupDuration}ms`
          )
        } catch (cleanupError) {
          const cleanupErrorMessage =
            cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'
          logger.error(profileId, `[CLOSE] GoLogin cleanup failed - error: ${cleanupErrorMessage}`)
        }
        activeGologinInstances.delete(profileId)
      } else {
        logger.info(profileId, `[CLOSE] No active GoLogin instance to cleanup`)
      }

      // Remove profile from global store
      logger.info(profileId, `[CLOSE] Removing profile from store`)
      globalProfileStore.removeProfile(profileId)

      // Send success toast notification
      sendToast({
        title: 'Profile Closed',
        description: `Profile ${profile.name || profileId} closed and removed successfully`,
        variant: 'default',
        duration: 3000
      })

      // Log success with structured details
      const totalDuration = Date.now() - operationStartTime
      if (globalErrorHandler) {
        globalErrorHandler.logSuccess(
          profileId,
          'close',
          'Profile closed and removed successfully',
          {
            profileName: profile.name,
            hadActiveInstance: activeInstance ? true : false,
            totalDuration: `${totalDuration}ms`
          }
        )
      } else {
        logger.info(
          profileId,
          `[CLOSE] Success - profileName: ${profile.name}, hadActiveInstance: ${!!activeInstance}, totalDuration: ${totalDuration}ms`
        )
      }

      return {
        success: true,
        message: 'Profile closed and removed successfully',
        profileId
      }
    } catch (closeError) {
      // Log close failure with structured details
      const error = closeError instanceof Error ? closeError : new Error('Unknown close error')
      const failureDuration = Date.now() - operationStartTime

      logger.error(
        profileId,
        `[CLOSE] Close operation failed - error: ${error.message}, duration: ${failureDuration}ms, errorType: ${error.constructor.name}`
      )

      if (globalErrorHandler) {
        const context = globalErrorHandler.createErrorContext(profileId, 'close', profile, {
          hasActiveInstance: activeGologinInstances.has(profileId),
          failureDuration: `${failureDuration}ms`,
          errorType: error.constructor.name
        })

        const result = globalErrorHandler.handleCloseError(profileId, error, context)

        return {
          success: false,
          message: result.message,
          profileId
        }
      } else {
        // Fallback error handling if ErrorHandler is not available
        const errorMessage = error.message
        logger.error(
          profileId,
          `[CLOSE] Fallback error handling - error: ${errorMessage}, duration: ${failureDuration}ms`
        )

        if (globalProfileStore) {
          globalProfileStore.setError(profileId, `Close failed: ${errorMessage}`)
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(profileId, undefined, `Close failed: ${errorMessage}`)
        }

        return {
          success: false,
          message: `Close failed: ${errorMessage}`,
          profileId
        }
      }
    }
  } catch (error) {
    // Handle unexpected errors using ErrorHandler
    const err = error instanceof Error ? error : new Error('Unknown error during close')
    const unexpectedErrorDuration = Date.now() - operationStartTime

    logger.error(
      profileId,
      `[CLOSE] Unexpected error - error: ${err.message}, duration: ${unexpectedErrorDuration}ms, errorType: ${err.constructor.name}`
    )

    if (globalErrorHandler) {
      const result = globalErrorHandler.handleUnexpectedError(profileId, err, 'close', {
        profileId,
        operation: 'close',
        unexpectedErrorDuration: `${unexpectedErrorDuration}ms`,
        errorType: err.constructor.name
      })

      return {
        success: false,
        message: result.message,
        profileId
      }
    } else {
      // Fallback error handling if ErrorHandler is not available
      const errorMessage = err.message
      logger.error(
        profileId,
        `[CLOSE] Unexpected error fallback - error: ${errorMessage}, duration: ${unexpectedErrorDuration}ms`
      )

      if (globalProfileStore && globalProfileStore.hasProfile(profileId)) {
        try {
          globalProfileStore.setError(profileId, `Unexpected close error: ${errorMessage}`)
          // Send enhanced status update for error state
          sendEnhancedProfileStatusUpdate(
            profileId,
            undefined,
            `Unexpected close error: ${errorMessage}`
          )
        } catch (storeError) {
          logger.error(
            profileId,
            `[CLOSE] Store update failed - storeError: ${storeError instanceof Error ? storeError.message : 'Unknown store error'}`
          )
        }
      }

      return {
        success: false,
        message: `Unexpected error: ${errorMessage}`,
        profileId
      }
    }
  }
}

/**
 * Get the current active GoLogin instances (for debugging/monitoring)
 * @returns Map of active instances
 */
export function getActiveInstances() {
  return new Map(activeGologinInstances)
}

/**
 * Clean up all active GoLogin instances (for application shutdown)
 * @returns Promise that resolves when all instances are cleaned up
 */
export async function cleanupAllInstances() {
  const cleanupStartTime = Date.now()
  const instanceCount = activeGologinInstances.size

  logger.info('Global', `[CLEANUP] Starting cleanup of ${instanceCount} active GoLogin instances`)

  const cleanupPromises = Array.from(activeGologinInstances.entries()).map(
    async ([profileId, instance]) => {
      const instanceCleanupStart = Date.now()
      try {
        await instance.gologin.stop()
        const instanceCleanupDuration = Date.now() - instanceCleanupStart
        logger.info(
          profileId,
          `[CLEANUP] Instance cleaned up successfully - duration: ${instanceCleanupDuration}ms`
        )
      } catch (error) {
        const instanceCleanupDuration = Date.now() - instanceCleanupStart
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(
          profileId,
          `[CLEANUP] Instance cleanup failed - error: ${errorMessage}, duration: ${instanceCleanupDuration}ms`
        )
      }
    }
  )

  const results = await Promise.allSettled(cleanupPromises)
  activeGologinInstances.clear()

  const totalCleanupDuration = Date.now() - cleanupStartTime
  const successCount = results.filter((r) => r.status === 'fulfilled').length
  const failureCount = results.filter((r) => r.status === 'rejected').length

  logger.info(
    'Global',
    `[CLEANUP] Cleanup completed - total: ${instanceCount}, success: ${successCount}, failed: ${failureCount}, duration: ${totalCleanupDuration}ms`
  )
}

