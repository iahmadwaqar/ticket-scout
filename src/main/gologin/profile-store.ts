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

import type { Profile, EnhancedProfile, ProfileStatus } from '../../renderer/src/types'
import { logger } from '../logger-service'

/**
 * Interface for profile store memory usage information
 */
export interface ProfileStoreMemoryInfo {
  totalProfiles: number
  activeProfiles: number
  idleProfiles: number
  errorProfiles: number
  stoppedProfiles: number
  memoryEstimateKB: number
  oldestProfileAge: number
  newestProfileAge: number
  averageProfileSize: number
}

/**
 * Interface defining the ProfileStore contract for global profile management
 * 
 * This interface defines the complete API for profile store operations including
 * CRUD operations, status management, and memory management. All implementations
 * must provide O(1) access time for profile retrieval and thread-safe operations.
 * 
 * The ProfileStore serves as the central repository for all profile data and
 * provides the foundation for the enhanced profile management system.
 */
export interface ProfileStoreInterface {
  // Core CRUD operations
  addProfile(profile: EnhancedProfile): void
  updateProfile(profileId: string, updates: Partial<EnhancedProfile>): void
  removeProfile(profileId: string): void
  getProfile(profileId: string): EnhancedProfile | undefined
  getAllProfiles(): EnhancedProfile[]

  // Status operations
  updateStatus(profileId: string, status: ProfileStatus, message?: string): void
  updateTicketCount(profileId: string, count: number): void
  setError(profileId: string, error: string): void

  // Utility methods
  hasProfile(profileId: string): boolean
  getProfileCount(): number
  clear(): void

  // Cleanup and memory management
  cleanup(): Promise<void>
  getMemoryUsage(): ProfileStoreMemoryInfo
  cleanupClosedProfiles(): void
  dispose(): Promise<void>
}

/**
 * ProfileStore class providing Map-based storage for O(1) profile access
 * Manages profile data with lifecycle tracking and status updates
 */
export class ProfileStore implements ProfileStoreInterface {
  private profiles: Map<string, EnhancedProfile> = new Map()
  private isDisposed: boolean = false
  private cleanupInterval: NodeJS.Timeout | null = null
  private memoryMonitoringEnabled: boolean = true
  
