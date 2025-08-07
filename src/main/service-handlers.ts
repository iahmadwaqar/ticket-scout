import { ipcMain } from 'electron'
import { IPC_CHANNELS, type IPCHandler } from '../shared/ipc-types'
import { gologinService } from './gologin-service'
import { logger } from './logger-service'
import type { SystemMetrics } from '../renderer/src/types'
/**
 * Register IPC handlers for service operations
 */
export function registerServiceHandlers(): void {
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
      logger.error(
        'Global',
        `Failed to get system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      }
    }
  }

  const loadProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.LOAD_PROFILE_DATA> = async () => {
    try {
      logger.info('Global', 'Loading profile data...')
      // TODO: Implement actual profile data loading
      await new Promise((resolve) => setTimeout(resolve, 300))
      return [] // Return empty array for now
    } catch (error) {
      logger.error(
        'Global',
        `Failed to load profile data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return []
    }
  }

  const saveProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.SAVE_PROFILE_DATA> = async (
    _,
    profiles
  ) => {
    try {
      logger.info('Global', `Saving profile data for ${profiles.length} profiles...`)
      // TODO: Implement actual profile data saving
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      logger.error(
        'Global',
        `Failed to save profile data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const fetchTicketsHandler: IPCHandler<typeof IPC_CHANNELS.FETCH_TICKETS> = async () => {
    try {
      logger.info('Global', 'Fetching tickets...')
      // TODO: Implement actual ticket fetching
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { ticketsFound: Math.floor(Math.random() * 10) }
    } catch (error) {
      logger.error(
        'Global',
        `Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return { ticketsFound: 0 }
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

  const addLogHandler: IPCHandler<typeof IPC_CHANNELS.ADD_LOG> = async (
    _,
    profileId,
    severity,
    message
  ) => {
    try {
      logger.addLog(profileId, severity, `[RENDERER] ${message}`)
    } catch (error) {
      console.error(`[MAIN] Failed to add log from renderer:`, error)
    }
  }

  const launchAllProfilesHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_ALL_PROFILES> = async (
    _,
    config
  ) => {
    try {
      logger.info('Global', `Starting launch all process with config: ${JSON.stringify(config)}`)

      // Use GoLogin service to launch all profiles
      const result = await gologinService.launchAllProfiles(config)

      return result
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

  const stopAllProfilesHandler: IPCHandler<typeof IPC_CHANNELS.STOP_ALL_PROFILES> = async () => {
    try {
      logger.info('Global', 'Starting stop all profiles process')

      // Use GoLogin service to stop all profiles
      const result = await gologinService.stopAllProfiles()

      return result
    } catch (error) {
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

  const closeAllProfilesHandler: IPCHandler<typeof IPC_CHANNELS.CLOSE_ALL_PROFILES> = async () => {
    try {
      logger.info('Global', 'Starting close all profiles process')

      // Use GoLogin service to close all profiles
      const result = await gologinService.closeAllProfiles()

      return result
    } catch (error) {
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

  // Register all handlers
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_METRICS, getSystemMetricsHandler)
  ipcMain.handle(IPC_CHANNELS.LOAD_PROFILE_DATA, loadProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.SAVE_PROFILE_DATA, saveProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.FETCH_TICKETS, fetchTicketsHandler)
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, getLogsHandler)
  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, clearLogsHandler)
  ipcMain.handle(IPC_CHANNELS.ADD_LOG, addLogHandler)
  ipcMain.handle(IPC_CHANNELS.LAUNCH_ALL_PROFILES, launchAllProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_ALL_PROFILES, stopAllProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.CLOSE_ALL_PROFILES, closeAllProfilesHandler)
}
