// Service adapter for Electron environment
// This file adapts the original Next.js services to use Electron IPC communication

import type { Profile, SystemMetrics, PriorityLevel } from '../types'
import { errorService } from './error-service'

/**
 * Service adapter that provides the same interface as the original Next.js services
 * but uses Electron IPC communication instead of HTTP requests
 */
class ElectronServiceAdapter {
  /**
   * Launches a scraping process for a given profile.
   * @param profileId - The ID of the profile to launch.
   */
  async launchProfile(profileId: string): Promise<{ success: boolean }> {
    try {
      console.log(`[RENDERER] Launching profile: ${profileId}`)
      return await window.api.launchProfile(profileId)
    } catch (error) {
      console.error(`[RENDERER] Failed to launch profile ${profileId}:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'launchProfile', error as Error, { profileId })
      return { success: false }
    }
  }

  /**
   * Cancels a running scraping process for a given profile.
   * @param profileId - The ID of the profile to cancel.
   */
  async cancelLaunch(profileId: string): Promise<{ success: boolean }> {
    try {
      console.log(`[RENDERER] Cancelling launch for profile: ${profileId}`)
      return await window.api.cancelLaunch(profileId)
    } catch (error) {
      console.error(`[RENDERER] Failed to cancel launch for profile ${profileId}:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'cancelLaunch', error as Error, { profileId })
      return { success: false }
    }
  }

  /**
   * Sets the priority level for a given profile.
   * @param profileId - The ID of the profile to update.
   * @param priority - The new priority level.
   */
  async setPriority(profileId: string, priority: PriorityLevel): Promise<{ success: boolean }> {
    try {
      console.log(`[RENDERER] Setting priority for profile ${profileId} to ${priority}`)
      return await window.api.setPriority(profileId, priority)
    } catch (error) {
      console.error(`[RENDERER] Failed to set priority for profile ${profileId}:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'setPriority', error as Error, { profileId, priority })
      return { success: false }
    }
  }

  /**
   * Fetches available tickets based on search criteria.
   */
  async fetchTickets(): Promise<{ ticketsFound: number }> {
    try {
      console.log(`[RENDERER] Fetching tickets...`)
      return await window.api.fetchTickets()
    } catch (error) {
      console.error(`[RENDERER] Failed to fetch tickets:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'fetchTickets', error as Error)
      return { ticketsFound: 0 }
    }
  }

  /**
   * Retrieves the current system metrics from the main process.
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      console.log(`[RENDERER] Fetching system metrics...`)
      return await window.api.getSystemMetrics()
    } catch (error) {
      console.error(`[RENDERER] Failed to get system metrics:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'getSystemMetrics', error as Error)
      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      }
    }
  }

  /**
   * Saves profile data to persistent storage via main process.
   * @param profiles - Array of profiles to save.
   */
  async saveProfileData(profiles: Profile[]): Promise<void> {
    try {
      console.log(`[RENDERER] Saving profile data for ${profiles.length} profiles`)
      await window.api.saveProfileData(profiles)
    } catch (error) {
      console.error(`[RENDERER] Failed to save profile data:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'saveProfileData', error as Error, { profileCount: profiles.length })
      throw error
    }
  }

  /**
   * Loads profile data from persistent storage via main process.
   */
  async loadProfileData(): Promise<Profile[]> {
    try {
      console.log(`[RENDERER] Loading profile data...`)
      return await window.api.loadProfileData()
    } catch (error) {
      console.error(`[RENDERER] Failed to load profile data:`, error)
      await errorService.reportServiceError('ElectronServiceAdapter', 'loadProfileData', error as Error)
      return []
    }
  }
}

// Export a singleton instance
export const electronService = new ElectronServiceAdapter()

// Export individual functions for compatibility with original service interface
export const {
  launchProfile,
  cancelLaunch,
  setPriority,
  fetchTickets,
  getSystemMetrics,
  saveProfileData,
  loadProfileData
} = electronService