  // Memory management configuration
  private readonly MAX_CLOSED_PROFILES_RETENTION = 100
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_PROFILE_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    // Start periodic cleanup if memory monitoring is enabled
    if (this.memoryMonitoringEnabled) {
      this.startPeriodicCleanup()
    }
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
  addProfile(profile: EnhancedProfile): void {
    try {
      // Set initial timestamps if not provided
      const enhancedProfile: EnhancedProfile = {
        ...profile,
        lastActivity: profile.lastActivity || new Date().toISOString(),
        ticketCount: profile.ticketCount || 0,
        operationalState: profile.operationalState || 'idle'
      }

      this.profiles.set(profile.id, enhancedProfile)
      logger.info(profile.id, `Profile added to store: ${profile.name}`)
    } catch (error) {
      logger.error(profile.id, `Failed to add profile to store: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  updateProfile(profileId: string, updates: Partial<EnhancedProfile>): void {
    try {
      const existingProfile = this.profiles.get(profileId)
      if (!existingProfile) {
        logger.error(profileId, 'Cannot update profile: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Merge updates with existing profile and update lastActivity
      const updatedProfile: EnhancedProfile = {
        ...existingProfile,
        ...updates,
        lastActivity: new Date().toISOString()
      }

      this.profiles.set(profileId, updatedProfile)
      logger.info(profileId, `Profile updated in store`)
    } catch (error) {
      logger.error(profileId, `Failed to update profile in store: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Remove a profile from the store
   * @param profileId - The ID of the profile to remove
   */
  removeProfile(profileId: string): void {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot remove profile: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      this.profiles.delete(profileId)
      logger.info(profileId, `Profile removed from store: ${profile.name}`)
    } catch (error) {
      logger.error(profileId, `Failed to remove profile from store: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Get a profile by ID (O(1) access time)
   * @param profileId - The ID of the profile to retrieve
   * @returns The profile if found, undefined otherwise
   */
  getProfile(profileId: string): EnhancedProfile | undefined {
    return this.profiles.get(profileId)
  }

  /**
   * Get all profiles as an array
   * @returns Array of all profiles in the store
   */
  getAllProfiles(): EnhancedProfile[] {
    return Array.from(this.profiles.values())
  }

  /**
   * Update profile status with optional message
   * @param profileId - The ID of the profile to update
   * @param status - The new status to set
   * @param message - Optional message to include
   */
  updateStatus(profileId: string, status: ProfileStatus, message?: string): void {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot update status: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      // Determine operational state based on status
      let operationalState: 'idle' | 'active' | 'error' | 'stopping' = 'idle'
      switch (status) {
        case 'Launching':
        case 'Ready':
        case 'LoggedIn':
        case 'Navigating':
        case 'Scraping':
          operationalState = 'active'
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
      const updates: Partial<EnhancedProfile> = {
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
      logger.info(profileId, `Status updated to ${status}${message ? `: ${message}` : ''}`)
    } catch (error) {
      logger.error(profileId, `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Update the ticket count for a profile
   * @param profileId - The ID of the profile to update
   * @param count - The new ticket count
   */
  updateTicketCount(profileId: string, count: number): void {
    try {
      const profile = this.profiles.get(profileId)
      if (!profile) {
        logger.error(profileId, 'Cannot update ticket count: Profile not found in store')
        throw new Error(`Profile with ID ${profileId} not found`)
      }

      this.updateProfile(profileId, { ticketCount: count })
      logger.info(profileId, `Ticket count updated to ${count}`)
    } catch (error) {
      logger.error(profileId, `Failed to update ticket count: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Set an error message for a profile and update status to Error
   * @param profileId - The ID of the profile to update
   * @param error - The error message to set
   */
  setError(profileId: string, error: string): void {
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
      logger.error(profileId, `Failed to set error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Check if a profile exists in the store
   * @param profileId - The ID of the profile to check
   * @returns True if profile exists, false otherwise
   */
  hasProfile(profileId: string): boolean {
    return this.profiles.has(profileId)
  }

  /**
   * Get the total number of profiles in the store
   * @returns The number of profiles
   */
  getProfileCount(): number {
    return this.profiles.size
  }

  /**
   * Clear all profiles from the store
   * Used for cleanup and memory management
   */
  clear(): void {
    const profileCount = this.profiles.size
    this.profiles.clear()
    logger.info('Global', `Profile store cleared: ${profileCount} profiles removed`)
  }

  /**
   * Get profiles by status
   * @param status - The status to filter by
   * @returns Array of profiles with the specified status
   */
  getProfilesByStatus(status: ProfileStatus): EnhancedProfile[] {
    return Array.from(this.profiles.values()).filter(profile => profile.status === status)
  }

  /**
   * Get profiles by operational state
   * @param operationalState - The operational state to filter by
   * @returns Array of profiles with the specified operational state
   */
  getProfilesByOperationalState(operationalState: 'idle' | 'active' | 'error' | 'stopping'): EnhancedProfile[] {
    return Array.from(this.profiles.values()).filter(profile => profile.operationalState === operationalState)
  }

  /**
   * Convert a basic Profile to an EnhancedProfile
   * @param profile - The basic profile to enhance
   * @returns Enhanced profile with additional fields
   */
  static enhanceProfile(profile: Profile): EnhancedProfile {
    return {
      ...profile,
      ticketCount: 0,
      lastActivity: new Date().toISOString(),
      operationalState: 'idle'
    }
  }

  /**
   * Start periodic cleanup process for memory management
   * @private
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      if (!this.isDisposed) {
        this.cleanupClosedProfiles()
        this.logMemoryUsage()
      }
    }, this.CLEANUP_INTERVAL_MS)

    logger.info('Global', `Profile store periodic cleanup started - interval: ${this.CLEANUP_INTERVAL_MS}ms`)
  }

  /**
   * Stop periodic cleanup process
   * @private
   */
  private stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      logger.info('Global', 'Profile store periodic cleanup stopped')
    }
  }

  /**
   * Log current memory usage for monitoring
   * @private
   */
  private logMemoryUsage(): void {
    try {
      const memoryInfo = this.getMemoryUsage()
      logger.info('Global', `Profile store memory usage - profiles: ${memoryInfo.totalProfiles}, active: ${memoryInfo.activeProfiles}, memory: ${memoryInfo.memoryEstimateKB}KB`)
    } catch (error) {
      logger.error('Global', `Failed to log memory usage: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate estimated memory usage of a profile
   * @param profile - The profile to calculate size for
   * @returns Estimated size in bytes
   * @private
   */
  private calculateProfileSize(profile: EnhancedProfile): number {
    try {
      // Estimate memory usage based on string lengths and object structure
      const jsonString = JSON.stringify(profile)
      return jsonString.length * 2 // Rough estimate: 2 bytes per character for UTF-16
    } catch (error) {
      // Fallback estimation if JSON.stringify fails
      return 1024 // 1KB default estimate
    }
  }

  /**
   * Check if a profile is considered old based on last activity
   * @param profile - The profile to check
   * @returns True if profile is old, false otherwise
   * @private
   */
  private isProfileOld(profile: EnhancedProfile): boolean {
    try {
      const lastActivity = new Date(profile.lastActivity)
      const now = new Date()
      const ageMs = now.getTime() - lastActivity.getTime()
      return ageMs > this.MAX_PROFILE_AGE_MS
    } catch (error) {
      // If we can't parse the date, consider it old for safety
      return true
    }
  }

  /**
   * Clean up closed profiles to prevent memory leaks
   * Removes old stopped/closed profiles while keeping recent ones for reference
   */
  cleanupClosedProfiles(): void {
    if (this.isDisposed) {
      logger.warn('Global', 'Cannot cleanup closed profiles: ProfileStore is disposed')
      return
    }

    try {
      const beforeCount = this.profiles.size
      const closedProfiles = Array.from(this.profiles.values()).filter(
        profile => profile.status === 'Stopped' || profile.operationalState === 'idle'
      )

      logger.info('Global', `Starting cleanup of closed profiles - total: ${beforeCount}, closed: ${closedProfiles.length}`)

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
          this.profiles.delete(profile.id)
          removedCount++
          removedOldCount++
          logger.info(profile.id, `Removed old closed profile: ${profile.name} (age: ${this.getProfileAge(profile)}ms)`)
        }
      }

      // If we still have too many closed profiles, remove the oldest ones
      const remainingClosed = closedProfiles.filter(p => !this.isProfileOld(p))
      if (remainingClosed.length > this.MAX_CLOSED_PROFILES_RETENTION) {
        const excessCount = remainingClosed.length - this.MAX_CLOSED_PROFILES_RETENTION
        const profilesToRemove = remainingClosed.slice(0, excessCount)

        for (const profile of profilesToRemove) {
          this.profiles.delete(profile.id)
          removedCount++
          logger.info(profile.id, `Removed excess closed profile: ${profile.name}`)
        }
      }

      const afterCount = this.profiles.size
      logger.info('Global', `Closed profile cleanup completed - removed: ${removedCount} (${removedOldCount} old), remaining: ${afterCount}`)

    } catch (error) {
      logger.error('Global', `Failed to cleanup closed profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the age of a profile in milliseconds
   * @param profile - The profile to check
   * @returns Age in milliseconds
   * @private
   */
  private getProfileAge(profile: EnhancedProfile): number {
    try {
      const lastActivity = new Date(profile.lastActivity)
      const now = new Date()
      return now.getTime() - lastActivity.getTime()
    } catch (error) {
      return 0
    }
  }

  /**
   * Get comprehensive memory usage information for the profile store
   * @returns ProfileStoreMemoryInfo with detailed memory statistics
   */
  getMemoryUsage(): ProfileStoreMemoryInfo {
    if (this.isDisposed) {
      return {
        totalProfiles: 0,
        activeProfiles: 0,
        idleProfiles: 0,
        errorProfiles: 0,
        stoppedProfiles: 0,
        memoryEstimateKB: 0,
        oldestProfileAge: 0,
        newestProfileAge: 0,
        averageProfileSize: 0
      }
    }

    try {
      const allProfiles = Array.from(this.profiles.values())
      const totalProfiles = allProfiles.length

      // Count profiles by operational state
      const activeProfiles = allProfiles.filter(p => p.operationalState === 'active').length
      const idleProfiles = allProfiles.filter(p => p.operationalState === 'idle').length
      const errorProfiles = allProfiles.filter(p => p.operationalState === 'error').length
      const stoppedProfiles = allProfiles.filter(p => p.status === 'Stopped').length

      // Calculate memory usage
      let totalMemoryBytes = 0
      const profileSizes: number[] = []

      for (const profile of allProfiles) {
        const size = this.calculateProfileSize(profile)
        totalMemoryBytes += size
        profileSizes.push(size)
      }

      const memoryEstimateKB = Math.round(totalMemoryBytes / 1024)
      const averageProfileSize = profileSizes.length > 0 
        ? Math.round(profileSizes.reduce((sum, size) => sum + size, 0) / profileSizes.length)
        : 0

      // Calculate profile ages
      const now = new Date().getTime()
      const profileAges = allProfiles.map(p => {
        try {
          return now - new Date(p.lastActivity).getTime()
        } catch {
          return 0
        }
      })

      const oldestProfileAge = profileAges.length > 0 ? Math.max(...profileAges) : 0
      const newestProfileAge = profileAges.length > 0 ? Math.min(...profileAges) : 0

      return {
        totalProfiles,
        activeProfiles,
        idleProfiles,
        errorProfiles,
        stoppedProfiles,
        memoryEstimateKB,
        oldestProfileAge,
        newestProfileAge,
        averageProfileSize
      }

    } catch (error) {
      logger.error('Global', `Failed to calculate memory usage: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Return safe fallback values
      return {
        totalProfiles: this.profiles.size,
        activeProfiles: 0,
        idleProfiles: 0,
        errorProfiles: 0,
        stoppedProfiles: 0,
        memoryEstimateKB: 0,
        oldestProfileAge: 0,
        newestProfileAge: 0,
        averageProfileSize: 0
      }
    }
  }

  /**
   * Comprehensive cleanup method for application shutdown
   * Handles graceful cleanup of all profiles and resources
   */
  async cleanup(): Promise<void> {
    if (this.isDisposed) {
      logger.warn('Global', 'ProfileStore cleanup called but already disposed')
      return
    }

    try {
      logger.info('Global', `Starting ProfileStore cleanup - profiles: ${this.profiles.size}`)
      const cleanupStartTime = Date.now()

      // Stop periodic cleanup
      this.stopPeriodicCleanup()

      // Get memory usage before cleanup for logging
      const memoryInfoBefore = this.getMemoryUsage()
      logger.info('Global', `Pre-cleanup memory usage - profiles: ${memoryInfoBefore.totalProfiles}, memory: ${memoryInfoBefore.memoryEstimateKB}KB`)

      // Clean up closed profiles first
      this.cleanupClosedProfiles()

      // Log remaining active profiles that will be cleared
      const activeProfiles = this.getProfilesByOperationalState('active')
      if (activeProfiles.length > 0) {
        logger.info('Global', `Clearing ${activeProfiles.length} active profiles during cleanup`)
        for (const profile of activeProfiles) {
          logger.info(profile.id, `Active profile being cleared: ${profile.name} (status: ${profile.status})`)
        }
      }

      // Clear all remaining profiles
      const profileCount = this.profiles.size
      this.profiles.clear()

      const cleanupDuration = Date.now() - cleanupStartTime
      logger.info('Global', `ProfileStore cleanup completed - cleared: ${profileCount} profiles, duration: ${cleanupDuration}ms`)

    } catch (error) {
      logger.error('Global', `ProfileStore cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Dispose of the ProfileStore and release all resources
   * This method should be called when the ProfileStore is no longer needed
   */
  async dispose(): Promise<void> {
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
      logger.error('Global', `ProfileStore disposal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Check if the ProfileStore has been disposed
   * @returns True if disposed, false otherwise
   */
  isProfileStoreDisposed(): boolean {
    return this.isDisposed
  }

  /**
   * Enable or disable memory monitoring and periodic cleanup
   * @param enabled - Whether to enable memory monitoring
   */
  setMemoryMonitoring(enabled: boolean): void {
    if (this.isDisposed) {
      logger.warn('Global', 'Cannot set memory monitoring: ProfileStore is disposed')
      return
    }

    this.memoryMonitoringEnabled = enabled
    
    if (enabled && !this.cleanupInterval) {
      this.startPeriodicCleanup()
      logger.info('Global', 'Memory monitoring enabled')
    } else if (!enabled && this.cleanupInterval) {
      this.stopPeriodicCleanup()
      logger.info('Global', 'Memory monitoring disabled')
    }
  }
}