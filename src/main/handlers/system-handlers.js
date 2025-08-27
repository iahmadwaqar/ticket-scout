import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types.js'
import { logger } from '../utils/logger-service.js'
import { validateLogEntry } from '../services/profile/validation.js'
import {
  logValidationError,
  validateIPCPayload,
} from '../utils/validation-service.js'

/**
 * Register system and logging-related IPC handlers
 */
export function registerSystemHandlers() {
  // Logging operations
  const getLogsHandler = async () => {
    try {
      return logger.getLogs()
    } catch (error) {
      console.error(`[MAIN] Failed to get logs:`, error)
      return []
    }
  }

  const clearLogsHandler = async () => {
    try {
      logger.clearLogs()
    } catch (error) {
      console.error(`[MAIN] Failed to clear logs:`, error)
    }
  }

  const addLogHandler = async (_, profileId, severity, message) => {
    try {
      const payloadValidation = validateIPCPayload({ profileId, severity, message }, [
        'profileId',
        'severity',
        'message'
      ])
      if (!payloadValidation.isValid) {
        logValidationError('addLog IPC payload', payloadValidation)
        return
      }

      const logValidation = validateLogEntry(profileId, severity, message)
      if (!logValidation.isValid) {
        logValidationError('addLog entry', logValidation)
        return
      }

      const sanitizedData = logValidation.sanitizedData
      logger.addLog(
        sanitizedData.profileId,
        sanitizedData.severity,
        `[RENDERER] ${sanitizedData.message}`
      )
    } catch (error) {
      console.error(`[MAIN] Failed to add log from renderer:`, error)
    }
  }

  // Register all system handlers
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, getLogsHandler)
  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, clearLogsHandler)
  ipcMain.handle(IPC_CHANNELS.ADD_LOG, addLogHandler)

  logger.info('Global', 'System IPC handlers registered successfully')
}