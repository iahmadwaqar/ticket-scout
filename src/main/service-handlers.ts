import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS, type IPCHandler, type EnhancedProfileStatusUpdate } from '../shared/ipc-types'
import { gologinService } from './gologin'
import { logger } from './logger-service'
import type { SystemMetrics, EnhancedProfile } from '../renderer/src/types'
import { 
  validateProfileUpdates, 
  validateProfileId, 
  validateIPCPayload, 
  validateLaunchAllConfig,
  validateToastMessage,
  validateLogEntry,
  logValidationError
} from './gologin/profile-validation'



/**
 * Create enhanced profile status update from profile data
 * @param profileId - The profile ID
 * @param profile - The enhanced profile data (optional)
 * @param message - Optional message to include
 * @param overrideStatus - Optional status to override profile status
 * @returns EnhancedProfileStatusUpdate object
 */
function createEnhancedProfileStatusUpdate(
  profileId: string, 
  profile?: EnhancedProfile, 
  message?: string,
  overrideStatus?: string
): EnhancedProfileStatusUpdate {
  if (profile) {
    return {
      profileId,
      status: overrideStatus || profile.status,
      message: message || `Profile status: ${overrideStatus || profile.status}`,
      ticketCount: profile.ticketCount,
      lastActivity: profile.lastActivity,
      errorMessage: profile.errorMessage,
      operationalState: profile.operationalState,
      launchedAt: profile.launchedAt,
      stoppedAt: profile.stoppedAt,
      profileName: profile.name,
      loginState: profile.loginState,
      priority: profile.priority,
      seats: profile.seats
    }
  } else {
    // Fallback for when profile is not available
    return {
      profileId,
      status: overrideStatus || 'Unknown',
      message: message || 'Profile data not available',
      ticketCount: 0,
      lastActivity: new Date().toISOString(),
      operationalState: 'idle',
      errorMessage: 'Profile not found in store'
    }
  }
}


