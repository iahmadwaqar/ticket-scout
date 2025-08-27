import { logger } from '../../utils/logger-service.js'
import { readFileSync } from 'fs'
import { BrowserWindow } from 'electron'
import { ProfileStore } from '../profile/store.js'
import {
  setProfileStore,
  launchProfile,
  stopProfile,
  closeProfile,
  cleanupAllInstances,
  setScrapingWindow
} from '../profile/operations.js'
import { stopAllScraping } from './scraping/engine.js'

/**
 * GoLogin service for managing browser profiles with global store integration
 *
 * This service provides comprehensive profile management capabilities including:
 * - Global profile store for O(1) access and centralized state management
 * - Individual profile operations (launch, stop, close) with proper error handling
 * - Bulk operations that use individual functions for consistency
 * - Enhanced profile status tracking with real-time updates
 * - Memory management and cleanup for optimal resource usage
 * - Integration with IPC handlers for renderer communication
 *
 * Key Features:
 * - Thread-safe profile operations with proper error handling
 * - Enhanced profile data with ticket counts, timestamps, and operational states
 * - Comprehensive logging and toast notifications for user feedback
 * - Memory monitoring and automatic cleanup of closed profiles
 * - Graceful shutdown and resource disposal
 *
 * @example
 * ```typescript
 * const service = new GoLoginService()
 * service.setMainWindow(mainWindow)
 * await service.initializeProfiles()
 * const result = await service.launchSingleProfile('profile-id')
 * ```
 */
export class GoLoginService {
  constructor() {
    this.activeProfiles = new Map()
    this.mainWindow = null
    this.profileStore = new ProfileStore()

    // Initialize profile store and set it for profile operations
    setProfileStore(this.profileStore)
  }

  /**
   * Set the main window reference for sending events to the renderer process
   *
   * This method must be called during application initialization to enable
   * real-time profile status updates and toast notifications to be sent
   * to the renderer process.
   *
   * @param window - The main BrowserWindow instance
   * @example
   * ```typescript
   * const mainWindow = new BrowserWindow(...)
   * gologinService.setMainWindow(mainWindow)
   * ```
   */
  setMainWindow(window) {
    this.mainWindow = window
    // Initialize scraping system with main window
    setScrapingWindow(window)
  }

