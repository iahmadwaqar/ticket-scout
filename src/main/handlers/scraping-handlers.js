import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types.js'
import { logger } from '../utils/logger-service.js'
import { ticketMonitoringIntegration } from '../services/monitoring/monitoring-integration.js'
import { cookieUpdateService } from '../services/cookies/cookie-update-service.js'
import {
  validateProfileId,
  logValidationError,
  validateIPCPayload,
  validateLaunchAllConfig
} from '../utils/validation-service.js'

/**
 * Register scraping-related IPC handlers
 */
export function registerScrapingHandlers() {
  const startLookingForTicketsHandler = async (_, profileId, config = {}) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('startLookingForTickets', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      
      // Validate monitoring prerequisites
      const validation = ticketMonitoringIntegration.validateMonitoringPrerequisites(sanitizedProfileId)
      if (!validation.isValid) {
        return {
          success: false,
          message: `Cannot start monitoring: ${validation.issues.join(', ')}`,
          profileId: sanitizedProfileId
        }
      }
      
      // Start ticket monitoring
      const result = await ticketMonitoringIntegration.startTicketMonitoring(sanitizedProfileId, config)
      return result
      
    } catch (error) {
      logger.error(
        'Global',
        `Failed to start looking for tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error.message || 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const stopLookingForTicketsHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('stopLookingForTickets', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      
      // Stop ticket monitoring
      const result = await ticketMonitoringIntegration.stopTicketMonitoring(sanitizedProfileId)
      return result
      
    } catch (error) {
      logger.error(
        'Global',
        `Failed to stop looking for tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error.message || 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const getMonitoringStatusHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      const status = ticketMonitoringIntegration.getMonitoringStatus(sanitizedProfileId)
      
      return {
        success: true,
        status,
        profileId: sanitizedProfileId
      }
      
    } catch (error) {
      logger.error('Global', `Failed to get monitoring status: ${error.message}`)
      return {
        success: false,
        message: error.message,
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateCookiesHandler = async () => {
    try {
      // Use the cookie update service (following Python updateCookies logic)
      const result = await cookieUpdateService.updateAllCookies()
      return result
      
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

  // Register all scraping handlers
  ipcMain.handle(IPC_CHANNELS.START_LOOKING_FOR_TICKETS, startLookingForTicketsHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_LOOKING_FOR_TICKETS, stopLookingForTicketsHandler)
  ipcMain.handle(IPC_CHANNELS.GET_MONITORING_STATUS, getMonitoringStatusHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_COOKIES, updateCookiesHandler)

  logger.info('Global', 'Scraping handlers registered successfully')
}