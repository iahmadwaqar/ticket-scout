import { ipcMain } from 'electron'
import { IPC_CHANNELS, type IPCHandler } from '../shared/ipc-types'
import {
  gologinService,
  type LaunchProfileRequest,
  type LaunchMultipleProfilesRequest
} from './gologin-service'
import { logger } from './logger-service'
/**
 * Register IPC handlers for service operations
 */
export function registerServiceHandlers(): void {
  // Profile operations
  const launchProfileHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_PROFILE> = async (
    _,
    profileId
  ) => {
    try {
      logger.info('Global', `Launching profile: ${profileId}`)

      // Validate input
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }

      // Create launch request for GoLogin service
      const launchRequest: LaunchProfileRequest = {
        profileId,
        profileName: `Profile-${profileId}`,
        // TODO: Get these from profile data
        gologinProfileId: undefined,
        token: undefined
      }

      // Use GoLogin service to launch profile
      const result = await gologinService.launchProfile(launchRequest)

      return {
        success: result.success,
        message: result.message
      }
    } catch (error) {
      logger.error('Global', `Failed to launch profile ${profileId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const launchMultipleProfilesHandler: IPCHandler<
    typeof IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES
  > = async (_, profileIds, gologinProfileIds, token) => {
    try {
      logger.info('Global', `Launching multiple profiles: ${profileIds.length} profiles`)

      // Validate inputs
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        throw new Error('Invalid profile IDs provided')
      }
      if (!Array.isArray(gologinProfileIds) || gologinProfileIds.length !== profileIds.length) {
        throw new Error('GoLogin profile IDs must match the number of profiles')
      }
      if (!token || typeof token !== 'string') {
        throw new Error('GoLogin token is required')
      }

      // Create launch request for GoLogin service
      const launchRequest: LaunchMultipleProfilesRequest = {
        profileIds,
        gologinProfileIds,
        token
      }

      // Use GoLogin service to launch profiles
      const result = await gologinService.launchMultipleProfiles(launchRequest)

      return result
    } catch (error) {
      logger.error('Global', `Failed to launch multiple profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        results: profileIds.map((profileId) => ({
          profileId,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }))
      }
    }
  }

  const cancelLaunchHandler: IPCHandler<typeof IPC_CHANNELS.CANCEL_LAUNCH> = async (
    _,
    profileId
  ) => {
    try {
      logger.info('Global', `Cancelling launch for profile: ${profileId}`)

      // Validate input
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }

      // Use GoLogin service to stop profile
      const result = await gologinService.stopProfile(profileId)

      return {
        success: result.success,
        message: result.message
      }
    } catch (error) {
      logger.error('Global', `Failed to cancel launch for profile ${profileId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const setPriorityHandler: IPCHandler<typeof IPC_CHANNELS.SET_PRIORITY> = async (
    _,
    profileId,
    priority
  ) => {
    try {
      logger.info('Global', `Setting priority for profile ${profileId} to ${priority}`)

      // Validate inputs
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }
      if (!priority || !['High', 'Medium', 'Low'].includes(priority)) {
        throw new Error('Invalid priority level provided')
      }

      // TODO: Implement actual priority setting logic
      await new Promise((resolve) => setTimeout(resolve, 200))
      return { success: true }
    } catch (error) {
      logger.error('Global', `Failed to set priority for profile ${profileId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { success: false }
    }
  }

  // Ticket operations
  const fetchTicketsHandler: IPCHandler<typeof IPC_CHANNELS.FETCH_TICKETS> = async () => {
    try {
      logger.info('Global', 'Fetching tickets...')
      // TODO: Implement actual ticket fetching logic
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const ticketsFound = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0
      return { ticketsFound }
    } catch (error) {
      logger.error('Global', `Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { ticketsFound: 0 }
    }
  }

  // System operations
  const getSystemMetricsHandler: IPCHandler<typeof IPC_CHANNELS.GET_SYSTEM_METRICS> = async () => {
    try {
      logger.info('Global', 'Fetching system metrics...')
      // TODO: Implement actual system metrics collection
      await new Promise((resolve) => setTimeout(resolve, 500))
      const metrics: SystemMetrics = {
        cpuUsage: Math.floor(Math.random() * (85 - 20 + 1) + 20),
        memoryUsage: Math.floor(Math.random() * (90 - 30 + 1) + 30),
        concurrencyLimit: 35,
        throttlingState: Math.random() > 0.9 ? 'Active' : 'None'
      }
      return metrics
    } catch (error) {
      logger.error('Global', `Failed to get system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      }
    }
  }

  // Profile data operations (for future use)
  const saveProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.SAVE_PROFILE_DATA> = async (
    _,
    profiles
  ) => {
    try {
      logger.info('Global', `Saving profile data for ${profiles.length} profiles`)
      // TODO: Implement actual profile data persistence
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      logger.error('Global', `Failed to save profile data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  const loadProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.LOAD_PROFILE_DATA> = async () => {
    try {
      logger.info('Global', 'Loading profile data...')
      // TODO: Implement actual profile data loading
      await new Promise((resolve) => setTimeout(resolve, 300))
      return [] // Return empty array for now
    } catch (error) {
      logger.error('Global', `Failed to load profile data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  }

  // Logging operations
  const getLogsHandler: IPCHandler<typeof IPC_CHANNELS.GET_LOGS> = async () => {
    try {
      return logger.getLogs()
    } catch (error) {
      console.error(`[MAIN] Failed to get logs:`, error)
      return []
    }
  }

  const clearLogsHandler: IPCHandler<typeof IPC_CHANNELS.CLEAR_LOGS> = async () => {
    try {
      logger.clearLogs()
    } catch (error) {
      console.error(`[MAIN] Failed to clear logs:`, error)
    }
  }

  // Register all handlers
  ipcMain.handle(IPC_CHANNELS.LAUNCH_PROFILE, launchProfileHandler)
  ipcMain.handle(IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES, launchMultipleProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.CANCEL_LAUNCH, cancelLaunchHandler)
  ipcMain.handle(IPC_CHANNELS.SET_PRIORITY, setPriorityHandler)
  ipcMain.handle(IPC_CHANNELS.FETCH_TICKETS, fetchTicketsHandler)
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_METRICS, getSystemMetricsHandler)
  ipcMain.handle(IPC_CHANNELS.SAVE_PROFILE_DATA, saveProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.LOAD_PROFILE_DATA, loadProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, getLogsHandler)
  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, clearLogsHandler)
}