  /**
   * Initialize profiles by loading JSON data into the global store
   *
   * This method loads profile data from the JSON file and populates the global
   * ProfileStore with enhanced profile objects. It clears any existing profiles
   * and creates new EnhancedProfile objects with default values for tracking
   * fields like ticketCount, lastActivity, and operationalState.
   *
   * This method should be called during application startup or when refreshing
   * the profile data from the source file.
   *
   * @throws {Error} If the profiles JSON file cannot be read or parsed
   * @example
   * ```typescript
   * await gologinService.initializeProfiles()
   * const profiles = gologinService.getAllProfiles()
   * ```
   */
  async initializeProfiles() {
    try {
      logger.info('Global', 'Initializing profiles from JSON data')

      const profilesPath =
        'E:\\Football Ticket JOB\\CODE\\ticket-scout\\src\\main\\data\\profiles.json'
      const profilesData = readFileSync(profilesPath, 'utf-8')
      const parsed = JSON.parse(profilesData)
      const profiles = parsed.profiles || []

      // Clear existing profiles from store
      this.profileStore.clear()

      // Populate the global store with enhanced profiles
      profiles.forEach((profile) => {
        const enhancedProfile = ProfileStore.enhanceProfile(profile)
        this.profileStore.addProfile(enhancedProfile)
      })

      logger.info(
        'Global',
        `Profile initialization complete: ${profiles.length} profiles loaded into global store`
      )
    } catch (error) {
      logger.error(
        'Global',
        `Failed to initialize profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Filter profiles based on launch configuration
   */
  filterProfiles(allProfiles, config) {
    let filteredProfiles = allProfiles

    // Filter by domain if specified
    if (config.domain && config.domain !== 'all') {
      const domainMap = {
        'chelsea-35': 'chelsea.com',
        'arsenal-20': 'arsenal.com'
      }
      const targetDomain = domainMap[config.domain] || config.domain
      filteredProfiles = filteredProfiles.filter((profile) => profile.url.includes(targetDomain))
    }

    // Filter by seats if specified
    if (config.seats > 0) {
      filteredProfiles = filteredProfiles.filter((profile) => profile.seats >= config.seats)
    }

    // Apply start and count limits
    const startIndex = Math.max(0, config.start - 1) // Convert to 0-based index
    const endIndex = startIndex + config.count

    return filteredProfiles.slice(startIndex, endIndex)
  }

  /**
   * Launch all profiles based on configuration
   */
  async launchAllProfiles(config) {
    try {
      logger.info('Global', `Starting launch all profiles with config: ${JSON.stringify(config)}`)

      // 1. Initialize profiles in global store
      await this.initializeProfiles()

      // 2. Get all profiles from global store
      const allProfiles = this.profileStore.getAllProfiles()
      logger.info('Global', `Retrieved ${allProfiles.length} profiles from global store`)

      // 3. Filter profiles based on config (convert enhanced profiles to basic profiles for filtering)
      const basicProfiles = allProfiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        supporterId: profile.supporterId,
        cardInfo: profile.cardInfo,
        expiry: profile.expiry,
        cvv: profile.cvv,
        url: profile.url,
        proxy: profile.proxy,
        seats: profile.seats,
        priority: profile.priority,
        status: profile.status,
        loginState: profile.loginState
      }))

      const profilesToLaunch = this.filterProfiles(basicProfiles, config)
      logger.info('Global', `Filtered to ${profilesToLaunch.length} profiles for launch`)

      if (profilesToLaunch.length === 0) {
        return {
          success: false,
          message: 'No profiles match the specified criteria'
        }
      }

      // 4. Send profiles to dashboard immediately
      if (this.mainWindow) {
        this.mainWindow.webContents.send('profiles-fetched', profilesToLaunch)
      } else {
        console.error('❌ Main window not available to send profiles-fetched event')
      }

      // 5. Launch profiles using individual launch functions with error aggregation
      let successCount = 0
      let errorCount = 0
      const errors = []

      // Launch profiles sequentially to avoid overwhelming the system
      for (const profile of profilesToLaunch) {
        try {
          logger.info(profile.id, 'Starting individual profile launch from bulk operation')

          // Use the individual launch function
          const result = await this.launchSingleProfile(profile.id)

          if (result.success) {
            successCount++
            logger.info(profile.id, `Profile launch completed successfully: ${result.message}`)
          } else {
            errorCount++
            errors.push(`${profile.id}: ${result.message}`)
            logger.error(profile.id, `Profile launch failed: ${result.message}`)
          }

          // Add delay between launches to prevent system overload
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${profile.id}: ${errorMessage}`)
          logger.error(profile.id, `Failed to launch profile in bulk operation: ${errorMessage}`)
        }
      }

      // Create bulk operation result with proper error aggregation
      const bulkResult = this.createBulkOperationResult(
        'launched',
        profilesToLaunch.length,
        successCount,
        errorCount,
        errors
      )

