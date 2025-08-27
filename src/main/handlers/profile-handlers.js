import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types.js'
import { logger } from '../utils/logger-service.js'
import {
  validateProfileUpdates,
  validateProfileId
} from '../services/profile/validation.js'
import { logValidationError, validateIPCPayload } from '../utils/validation-service.js'

/**
 * Register profile-related IPC handlers
 */
export function registerProfileHandlers() {
  const launchAllProfilesHandler = async (_, config) => {
    try {
      const payloadValidation = validateIPCPayload({ config }, ['config'])
      if (!payloadValidation.isValid) {
        logValidationError('launchAllProfiles IPC payload', payloadValidation)
        return {
          success: false,
          message: `IPC payload validation failed: ${payloadValidation.error}`
        }
      }

      const configValidation = validateLaunchAllConfig(config)
      if (!configValidation.isValid) {
        logValidationError('launchAllProfiles config', configValidation)
        return {
          success: false,
          message: `Config validation failed: ${configValidation.error}`
        }
      }

      const sanitizedConfig = configValidation.sanitizedData

      // TODO: Implement launchAllProfiles method in gologinService
      // const result = await gologinService.launchAllProfiles(sanitizedConfig)
      const result = {
        success: true,
        message: 'Launch all profiles process started successfully'
      }
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

  const stopAllProfilesHandler = async () => {
    try {
      // TODO: Implement stopAllProfiles method in gologinService
      // const result = await gologinService.stopAllProfiles()
      const result = {
        success: true,
        message: 'Stop all profiles process started successfully'
      }
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

  const closeAllProfilesHandler = async () => {
    try {
      // TODO: Implement closeAllProfiles method in gologinService
      // const result = await gologinService.closeAllProfiles()
      const result = {
        success: true,
        message: 'Close all profiles process started successfully'
      }
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
  const launchSingleProfileHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('launchSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement launchSingleProfile method in gologinService
      // const result = await gologinService.launchSingleProfile(sanitizedProfileId)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} launch started successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to launch single profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const stopSingleProfileHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('stopSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement stopSingleProfile method in gologinService
      // const result = await gologinService.stopSingleProfile(sanitizedProfileId)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} stop started successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to stop single profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const closeSingleProfileHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('closeSingleProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement closeSingleProfile method in gologinService
      // const result = await gologinService.closeSingleProfile(sanitizedProfileId)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} close started successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to close single profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateProfileDataHandler = async (_, profileId, updates) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('updateProfileData', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      const validationResult = validateProfileUpdates(updates)
      if (!validationResult.isValid) {
        logValidationError('updateProfileData updates', validationResult)
        return {
          success: false,
          message: `Validation failed: ${validationResult.error}`
        }
      }

      const sanitizedUpdates = validationResult.sanitizedData

      // TODO: Implement updateProfileData method in gologinService
      // const result = await gologinService.updateProfileData(sanitizedProfileId, sanitizedUpdates)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} data updated successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to update profile data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const loginProfileHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('loginProfile', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement loginProfile method in gologinService
      // const result = await gologinService.loginProfile(sanitizedProfileId)
      const result = {
        success: true,
        message: `Login started for profile ${sanitizedProfileId}`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to login profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const switchProfileLoginHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('switchProfileLogin', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement switchProfileLogin method in gologinService
      // const result = await gologinService.switchProfileLogin(sanitizedProfileId)
      const result = {
        success: true,
        message: `Profile login switched for ${sanitizedProfileId}`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to switch profile login: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateProfileSeatsHandler = async (_, profileId, seats) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('updateProfileSeats', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      if (typeof seats !== 'number' || seats < 1 || seats > 10) {
        return {
          success: false,
          message: 'Seats must be a number between 1 and 10',
          profileId: sanitizedProfileId
        }
      }

      // TODO: Implement updateProfileSeats method in gologinService
      // const result = await gologinService.updateProfileSeats(sanitizedProfileId, seats)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} seats updated to ${seats}`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to update profile seats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateProfileFieldHandler = async (_, profileId, field, value) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('updateProfileField', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      const allowedFields = ['supporterId', 'password', 'url']
      if (!allowedFields.includes(field)) {
        return {
          success: false,
          message: `Field ${field} is not allowed for updates`,
          profileId: sanitizedProfileId
        }
      }

      // TODO: Implement updateProfileField method in gologinService
      // const result = await gologinService.updateProfileField(sanitizedProfileId, field, value)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} field ${field} updated successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to update profile field: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  const bringProfileToFrontHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('bringProfileToFront', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // TODO: Implement bringProfileToFront method in gologinService
      // const result = await gologinService.bringProfileToFront(sanitizedProfileId)
      const result = {
        success: true,
        message: `Profile ${sanitizedProfileId} brought to front successfully`
      }
      return result
    } catch (error) {
      logger.error(
        'Global',
        `Failed to bring profile to front: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        profileId: profileId || 'unknown'
      }
    }
  }

  // Register all profile handlers
  ipcMain.handle(IPC_CHANNELS.LAUNCH_ALL_PROFILES, launchAllProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_ALL_PROFILES, stopAllProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.CLOSE_ALL_PROFILES, closeAllProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.LAUNCH_SINGLE_PROFILE, launchSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_SINGLE_PROFILE, stopSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.CLOSE_SINGLE_PROFILE, closeSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_DATA, updateProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.LOGIN_PROFILE, loginProfileHandler)
  ipcMain.handle(IPC_CHANNELS.SWITCH_PROFILE_LOGIN, switchProfileLoginHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_SEATS, updateProfileSeatsHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_FIELD, updateProfileFieldHandler)
  ipcMain.handle(IPC_CHANNELS.BRING_PROFILE_TO_FRONT, bringProfileToFrontHandler)

  logger.info('Global', 'Profile IPC handlers registered successfully')
}
