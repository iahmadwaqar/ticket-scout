/**
 * Profile Store - Data management for GoLogin profiles
 *
 * This file contains the ProfileStore class and related interfaces
 * for managing profile data in a global Map-based storage system.
 *
 * Features:
 * - ProfileStore class with Map-based storage for O(1) access
 * - Methods for addProfile, updateProfile, removeProfile, getProfile, getAllProfiles
 * - Status update methods: updateStatus, updateTicketCount, setError
 * - Profile lifecycle tracking with timestamps
 */

import { logger } from '../../utils/logger-service.js'
import { dummyProfiles } from '../../../shared/dummyProfiles.js'
import { profileEventService } from '../../utils/profile-event-service.js'
import { LOGIN_STATUSES } from '../../../shared/status-constants.js'

/**
 * ProfileStore class providing Map-based storage for O(1) profile access
 * Manages profile data with lifecycle tracking and status updates
 */
class ProfileStore {
  constructor() {
    this.profiles = new Map() // Profile data
    this.bots = new Map() // Bot instances (SingleProfileTicketBot)
    this.instances = new Map() // Browser instances (GoLogin, browser, CDP)
    this.metadata = new Map() // Operational metadata (status, timestamps)
    this.isDisposed = false
  }

  /**
   * Get profiles from Database
   */
  async getProfilesFromDB(config) {
    // TODO: Get profiles from Database and return them
    // return new Promise((resolve, reject) => {
    //   db.all('SELECT * FROM profiles', (err, rows) => {
    //     if (err) {
    //       reject(err)
    //     } else {
    //       resolve(rows)
    //     }
    //   })
    // })
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, 1500)
    })

    let addedCount = 0
    let skippedCount = 0

    dummyProfiles.slice(0, config?.profileCount || dummyProfiles.length).forEach((profile) => {
      const wasAdded = this.addProfile(profile)
      if (wasAdded) {
        addedCount++
      } else {
        skippedCount++
      }
    })

    logger.info(
      'Global',
      `Profile loading completed - Added: ${addedCount}, Skipped (duplicates): ${skippedCount}`
    )

    return this.getAllProfiles()
  }

  /**
   * Add a new profile to the store with automatic enhancement
   *
   * This method adds a new profile to the global store, automatically setting
   * default values for enhanced fields if not provided. The profile is stored
   * in a Map for O(1) access time and includes proper error handling.
   *
   * @param profile - The enhanced profile object to add to the store
   * @throws {Error} If the profile cannot be added due to validation or storage issues
   * @example
   * ```typescript
   * const profile = ProfileStore.enhanceProfile(basicProfile)
   * profileStore.addProfile(profile)
   * ```
   */
  addProfile(profile) {
    try {
      // Check if profile already exists to prevent duplicates
      if (this.profiles.has(profile.id)) {
        return false // Return false to indicate no addition occurred
      }

      // Set initial timestamps if not provided
      const enhancedProfile = {
        ...profile,
        lastActivity: profile.lastActivity || new Date().toISOString(),
        ticketCount: profile.ticketCount || 0,
        operationalState: profile.operationalState || 'idle',
        status: 'Idle',
        loginState: LOGIN_STATUSES.LOGGED_OUT
      }

      this.profiles.set(profile.id, enhancedProfile)
      return true // Return true to indicate successful addition
    } catch (error) {
      logger.error(
        profile.id,
        `Failed to add profile to store: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Update an existing profile with partial data and automatic timestamp tracking
   *
   * This method merges the provided updates with the existing profile data,
   * automatically updating the lastActivity timestamp. It provides atomic
   * updates and maintains data consistency.
   *
   * @param profileId - The unique identifier of the profile to update
   * @param updates - Partial profile data to merge with existing profile
   * @throws {Error} If the profile is not found or update fails
   * @example
   * ```typescript
   * profileStore.updateProfile('profile-123', {
   *   ticketCount: 5,
   *   status: 'Success'
   * })
   * ```
   */
  updateProfile(profileId, updates) {
    try {
      const existingProfile = this.profiles.get(profileId)
      if (!existingProfile) {
        logger.error(profileId, 'Cannot update profile: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Merge updates with existing profile and update lastActivity
      const updatedProfile = {
        ...existingProfile,
        ...updates,
        lastActivity: new Date().toISOString()
      }

      this.profiles.set(profileId, updatedProfile)

      // Broadcast profile data update to renderer
      profileEventService.broadcastProfileDataUpdate(profileId, updatedProfile)
    } catch (error) {
      logger.error(
        profileId,
        `Failed to update profile in store: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Remove a profile from the store
   * @param profileId - The ID of the profile to remove
   */
  removeProfile(profileId) {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot remove profile: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Clean up associated data
      this.clearBotInstance(profileId)
      this.clearGoLoginInstances(profileId)
      this.metadata.delete(profileId)
      this.profiles.delete(profileId)

      // Always broadcast profile removal to renderer (individual profile updates)
      profileEventService.broadcastProfileRemoved(profileId)

      // Check if all profiles are now closed and broadcast if so
      if (this.profiles.size === 0) {
        profileEventService.broadcastAllProfilesClosed()
      }
    } catch (error) {
      logger.error(
        profileId,
        `Failed to remove profile from store: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Get a profile by ID (O(1) access time)
   * @param profileId - The ID of the profile to retrieve
   * @returns The profile if found, undefined otherwise
   */
  getProfile(profileId) {
    return this.profiles.get(profileId)
  }

  /**
   * Get all profiles as an array
   * @returns Array of all profiles in the store
   */
  getAllProfiles() {
    return Array.from(this.profiles.values())
  }

  /**
   * Update profile status with optional message
   * @param profileId - The ID of the profile to update
   * @param status - The new status to set
   * @param message - Optional message to include
   */
  updateStatus(profileId, status, message) {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot update status: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Determine operational state based on status
      let operationalState = 'idle'
      switch (status) {
        case 'Launching':
        case 'Ready':
        case 'LoggedIn':
        case 'Navigating':
        case 'Scraping':
        case 'SearchingTickets':
        case 'RandomBrowsing':
        case 'InQueue':
          operationalState = 'active'
          break
        case 'WaitingForCaptcha':
        case 'SessionExpired':
        case 'RateLimited':
          operationalState = 'active' // Still active but waiting
          break
        case 'Error':
          operationalState = 'error'
          break
        case 'Stopping':
          operationalState = 'stopping'
          break
        case 'Idle':
        case 'Success':
        case 'Stopped':
        default:
          operationalState = 'idle'
          break
      }

      // Update profile with new status and operational state
      const updates = {
        status,
        operationalState,
        lastActivity: new Date().toISOString()
      }

      // Set timestamps for specific status changes
      if (status === 'Launching' && !profile.launchedAt) {
        updates.launchedAt = new Date().toISOString()
      } else if (status === 'Stopped' || status === 'Error') {
        updates.stoppedAt = new Date().toISOString()
      }

      // Clear error message if status is not Error
      if (status !== 'Error') {
        updates.errorMessage = undefined
      } else if (message) {
        updates.errorMessage = message
      }

      this.updateProfile(profileId, updates)

      // Broadcast status update to renderer with specific status data
      profileEventService.broadcastProfileStatusUpdate(profileId, {
        status,
        operationalState,
        message,
        errorMessage: updates.errorMessage,
        launchedAt: updates.launchedAt,
        stoppedAt: updates.stoppedAt,
        lastActivity: updates.lastActivity
      })
    } catch (error) {
      logger.error(
        profileId,
        `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Update profile login state with optional message
   * @param profileId - The ID of the profile to update
   * @param loginState - The new login state to set
   * @param message - Optional message to include
   */
  updateLoginState(profileId, loginState, message) {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot update login state: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Update profile with new login state
      const updates = {
        loginState,
        lastActivity: new Date().toISOString()
      }

      this.updateProfile(profileId, updates)

      // Broadcast login state update to renderer with specific data
      profileEventService.broadcastProfileStatusUpdate(profileId, {
        loginState,
        status: profile.status,
        operationalState: profile.operationalState,
        message,
        lastActivity: updates.lastActivity
      })
    } catch (error) {
      logger.error(
        profileId,
        `Failed to update login state: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Update the ticket count for a profile
   * @param profileId - The ID of the profile to update
   * @param count - The new ticket count
   */
  updateTicketCount(profileId, count) {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot update ticket count: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      this.updateProfile(profileId, { ticketCount: count })

      // Broadcast specific ticket count update
      profileEventService.broadcastProfileStatusUpdate(profileId, {
        ticketCount: count,
        status: profile.status,
        operationalState: profile.operationalState
      })
    } catch (error) {
      logger.error(
        profileId,
        `Failed to update ticket count: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Set an error message for a profile and update status to Error
   * @param profileId - The ID of the profile to update
   * @param error - The error message to set
   */
  setError(profileId, error) {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot set error: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      this.updateProfile(profileId, {
        status: 'Error',
        operationalState: 'error',
        errorMessage: error,
        stoppedAt: new Date().toISOString()
      })

      logger.error(profileId, `Error set: ${error}`)
    } catch (error) {
      logger.error(
        profileId,
        `Failed to set error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Check if a profile exists in the store
   * @param profileId - The ID of the profile to check
   * @returns True if profile exists, false otherwise
   */
  hasProfile(profileId) {
    return this.profiles.has(profileId)
  }

  /**
   * Get the total number of profiles in the store
   * @returns The number of profiles
   */
  getProfileCount() {
    return this.profiles.size
  }

  /**
   * Clear all profiles from the store
   * Used for cleanup and memory management
   */
  clear() {
    const profileCount = this.profiles.size
    const botCount = this.bots.size
    const instanceCount = this.instances.size
    const metadataCount = this.metadata.size

    // Clear all maps
    this.profiles.clear()
    this.bots.clear()
    this.instances.clear()
    this.metadata.clear()
  }

  /**
   * Get profiles by status
   * @param status - The status to filter by
   * @returns Array of profiles with the specified status
   */
  getProfilesByStatus(status) {
    return Array.from(this.profiles.values()).filter((profile) => profile.status === status)
  }

  /**
   * Get profiles by operational state
   * @param operationalState - The operational state to filter by
   * @returns Array of profiles with the specified operational state
   */
  getProfilesByOperationalState(operationalState) {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.operationalState === operationalState
    )
  }

  /**
   * Set bot instance for a profile
   * @param profileId - The ID of the profile
   * @param bot - The SingleProfileTicketBot instance
   */
  setBotInstance(profileId, bot) {
    try {
      if (!this.profiles.has(profileId)) {
        throw new Error(`Profile with ID ${profileId} not found`)
      }
      this.bots.set(profileId, bot)
    } catch (error) {
      logger.error(
        profileId,
        `Failed to set bot instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Get bot instance for a profile
   * @param profileId - The ID of the profile
   * @returns The bot instance if found, undefined otherwise
   */
  getBotInstance(profileId) {
    return this.bots.get(profileId)
  }

  /**
   * Set GoLogin instances for a profile
   * @param profileId - The ID of the profile
   * @param instances - Object containing gologin, browser, and cdp instances
   */
  setGoLoginInstances(profileId, instances) {
    try {
      if (!this.profiles.has(profileId)) {
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      const { gologin, browser, cdp } = instances
      this.instances.set(profileId, {
        gologin,
        browser,
        cdp,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      })
    } catch (error) {
      logger.error(
        profileId,
        `Failed to set GoLogin instances: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Get GoLogin instances for a profile
   * @param profileId - The ID of the profile
   * @returns The instances object if found, undefined otherwise
   */
  getGoLoginInstances(profileId) {
    const instances = this.instances.get(profileId)
    if (instances) {
      // Update last used timestamp
      instances.lastUsed = new Date().toISOString()
      this.instances.set(profileId, instances)
    }
    return instances
  }

  /**
   * Clear bot instance for a profile
   * @param profileId - The ID of the profile
   */
  clearBotInstance(profileId) {
    try {
      const removed = this.bots.delete(profileId)
      if (removed) {
      }
    } catch (error) {
      logger.error(
        profileId,
        `Failed to clear bot instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clear GoLogin instances for a profile
   * @param profileId - The ID of the profile
   */
  clearGoLoginInstances(profileId) {
    try {
      const instances = this.instances.get(profileId)
      if (instances) {
        // Cleanup browser resources if they exist
        if (instances.browser) {
          // Note: Actual browser cleanup should be handled by the calling code
        }
        if (instances.cdp) {
          // Note: Actual CDP cleanup should be handled by the calling code
        }

        this.instances.delete(profileId)
      }
    } catch (error) {
      logger.error(
        profileId,
        `Failed to clear GoLogin instances: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Set operational metadata for a profile
   * @param profileId - The ID of the profile
   * @param metadata - Metadata object
   */
  setMetadata(profileId, metadata) {
    try {
      if (!this.profiles.has(profileId)) {
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      const existingMetadata = this.metadata.get(profileId) || {}
      const updatedMetadata = {
        ...existingMetadata,
        ...metadata,
        lastUpdated: new Date().toISOString()
      }

      this.metadata.set(profileId, updatedMetadata)
    } catch (error) {
      logger.error(
        profileId,
        `Failed to set metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Get operational metadata for a profile
   * @param profileId - The ID of the profile
   * @returns The metadata object if found, undefined otherwise
   */
  getMetadata(profileId) {
    return this.metadata.get(profileId)
  }

  /**
   * Get all active bot instances
   * @returns Array of profileId and bot instance pairs
   */
  getAllBotInstances() {
    return Array.from(this.bots.entries()).map(([profileId, bot]) => ({
      profileId,
      bot
    }))
  }

  /**
   * Get all active GoLogin instances
   * @returns Array of profileId and instances pairs
   */
  getAllGoLoginInstances() {
    return Array.from(this.instances.entries()).map(([profileId, instances]) => ({
      profileId,
      instances
    }))
  }

  /**
   * Check if profile has active bot instance
   * @param profileId - The ID of the profile
   * @returns True if bot instance exists, false otherwise
   */
  hasBotInstance(profileId) {
    return this.bots.has(profileId)
  }

  /**
   * Check if profile has active GoLogin instances
   * @param profileId - The ID of the profile
   * @returns True if instances exist, false otherwise
   */
  hasGoLoginInstances(profileId) {
    return this.instances.has(profileId)
  }

  /**
   * Convert a basic Profile to an EnhancedProfile
   * @param profile - The basic profile to enhance
   * @returns Enhanced profile with additional fields
   */
  static enhanceProfile(profile) {
    return {
      ...profile,
      ticketCount: 0,
      lastActivity: new Date().toISOString(),
      operationalState: 'idle'
    }
  }

  /**
   * Clean up closed profiles to prevent memory leaks
   * Removes old stopped/closed profiles while keeping recent ones for reference
   */
  cleanupClosedProfiles() {
    if (this.isDisposed) {
      logger.warn('Global', 'Cannot cleanup closed profiles: ProfileStore is disposed')
      return
    }

    try {
      const beforeCount = this.profiles.size
      const closedProfiles = Array.from(this.profiles.values()).filter(
        (profile) => profile.status === 'Stopped' || profile.operationalState === 'idle'
      )

      logger.info(
        'Global',
        `Starting cleanup of closed profiles - total: ${beforeCount}, closed: ${closedProfiles.length}`
      )

      // Sort closed profiles by last activity (oldest first)
      closedProfiles.sort((a, b) => {
        const aTime = new Date(a.lastActivity).getTime()
        const bTime = new Date(b.lastActivity).getTime()
        return aTime - bTime
      })

      let removedCount = 0
      let removedOldCount = 0

      // Remove old profiles first
      for (const profile of closedProfiles) {
        if (this.isProfileOld(profile)) {
          // Clean up all associated data
          this.clearBotInstance(profile.id)
          this.clearGoLoginInstances(profile.id)
          this.metadata.delete(profile.id)
          this.profiles.delete(profile.id)
          removedCount++
          removedOldCount++
        }
      }

      // If we still have too many closed profiles, remove the oldest ones
      const remainingClosed = closedProfiles.filter((p) => !this.isProfileOld(p))
      if (remainingClosed.length > this.MAX_CLOSED_PROFILES_RETENTION) {
        const excessCount = remainingClosed.length - this.MAX_CLOSED_PROFILES_RETENTION
        const profilesToRemove = remainingClosed.slice(0, excessCount)

        for (const profile of profilesToRemove) {
          // Clean up all associated data
          this.clearBotInstance(profile.id)
          this.clearGoLoginInstances(profile.id)
          this.metadata.delete(profile.id)
          this.profiles.delete(profile.id)
          removedCount++
        }
      }

      const afterCount = this.profiles.size
      logger.info(
        'Global',
        `Closed profile cleanup completed - removed: ${removedCount} (${removedOldCount} old), remaining: ${afterCount}`
      )
    } catch (error) {
      logger.error(
        'Global',
        `Failed to cleanup closed profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Comprehensive cleanup method for application shutdown
   * Handles graceful cleanup of all profiles and resources
   */
  async cleanup() {
    if (this.isDisposed) {
      logger.warn('Global', 'ProfileStore cleanup called but already disposed')
      return
    }

    try {
      logger.info(
        'Global',
        `Starting ProfileStore cleanup - profiles: ${this.profiles.size}, bots: ${this.bots.size}, instances: ${this.instances.size}`
      )
      const cleanupStartTime = Date.now()

      // Stop periodic cleanup
      this.stopPeriodicCleanup()

      // Get memory usage before cleanup for logging
      const memoryInfoBefore = this.getMemoryUsage()
      logger.info(
        'Global',
        `Pre-cleanup memory usage - profiles: ${memoryInfoBefore.totalProfiles}, memory: ${memoryInfoBefore.memoryEstimateKB}KB`
      )

      // Clean up closed profiles first
      this.cleanupClosedProfiles()

      // Log remaining active profiles that will be cleared
      const activeProfiles = this.getProfilesByOperationalState('active')
      if (activeProfiles.length > 0) {
        logger.info('Global', `Clearing ${activeProfiles.length} active profiles during cleanup`)
        for (const profile of activeProfiles) {
          // Clean up associated resources
          this.clearBotInstance(profile.id)
          this.clearGoLoginInstances(profile.id)
        }
      }

      // Clear all remaining data
      const profileCount = this.profiles.size
      const botCount = this.bots.size
      const instanceCount = this.instances.size
      const metadataCount = this.metadata.size

      this.profiles.clear()
      this.bots.clear()
      this.instances.clear()
      this.metadata.clear()

      const cleanupDuration = Date.now() - cleanupStartTime
      logger.info(
        'Global',
        `ProfileStore cleanup completed - cleared: ${profileCount} profiles, ${botCount} bots, ${instanceCount} instances, ${metadataCount} metadata, duration: ${cleanupDuration}ms`
      )
    } catch (error) {
      logger.error(
        'Global',
        `ProfileStore cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  /**
   * Dispose of the ProfileStore and release all resources
   * This method should be called when the ProfileStore is no longer needed
   */
  async dispose() {
    if (this.isDisposed) {
      logger.warn('Global', 'ProfileStore dispose called but already disposed')
      return
    }

    try {
      logger.info('Global', 'Starting ProfileStore disposal')
      const disposeStartTime = Date.now()

      // Mark as disposed to prevent further operations
      this.isDisposed = true

      // Perform cleanup
      await this.cleanup()

      const disposeDuration = Date.now() - disposeStartTime
      logger.info('Global', `ProfileStore disposal completed - duration: ${disposeDuration}ms`)
    } catch (error) {
      logger.error(
        'Global',
        `ProfileStore disposal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }
}

export const profileStore = new ProfileStore()