/**
 * Register comprehensive IPC handlers for all service operations
 * 
 * This function registers all IPC handlers required for the enhanced profile
 * management system, including:
 * - Individual profile operations (launch, stop, close)
 * - Bulk profile operations with error aggregation
 * - Profile data updates with validation and sanitization
 * - Toast notifications from main to renderer
 * - Memory management and monitoring operations
 * - System metrics and logging operations
 * 
 * All handlers include comprehensive error handling, input validation,
 * and integration with the global profile store. Enhanced profile status
 * updates are sent to the renderer for real-time UI updates.
 * 
 * This function must be called during application initialization to enable
 * communication between the main and renderer processes.
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
      // Validate IPC payload structure
      const payloadValidation = validateIPCPayload({ profileId, severity, message }, ['profileId', 'severity', 'message'])
      if (!payloadValidation.isValid) {
        logValidationError('addLog IPC payload', payloadValidation)
        return
      }

      // Validate log entry parameters
      const logValidation = validateLogEntry(profileId, severity, message)
      if (!logValidation.isValid) {
        logValidationError('addLog entry', logValidation)
        return
      }

      const sanitizedData = logValidation.sanitizedData
      logger.addLog(sanitizedData.profileId, sanitizedData.severity, `[RENDERER] ${sanitizedData.message}`)
    } catch (error) {
      console.error(`[MAIN] Failed to add log from renderer:`, error)
    }
  }

  const launchAllProfilesHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_ALL_PROFILES> = async (
    _,
    config
  ) => {
    try {
      // Validate IPC payload structure
      const payloadValidation = validateIPCPayload({ config }, ['config'])
      if (!payloadValidation.isValid) {
        logValidationError('launchAllProfiles IPC payload', payloadValidation)
        return {
          success: false,
          message: `IPC payload validation failed: ${payloadValidation.error}`
        }
      }

      // Validate and sanitize LaunchAllConfig
      const configValidation = validateLaunchAllConfig(config)
      if (!configValidation.isValid) {
        logValidationError('launchAllProfiles config', configValidation)
        return {
          success: false,
          message: `Config validation failed: ${configValidation.error}`
        }
      }

      const sanitizedConfig = configValidation.sanitizedData
      logger.info('Global', `Starting launch all process with config: ${JSON.stringify(sanitizedConfig)}`)

      // Use GoLogin service to launch all profiles with sanitized config
      const result = await gologinService.launchAllProfiles(sanitizedConfig)

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

  // Individual profile operation handlers
  const launchSingleProfileHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_SINGLE_PROFILE> = async (_, profileId) => {
    try {
      // Validate profileId using validation function
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('launchSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error!,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData as string
      logger.info('Global', `Launching single profile: ${sanitizedProfileId}`)
      const result = await gologinService.launchSingleProfile(sanitizedProfileId)
      
      // Send enhanced status update to renderer if the operation was successful
      if (result.success) {
        const updatedProfile = gologinService.getProfile(sanitizedProfileId)
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          const enhancedUpdate = createEnhancedProfileStatusUpdate(sanitizedProfileId, updatedProfile, result.message)
          mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
        }
      }
      
      return result
    } catch (error) {
      logger.error('Global', `Failed to launch single profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const stopSingleProfileHandler: IPCHandler<typeof IPC_CHANNELS.STOP_SINGLE_PROFILE> = async (_, profileId) => {
    try {
      // Validate profileId using validation function
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('stopSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error!,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData as string
      logger.info('Global', `Stopping single profile: ${sanitizedProfileId}`)
      const result = await gologinService.stopSingleProfile(sanitizedProfileId)
      
      // Send enhanced status update to renderer
      const updatedProfile = gologinService.getProfile(sanitizedProfileId)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        const enhancedUpdate = createEnhancedProfileStatusUpdate(sanitizedProfileId, updatedProfile, result.message)
        mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
      }
      
      return result
    } catch (error) {
      logger.error('Global', `Failed to stop single profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const closeSingleProfileHandler: IPCHandler<typeof IPC_CHANNELS.CLOSE_SINGLE_PROFILE> = async (_, profileId) => {
    try {
      // Validate profileId using validation function
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('closeSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error!,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData as string
      logger.info('Global', `Closing single profile: ${sanitizedProfileId}`)
      const result = await gologinService.closeSingleProfile(sanitizedProfileId)
      
      // Send enhanced status update to renderer - if successful, profile is removed
      // If failed, send current status
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        if (result.success) {
          // Profile was successfully closed and removed
          const enhancedUpdate = createEnhancedProfileStatusUpdate(sanitizedProfileId, undefined, result.message, 'Closed')
          enhancedUpdate.stoppedAt = new Date().toISOString()
          mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
        } else {
          // Profile close failed, send current status
          const updatedProfile = gologinService.getProfile(sanitizedProfileId)
          const enhancedUpdate = createEnhancedProfileStatusUpdate(sanitizedProfileId, updatedProfile, result.message)
          mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
        }
      }
      
      return result
    } catch (error) {
      logger.error('Global', `Failed to close single profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.UPDATE_PROFILE_DATA> = async (_, profileId, updates) => {
    try {
      logger.info('Global', `Updating profile data: ${profileId}`)
      
      // Validate profileId using validation function
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('updateProfileData', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error!
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData as string

      // Validate IPC payload structure
      const payloadValidation = validateIPCPayload({ profileId, updates }, ['profileId', 'updates'])
      if (!payloadValidation.isValid) {
        logValidationError('updateProfileData IPC payload', payloadValidation)
        return {
          success: false,
          message: `IPC payload validation failed: ${payloadValidation.error}`
        }
      }

      // Validate and sanitize profile updates
      const validationResult = validateProfileUpdates(updates)
      if (!validationResult.isValid) {
        logValidationError('updateProfileData updates', validationResult)
        return {
          success: false,
          message: `Validation failed: ${validationResult.error}`
        }
      }

      // Use sanitized data for the update
      const sanitizedUpdates = validationResult.sanitizedData as Partial<EnhancedProfile>
      const result = await gologinService.updateProfileData(sanitizedProfileId, sanitizedUpdates)
      
      // Send enhanced status update to renderer if the operation was successful
      if (result.success) {
        const updatedProfile = gologinService.getProfile(sanitizedProfileId)
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          const enhancedUpdate = createEnhancedProfileStatusUpdate(sanitizedProfileId, updatedProfile, 'Profile data updated')
          mainWindow.webContents.send('profile-status-changed', enhancedUpdate)
        }
      }
      
      return result
    } catch (error) {
      logger.error('Global', `Failed to update profile data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Toast notification handler
  const sendToastHandler: IPCHandler<typeof IPC_CHANNELS.SEND_TOAST> = async (_, toast) => {
    try {
      // Validate IPC payload structure
      const payloadValidation = validateIPCPayload({ toast }, ['toast'])
      if (!payloadValidation.isValid) {
        logValidationError('sendToast IPC payload', payloadValidation)
        return
      }

      // Validate and sanitize toast message
      const toastValidation = validateToastMessage(toast)
      if (!toastValidation.isValid) {
        logValidationError('sendToast message', toastValidation)
        return
      }

      const sanitizedToast = toastValidation.sanitizedData

      // Send toast notification to renderer process
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('toast-received', sanitizedToast)
        logger.info('Global', `Toast notification sent: ${sanitizedToast.title}`)
      } else {
        logger.error('Global', 'No main window available to send toast notification')
      }
    } catch (error) {
      logger.error(
        'Global',
        `Failed to send toast notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Memory management handlers
  const getMemoryUsageHandler: IPCHandler<typeof IPC_CHANNELS.GET_MEMORY_USAGE> = async () => {
    try {
      const memoryUsage = gologinService.getMemoryUsage()
      logger.info('Global', `Memory usage requested - profiles: ${memoryUsage.totalProfiles}, memory: ${memoryUsage.memoryEstimateKB}KB`)
      return {
        success: true,
        data: memoryUsage
      }
    } catch (error) {
      logger.error('Global', `Failed to get memory usage: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const cleanupClosedProfilesHandler: IPCHandler<typeof IPC_CHANNELS.CLEANUP_CLOSED_PROFILES> = async () => {
    try {
      gologinService.cleanupClosedProfiles()
      logger.info('Global', 'Manual cleanup of closed profiles completed')
      return {
        success: true,
        data: { message: 'Closed profiles cleanup completed' }
      }
    } catch (error) {
      logger.error('Global', `Failed to cleanup closed profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const setMemoryMonitoringHandler: IPCHandler<typeof IPC_CHANNELS.SET_MEMORY_MONITORING> = async (_, enabled) => {
    try {
      // Validate the enabled parameter
      if (typeof enabled !== 'boolean') {
        return {
          success: false,
          error: 'Memory monitoring enabled parameter must be a boolean'
        }
      }

      gologinService.setMemoryMonitoring(enabled)
      logger.info('Global', `Memory monitoring ${enabled ? 'enabled' : 'disabled'}`)
      return {
        success: true,
        data: { enabled, message: `Memory monitoring ${enabled ? 'enabled' : 'disabled'}` }
      }
    } catch (error) {
      logger.error('Global', `Failed to set memory monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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
  ipcMain.handle(IPC_CHANNELS.LAUNCH_SINGLE_PROFILE, launchSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_SINGLE_PROFILE, stopSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.CLOSE_SINGLE_PROFILE, closeSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_DATA, updateProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.SEND_TOAST, sendToastHandler)
  ipcMain.handle(IPC_CHANNELS.GET_MEMORY_USAGE, getMemoryUsageHandler)
  ipcMain.handle(IPC_CHANNELS.CLEANUP_CLOSED_PROFILES, cleanupClosedProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.SET_MEMORY_MONITORING, setMemoryMonitoringHandler)
}

/**
 * Send toast notification from main process to renderer
 * @param toast - Toast message to send
 */
export function sendToast(toast: import('../shared/ipc-types').ToastMessage): void {
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('toast-received', toast)
      logger.info('Global', `Toast notification sent: ${toast.title}`)
    } else {
      logger.error('Global', 'No main window available to send toast notification')
    }
  } catch (error) {
    logger.error(
      'Global',
      `Failed to send toast notification: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