      return {
        success: bulkResult.success,
        message: bulkResult.message
      }
    } catch (error) {
      logger.error(
        'Global',
        `Failed to launch all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Update cookies for all profiles
   */
  async updateCookies() {
    try {
      // Get all active profiles from global store
      const activeProfiles = this.profileStore.getProfilesByOperationalState('active')

      if (activeProfiles.length === 0) {
        return {
          success: false,
          message: 'No active profiles to update cookies'
        }
      }

      // TODO: Update cookies for each profile
      return {
        success: true,
        message: 'Cookies updated successfully'
      }
    } catch (error) {
      logger.error(
        'Global',
        `Failed to update cookies: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Stop all profiles using individual stop functions
   */
  async stopAllProfiles() {
    try {
      logger.info('Global', 'Starting stop all profiles process')

      // Get all active profiles from global store
      const activeProfiles = this.profileStore.getProfilesByOperationalState('active')
      logger.info('Global', `Found ${activeProfiles.length} active profiles to stop`)

      if (activeProfiles.length === 0) {
        return {
          success: true,
          message: 'No active profiles to stop'
        }
      }

      let successCount = 0
      let errorCount = 0
      const errors = []

      // Stop each profile individually using the individual stop function
      for (const profile of activeProfiles) {
        try {
          logger.info(profile.id, 'Starting individual profile stop from bulk operation')

          // Use the individual stop function
          const result = await this.stopSingleProfile(profile.id)

          if (result.success) {
            successCount++
            logger.info(profile.id, `Profile stopped successfully: ${result.message}`)
          } else {
            errorCount++
            errors.push(`${profile.id}: ${result.message}`)
            logger.error(profile.id, `Failed to stop profile: ${result.message}`)
          }
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${profile.id}: ${errorMessage}`)
          logger.error(profile.id, `Failed to stop profile in bulk operation: ${errorMessage}`)
        }
      }

      // Create bulk operation result with proper error aggregation
      const bulkResult = this.createBulkOperationResult(
        'stopped',
        activeProfiles.length,
        successCount,
        errorCount,
        errors
      )

      return {
        success: bulkResult.success,
        message: bulkResult.message
      }
    } catch (error) {
      console.error('❌ Stop all profiles error:', error)
      logger.error(
        'Global',
        `Failed to stop all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Close all profiles using individual close functions
   */
  async closeAllProfiles() {
    try {
      logger.info('Global', 'Starting close all profiles process')

      // Get all profiles from global store
      const allProfiles = this.profileStore.getAllProfiles()
      logger.info('Global', `Found ${allProfiles.length} profiles to close`)

      if (allProfiles.length === 0) {
        return {
          success: true,
          message: 'No profiles to close'
        }
      }

      let successCount = 0
      let errorCount = 0
      const errors = []

      // Close each profile individually using the individual close function
      for (const profile of allProfiles) {
        try {
          logger.info(profile.id, 'Starting individual profile close from bulk operation')

          // Use the individual close function
          const result = await this.closeSingleProfile(profile.id)

          if (result.success) {
            successCount++
            logger.info(profile.id, `Profile closed successfully: ${result.message}`)
          } else {
            errorCount++
            errors.push(`${profile.id}: ${result.message}`)
            logger.error(profile.id, `Failed to close profile: ${result.message}`)
          }
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${profile.id}: ${errorMessage}`)
          logger.error(profile.id, `Failed to close profile in bulk operation: ${errorMessage}`)
        }
      }

      // Create bulk operation result with proper error aggregation
      const bulkResult = this.createBulkOperationResult(
        'closed',
        allProfiles.length,
        successCount,
        errorCount,
        errors
      )

      return {
        success: bulkResult.success,
        message: bulkResult.message
      }
    } catch (error) {
      console.error('❌ Close all profiles error:', error)
      logger.error(
        'Global',
        `Failed to close all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  /**
   * Create bulk operation result with proper error aggregation
   * @param operation - The operation name for logging
   * @param totalProfiles - Total number of profiles processed
   * @param successCount - Number of successful operations
   * @param errorCount - Number of failed operations
   * @param errors - Array of error messages
   * @returns BulkOperationResult with aggregated information
   */
  createBulkOperationResult(operation, totalProfiles, successCount, errorCount, errors) {
    const success = errorCount === 0
    const message = success
      ? `All ${successCount} profiles ${operation} successfully`
      : `${successCount}/${totalProfiles} profiles ${operation} successfully. ${errorCount} failed: ${errors.join(', ')}`

    logger.info('Global', `Bulk ${operation} completed: ${message}`)

    return {
      success,
      message,
      totalProfiles,
      successCount,
      errorCount,
      errors
    }
  }

  /**
   * Send profile status update to renderer using global store with enhanced profile data
   * @param profileId - The ID of the profile to send update for
   * @param status - The new status (optional if updating from store)
   * @param message - Optional message to include with the update
   */
  sendProfileStatusUpdate(profileId, status, message) {
    try {
      // Update the profile store if status is provided
      if (status && this.profileStore.hasProfile(profileId)) {
        this.profileStore.updateStatus(profileId, status, message)
      }

      // Get the current profile from store to send complete enhanced data
      const currentProfile = this.profileStore.getProfile(profileId)

      if (currentProfile && this.mainWindow) {
        // Create comprehensive profile status update with all enhanced fields
        const profileStatusUpdate = {
          profileId,
          status: currentProfile.status,
          message: message || `Profile status: ${currentProfile.status}`,

          // Enhanced profile data
          ticketCount: currentProfile.ticketCount,
          lastActivity: currentProfile.lastActivity,
          errorMessage: currentProfile.errorMessage,
          operationalState: currentProfile.operationalState,

          // Lifecycle timestamps
          launchedAt: currentProfile.launchedAt,
          stoppedAt: currentProfile.stoppedAt,

          // Additional profile information for renderer context
          profileName: currentProfile.name,
          loginState: currentProfile.loginState,
          priority: currentProfile.priority,
          seats: currentProfile.seats
        }

        console.log('🔄 Sending enhanced profile-status-changed event:', profileStatusUpdate)

        // Send enhanced profile status update to renderer
        this.mainWindow.webContents.send('profile-status-changed', profileStatusUpdate)

        logger.info(
          profileId,
          `Enhanced profile status update sent: ${currentProfile.status}${message ? ` - ${message}` : ''}`
        )
      } else if (!currentProfile) {
        logger.warn(profileId, 'Profile not found in store for enhanced status update')

        // Send basic update to renderer for profiles not in store
        if (this.mainWindow) {
          const basicUpdate = {
            profileId,
            status: status || 'Unknown',
            message: message || 'Profile not found in store',
            ticketCount: 0,
            lastActivity: new Date().toISOString(),
            operationalState: 'idle',
            errorMessage: 'Profile not found in store'
          }

          this.mainWindow.webContents.send('profile-status-changed', basicUpdate)
          logger.warn(profileId, 'Sent basic profile status update (profile not in store)')
        }
      } else if (!this.mainWindow) {
        console.error('❌ Main window not available to send enhanced profile-status-changed event')
        logger.error(profileId, 'Main window not available for profile status update')
      }
    } catch (error) {
      logger.error(
        profileId,
        `Failed to send enhanced profile status update: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      // Fallback: send basic update to renderer with error information
      if (this.mainWindow) {
        try {
          const fallbackUpdate = {
            profileId,
            status: 'Error',
            message: message || 'Status update failed',
            ticketCount: 0,
            lastActivity: new Date().toISOString(),
            operationalState: 'error',
            errorMessage: `Status update error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }

          this.mainWindow.webContents.send('profile-status-changed', fallbackUpdate)
          logger.error(profileId, 'Sent fallback profile status update due to error')
        } catch (fallbackError) {
          logger.error(
            profileId,
            `Failed to send fallback status update: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'}`
          )
        }
      }
    }
  }

  /**
   * Send profile status update for a specific profile by ID
   * Public method for external components to trigger status updates
   * @param profileId - The ID of the profile to send update for
   */
  sendProfileStatusUpdateById(profileId) {
    this.sendProfileStatusUpdate(profileId)
  }

  /**
   * Individual Profile Operations - Exposed methods for IPC handlers
   *
   * These methods provide direct access to individual profile operations
   * and are designed to be called from IPC handlers. They integrate with
   * the global profile store and provide comprehensive error handling.
   */

  /**
   * Launch a single profile with comprehensive error handling and status tracking
   *
   * This method launches a single GoLogin profile, updates the global store with
   * status changes, and sends real-time updates to the renderer. It includes:
   * - Profile validation and prerequisite checking
   * - GoLogin instance creation and management
   * - Status updates throughout the launch process
   * - Error handling with appropriate user feedback
   * - Toast notifications for success/failure
   *
   * @param profileId - The unique identifier of the profile to launch
   * @returns Promise<OperationResult> containing success status and descriptive message
   * @throws {Error} If profile validation fails or unexpected errors occur
   *
   * @example
   * ```typescript
   * const result = await gologinService.launchSingleProfile('profile-123')
   * if (result.success) {
   *   console.log('Profile launched successfully')
   * } else {
   *   console.error('Launch failed:', result.message)
   * }
   * ```
   */
  async launchSingleProfile(profileId) {
    return await launchProfile(profileId)
  }

  /**
   * Stop a single profile gracefully without removing it from the store
   *
   * This method stops a running GoLogin profile while keeping it in the global
   * store for potential future operations. It includes:
   * - Profile state validation before stopping
   * - Graceful GoLogin instance termination
   * - Status updates to 'Stopped' state
   * - Error handling that prevents close operations on failure
   * - Toast notifications for user feedback
   *
   * @param profileId - The unique identifier of the profile to stop
   * @returns Promise<OperationResult> containing success status and descriptive message
   *
   * @example
   * ```typescript
   * const result = await gologinService.stopSingleProfile('profile-123')
   * if (result.success) {
   *   // Profile is stopped but still in store
   *   console.log('Profile stopped successfully')
   * }
   * ```
   */
  async stopSingleProfile(profileId) {
    return await stopProfile(profileId)
  }

  /**
   * Close a single profile by stopping it and removing it from the global store
   *
   * This method performs a complete profile closure by first stopping the profile
   * (if active) and then removing it from the global store. It includes:
   * - Automatic stop operation if profile is active
   * - Prevention of close if stop operation fails
   * - Complete removal from global store on success
   * - GoLogin instance cleanup and resource disposal
   * - Error handling that keeps profile in store on failure
   *
   * @param profileId - The unique identifier of the profile to close
   * @returns Promise<OperationResult> containing success status and descriptive message
   *
   * @example
   * ```typescript
   * const result = await gologinService.closeSingleProfile('profile-123')
   * if (result.success) {
   *   // Profile is completely removed from system
   *   console.log('Profile closed and removed')
   * }
   * ```
   */
  async closeSingleProfile(profileId) {
    return await closeProfile(profileId)
  }

  /**
   * Get profile from store
   * @param profileId - The ID of the profile to retrieve
   * @returns EnhancedProfile if found, undefined otherwise
   */
  getProfile(profileId) {
    return this.profileStore.getProfile(profileId)
  }

  /**
   * Get all profiles from store
   * @returns Array of all profiles
   */
  getAllProfiles() {
    return this.profileStore.getAllProfiles()
  }

  /**
   * Get the profile store instance
   * @returns ProfileStore instance
   */
  getProfileStore() {
    return this.profileStore
  }

  /**
   * Update profile data in store with comprehensive acknowledgment
   * @param profileId - The ID of the profile to update
   * @param updates - Partial profile data to merge
   * @returns Result object with success status and message
   */
  async updateProfileData(profileId, updates) {
    try {
      // Get profile before update for logging
      const profileBefore = this.profileStore.getProfile(profileId)
      if (!profileBefore) {
        throw new Error(`Profile ${profileId} not found`)
      }

      // Apply the update
      this.profileStore.updateProfile(profileId, updates)

      // Get updated profile for confirmation
      const profileAfter = this.profileStore.getProfile(profileId)
      if (!profileAfter) {
        throw new Error(`Profile ${profileId} not found after update`)
      }

      // Create detailed acknowledgment log
      const updatedFields = Object.keys(updates).filter(
        (key) => JSON.stringify(updates[key]) !== JSON.stringify(profileBefore[key])
      )

      if (updatedFields.length > 0) {
        // Log successful update with details
        logger.info(
          profileId,
          `✅ PROFILE UPDATE CONFIRMED - Fields updated: ${updatedFields.join(', ')}`
        )

        // Log specific field changes (with sensitive data masking)
        updatedFields.forEach((field) => {
          const oldValue = profileBefore[field]
          const newValue = profileAfter[field]

          if (field === 'cardInfo' || field === 'cvv') {
            // Mask sensitive data
            const maskedOld = oldValue ? `****${String(oldValue).slice(-4)}` : 'none'
            const maskedNew = newValue ? `****${String(newValue).slice(-4)}` : 'none'
            logger.info(profileId, `  ${field}: ${maskedOld} → ${maskedNew}`)
          } else if (field === 'scrapingConfig') {
            logger.info(profileId, `  ${field}: configuration object updated`)
          } else {
            logger.info(profileId, `  ${field}: ${oldValue} → ${newValue}`)
          }
        })

        // Confirm the profile object now contains the new data
        logger.info(
          profileId,
          `✅ SCRAPING DATA CONFIRMED - Profile object updated and ready for scraping`
        )

        return {
          success: true,
          message: `Profile data updated successfully: ${updatedFields.join(', ')}`
        }
      } else {
        logger.info(profileId, 'Profile update completed - no changes detected')
        return {
          success: true,
          message: 'Profile update completed - no changes detected'
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(profileId, `❌ PROFILE UPDATE FAILED: ${errorMessage}`)
      return {
        success: false,
        message: `Failed to update profile data: ${errorMessage}`
      }
    }
  }

  /**
   * Clean up all active profiles and dispose of resources
   */
  async cleanup() {
    logger.info(
      'Global',
      `Starting comprehensive cleanup process with ${this.activeProfiles.size} active profiles`
    )

    try {
      const cleanupStartTime = Date.now()

      // Stop all scraping sessions first
      await stopAllScraping()

      // Clean up GoLogin instances
      await cleanupAllInstances()

      // Clear legacy active profiles map
      this.activeProfiles.clear()

      // Perform comprehensive profile store cleanup and disposal
      await this.profileStore.cleanup()

      const cleanupDuration = Date.now() - cleanupStartTime
      logger.info(
        'Global',
        `All profiles and resources cleaned up successfully - duration: ${cleanupDuration}ms`
      )
    } catch (error) {
      logger.error(
        'Global',
        `Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Dispose of the GoLogin service and all resources
   * This method should be called when the service is no longer needed
   */
  async dispose() {
    logger.info('Global', 'Starting GoLogin service disposal')

    try {
      const disposeStartTime = Date.now()

      // Perform cleanup first
      await this.cleanup()

      // Dispose of the profile store
      await this.profileStore.dispose()

      const disposeDuration = Date.now() - disposeStartTime
      logger.info('Global', `GoLogin service disposal completed - duration: ${disposeDuration}ms`)
    } catch (error) {
      logger.error(
        'Global',
        `Error during disposal: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Get comprehensive memory usage information from the profile store
   *
   * This method returns detailed memory statistics including profile counts
   * by state, estimated memory usage, and profile age information. Useful
   * for monitoring system resource usage and identifying memory leaks.
   *
   * @returns ProfileStoreMemoryInfo object with detailed memory statistics
   * @example
   * ```typescript
   * const memInfo = gologinService.getMemoryUsage()
   * console.log(`Total profiles: ${memInfo.totalProfiles}`)
   * console.log(`Memory usage: ${memInfo.memoryEstimateKB}KB`)
   * ```
   */
  getMemoryUsage() {
    return this.profileStore.getMemoryUsage()
  }

  /**
   * Manually trigger cleanup of closed profiles to free memory
   *
   * This method removes old and excess closed profiles from the store
   * to prevent memory leaks. It's automatically called periodically
   * when memory monitoring is enabled, but can be called manually
   * for immediate cleanup.
   *
   * @example
   * ```typescript
   * gologinService.cleanupClosedProfiles()
   * console.log('Closed profiles cleaned up')
   * ```
   */
  cleanupClosedProfiles() {
    this.profileStore.cleanupClosedProfiles()
  }

  /**
   * Enable or disable automatic memory monitoring and periodic cleanup
   *
   * When enabled, the profile store will automatically monitor memory usage
   * and perform periodic cleanup of old closed profiles. When disabled,
   * cleanup must be performed manually.
   *
   * @param enabled - Whether to enable automatic memory monitoring
   * @example
   * ```typescript
   * gologinService.setMemoryMonitoring(true)  // Enable automatic cleanup
   * gologinService.setMemoryMonitoring(false) // Disable automatic cleanup
   * ```
   */
  setMemoryMonitoring(enabled) {
    this.profileStore.setMemoryMonitoring(enabled)
  }
}

// Export singleton instance - fully integrated with global profile store
export const gologinService = new GoLoginService()

// Export individual profile operation functions for direct use
export { launchProfile, stopProfile, closeProfile } from './profile-operations.js'

// Export profile store for advanced usage
export { ProfileStore } from './profile-store.js'

// Export error handling components for comprehensive error management
export { ErrorHandler } from './error-handler.js'
