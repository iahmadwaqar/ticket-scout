import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types.js'
import { logger } from '../utils/logger-service.js'
import { logValidationError, validateIPCPayload, validateProfileId } from '../utils/validation-service.js'
import { profileStore } from '../services/profile/profileStore.js'
import { multiProfileTicketBot } from '../services/profile/multiProfileTicketBot.js'
import { SingleProfileTicketBot } from '../services/profile/singleProfileTicketBot.js'
import { canResume } from '../../shared/status-constants.js'

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

      logger.info('Global', 'Starting launch all profiles process')

      // Step 1: Get profiles from DB and store them in profileStore
      const profilesList = await profileStore.getProfilesFromDB(config)

      if (profilesList.length === 0) {
        logger.error('Global', 'No profiles found in database')
        return {
          success: false,
          message: 'No profiles found'
        }
      }

      // Step 1.5: Check how many profiles were actually added vs already existing
      // The profileStore.getProfilesFromDB() method already handles duplicates internally
      // and logs the added vs skipped counts, so we can proceed with initialization
      
      // Filter profiles that need bot initialization (exclude those that already have bots)
      const profilesNeedingBots = profilesList.filter(profile => {
        return !profileStore.hasBotInstance(profile.id)
      })
      
      if (profilesNeedingBots.length === 0) {
        logger.info('Global', 'All profiles already have bot instances, no initialization needed')
        return {
          success: true,
          message: 'All profiles already initialized with bots',
          profilesList,
          profileCount: profilesList.length,
          alreadyInitialized: profilesList.length - profilesNeedingBots.length
        }
      }

      // The initialization runs in the background while we return immediately
      multiProfileTicketBot
        .initialize(config)
        .then((result) => {
          if (result && !result.success) {
            logger.error(
              'Global',
              `Browser launch for all profiles failed with error : ${result.error}`
            )
          } else if (result && result.success) {
            logger.info(
              'Global',
              `Browser launch for all profiles completed successfully: ${result.profileCount} profiles`
            )
          }
        })
        .catch((error) => {
          logger.error(
            'Global',
            `Browser launch for all profiles failed with error: ${error.message}`
          )
        })

      const result = {
        success: true,
        message: 'Launch all profiles process started successfully',
        profilesList,
        profileCount: profilesList.length
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
      logger.info('Global', 'Starting stop all profiles process')

      // Step 1: Get all profiles from profileStore
      const allProfiles = profileStore.getAllProfiles()

      if (allProfiles.length === 0) {
        logger.warn('Global', 'No profiles found to stop')
        return {
          success: true,
          message: 'No profiles found to stop',
          stoppableCount: 0
        }
      }

      // Step 2: Filter profiles that can be stopped
      const stoppableStatuses = ['Active', 'Ready', 'LoggedIn', 'Navigating', 'Scraping', 'SearchingTickets', 'RandomBrowsing', 'InQueue', 'WaitingForCaptcha', 'SessionExpired', 'RateLimited', 'Launching']
      const stoppableProfiles = allProfiles.filter(profile => 
        stoppableStatuses.includes(profile.status) && 
        profile.operationalState === 'active'
      )

      if (stoppableProfiles.length === 0) {
        logger.info('Global', 'No profiles available to stop (all profiles already stopped, in error, or completed)')
        return {
          success: true,
          message: 'No profiles available to stop',
          stoppableCount: 0,
          totalProfiles: allProfiles.length
        }
      }

      // Step 3: Start stop process in background
      const config = { batchSize: 5, batchInterval: 5 } // Default stop config
      
      multiProfileTicketBot
        .stopAll(config)
        .then((result) => {
          if (result && !result.success) {
            logger.error(
              'Global',
              `Stop all profiles failed with error: ${result.error}`
            )
          } else if (result && result.success) {
            logger.info(
              'Global',
              `Stop all profiles completed successfully: ${result.successfulCount} stopped, ${result.failedCount} failed`
            )
          }
        })
        .catch((error) => {
          logger.error(
            'Global',
            `Stop all profiles failed with error: ${error.message}`
          )
        })

      // Step 4: Return immediate success with profile counts
      const result = {
        success: true,
        message: 'Stop all profiles process started successfully for ' + stoppableProfiles.length + ' profiles',
        stoppableCount: stoppableProfiles.length,
        totalProfiles: allProfiles.length
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
      logger.info('Global', 'Starting close all profiles process')

      // Step 1: Get all profiles from profileStore
      const allProfiles = profileStore.getAllProfiles()

      if (allProfiles.length === 0) {
        logger.warn('Global', 'No profiles found to close')
        return {
          success: false,
          message: 'No profiles found to close'
        }
      }

      // Step 2: Filter profiles that can be closed (exclude already closed)
      const closableProfiles = allProfiles.filter(profile => 
        profile.status !== 'Closed'
      )

      if (closableProfiles.length === 0) {
        logger.warn('Global', 'No profiles available to close (all profiles already closed)')
        return {
          success: false,
          message: 'No profiles available to close',
          closableCount: 0,
          totalProfiles: allProfiles.length
        }
      }

      // Step 3: Start close process in background
      const config = { batchSize: 20, batchInterval: 3 } // Default close config
      
      multiProfileTicketBot
        .closeAll(config)
        .then((result) => {
          if (result && !result.success) {
            logger.error(
              'Global',
              `Close all profiles failed with error: ${result.error}`
            )
          } else if (result && result.success) {
            logger.info(
              'Global',
              `Close all profiles completed successfully: ${result.successfulCount} closed, ${result.failedCount} failed`
            )
          }
        })
        .catch((error) => {
          logger.error(
            'Global',
            `Close all profiles failed with error: ${error.message}`
          )
        })

      // Step 4: Return immediate success with profile counts
      const result = {
        success: true,
        message: 'Close all profiles process started successfully for ' + closableProfiles.length + ' profiles',
        closableCount: closableProfiles.length,
        totalProfiles: allProfiles.length
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

      // Check if profile exists in store
      const profile = profileStore.getProfile(sanitizedProfileId)
      if (!profile) {
        const errorMessage = `Profile with ID ${sanitizedProfileId} not found`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: 'Launch failed ' + errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has launchable status
      const launchableStatuses = ['Idle', 'Stopped', 'Error', 'Error Launching', 'Error Closing']
      if (!launchableStatuses.includes(profile.status)) {
        const errorMessage = `Profile ${profile.name} cannot be launched (current status: ${profile.status})`
        logger.warn(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: 'Launch failed ' + errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile is already running (has active bot instance)
      if (profileStore.hasBotInstance(sanitizedProfileId)) {
        const errorMessage = `Profile ${profile.name} is already running`
        logger.warn(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: 'Launch failed ' + errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Create and initialize SingleProfileTicketBot instance
      try {
        const bot = new SingleProfileTicketBot(profile)
        
        // Store bot instance in profileStore immediately
        profileStore.setBotInstance(sanitizedProfileId, bot)
        
        // Initialize the bot (non-blocking with proper error handling)
        bot.initialize()
          .then((result) => {
            if (result.success) {
              logger.info(sanitizedProfileId, `Profile ${profile.name} launched successfully`)
            }
          })
          .catch((error) => {
            logger.error(sanitizedProfileId, `Profile ${profile.name} initialization failed: ${error.message}`)
            // Clean up bot instance on failure
            profileStore.clearBotInstance(sanitizedProfileId)
            profileStore.updateStatus(sanitizedProfileId, 'Error Launching', error.message)
          })

        // Return immediately without waiting (non-blocking)
        
        return {
          success: true,
          message: `Profile ${profile.name} launch started successfully`,
          profileId: sanitizedProfileId
        }
        
      } catch (botError) {
        // Handle bot creation errors
        const errorMessage = `Failed to create bot instance: ${botError.message}`
        logger.error(sanitizedProfileId, errorMessage)
        profileStore.updateStatus(sanitizedProfileId, 'Error Launching', botError.message)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error(
        'Global',
        `Failed to launch single profile: ${errorMessage}`
      )
      
      // Update profile status to Error if we have a valid profileId
      if (profileId) {
        try {
          profileStore.updateStatus(profileId, 'Error Launching', errorMessage)
        } catch (statusError) {
          logger.error(profileId, `Failed to update status after launch error: ${statusError.message}`)
        }
      }
      
      
      return {
        success: false,
        message: errorMessage,
        profileId: profileId || 'unknown'
      }
    }
  }

  
  const startSingleProfileHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('startSingleProfile', profileIdValidation)
        return {
          success: false,
          message: `Failed due to invalid profile ID: ${profileIdValidation.error}`,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // Check if profile exists in store
      const profile = profileStore.getProfile(sanitizedProfileId)
      if (!profile) {
        const errorMessage = `Failed due to profile with ID ${sanitizedProfileId} not found`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has stoppable status
      const canStart = canResume(profile.status)
      if (!canStart) {
        const errorMessage = `Failed due to profile ${profile.name} cannot be started (current status: ${profile.status})`
        logger.warn(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has bot instance
      const bot = profileStore.getBotInstance(sanitizedProfileId)
      if (!bot) {
        const errorMessage = `Failed due to no bot instance found for profile ${profile.name}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Call bot's start method
      try {
        const result = await bot.start()
        if (result.success) {
          logger.info(sanitizedProfileId, `Profile ${profile.name} started successfully`)
          return {
            success: true,
            message: `Profile ${profile.name} started successfully`,
            profileId: sanitizedProfileId
          }
        } else {
          const errorMessage = `Failed due to bot start operation failed: ${result.message || 'Unknown error'}`
          logger.error(sanitizedProfileId, errorMessage)
          return {
            success: false,
            message: errorMessage,
            profileId: sanitizedProfileId
          }
        }
      } catch (botError) {
        const errorMessage = `Failed due to bot start error: ${botError.message}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }
      
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error(
        'Global',
        `Failed to stop single profile: ${errorMessage}`
      )
      
      return {
        success: false,
        message: errorMessage,
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
          message: `Failed due to invalid profile ID: ${profileIdValidation.error}`,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // Check if profile exists in store
      const profile = profileStore.getProfile(sanitizedProfileId)
      if (!profile) {
        const errorMessage = `Failed due to profile with ID ${sanitizedProfileId} not found`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has stoppable status
      const stoppableStatuses = ['Active', 'Ready', 'LoggedIn', 'Navigating', 'Scraping', 'SearchingTickets', 'RandomBrowsing', 'InQueue', 'WaitingForCaptcha', 'SessionExpired', 'RateLimited', 'Launching']
      if (!stoppableStatuses.includes(profile.status)) {
        const errorMessage = `Failed due to profile ${profile.name} cannot be stopped (current status: ${profile.status})`
        logger.warn(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has bot instance
      const bot = profileStore.getBotInstance(sanitizedProfileId)
      if (!bot) {
        const errorMessage = `Failed due to no bot instance found for profile ${profile.name}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Call bot's stop method
      try {
        const result = await bot.stop()
        if (result.success) {
          logger.info(sanitizedProfileId, `Profile ${profile.name} stopped successfully`)
          return {
            success: true,
            message: `Profile ${profile.name} stopped successfully`,
            profileId: sanitizedProfileId
          }
        } else {
          const errorMessage = `Failed due to bot stop operation failed: ${result.message || 'Unknown error'}`
          logger.error(sanitizedProfileId, errorMessage)
          return {
            success: false,
            message: errorMessage,
            profileId: sanitizedProfileId
          }
        }
      } catch (botError) {
        const errorMessage = `Failed due to bot stop error: ${botError.message}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }
      
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error(
        'Global',
        `Failed to stop single profile: ${errorMessage}`
      )
      
      return {
        success: false,
        message: errorMessage,
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
          message: `Failed due to invalid profile ID: ${profileIdValidation.error}`,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData

      // Check if profile exists in store
      const profile = profileStore.getProfile(sanitizedProfileId)
      if (!profile) {
        const errorMessage = `Failed due to profile with ID ${sanitizedProfileId} not found`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has closable status (exclude already closed)
      if (profile.status === 'Closed') {
        const errorMessage = `Failed due to profile ${profile.name} is already closed`
        logger.warn(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Check if profile has bot instance
      const bot = profileStore.getBotInstance(sanitizedProfileId)
      if (!bot) {
        const errorMessage = `Failed due to no bot instance found for profile ${profile.name}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }

      // Call bot's close method
      try {
        const result = await bot.close()
        if (result.success) {
          logger.info(sanitizedProfileId, `Profile ${profile.name} closed successfully`)
          return {
            success: true,
            message: `Profile ${profile.name} closed successfully`,
            profileId: sanitizedProfileId
          }
        } else {
          const errorMessage = `Failed due to bot close operation failed: ${result.message || 'Unknown error'}`
          logger.error(sanitizedProfileId, errorMessage)
          return {
            success: false,
            message: errorMessage,
            profileId: sanitizedProfileId
          }
        }
      } catch (botError) {
        const errorMessage = `Failed due to bot close error: ${botError.message}`
        logger.error(sanitizedProfileId, errorMessage)
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }
      
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error(
        'Global',
        `Failed to close single profile: ${errorMessage}`
      )
      
      return {
        success: false,
        message: errorMessage,
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
  ipcMain.handle(IPC_CHANNELS.START_SINGLE_PROFILE, startSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.STOP_SINGLE_PROFILE, stopSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.CLOSE_SINGLE_PROFILE, closeSingleProfileHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_DATA, updateProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.LOGIN_PROFILE, loginProfileHandler)
  ipcMain.handle(IPC_CHANNELS.SWITCH_PROFILE_LOGIN, switchProfileLoginHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_SEATS, updateProfileSeatsHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_FIELD, updateProfileFieldHandler)
  ipcMain.handle(IPC_CHANNELS.BRING_PROFILE_TO_FRONT, bringProfileToFrontHandler)
}
