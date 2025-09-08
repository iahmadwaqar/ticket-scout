import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types.js'
import { logger } from '../utils/logger-service.js'
import {
  logValidationError,
  validateIPCPayload,
  validateProfileId
} from '../utils/validation-service.js'
import { profileStore } from '../services/profile/profileStore.js'
import { multiProfileTicketBot } from '../services/profile/multiProfileTicketBot.js'
import { SingleProfileTicketBot } from '../services/profile/singleProfileTicketBot.js'
import { goLoginService } from '../services/gologin/index.js'
import { canResume, canLogin, isStoppable } from '../../shared/status-constants.js'

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

      logger.info('Global', 'Starting launch profiles process')
      const requestedCount = config.profileCount || 10

      // Step 1: Check currently running profiles
      const currentProfilesWithBots = profileStore.getAllProfiles().filter(profile => 
        profileStore.hasBotInstance(profile.id)
      )
      const runningCount = currentProfilesWithBots.length

      logger.info('Global', `Current status - Running profiles: ${runningCount}, Requested: ${requestedCount}`)

      // Step 2: Get profiles available for launch (without active bots)
      let availableProfiles = profileStore.getProfilesWithoutBots()
      
      // Step 3: If we don't have enough available profiles, fetch more from DB
      const neededProfiles = requestedCount
      if (availableProfiles.length < neededProfiles) {
        const additionalNeeded = neededProfiles - availableProfiles.length
        logger.info('Global', `Need ${additionalNeeded} additional profiles, fetching from database...`)
        
        try {
          // Fetch additional profiles excluding already existing ones
          const currentProfileIds = profileStore.getAllProfiles().map(p => p.id)
          const additionalProfiles = await profileStore.getAdditionalProfilesFromDB(
            { ...config, profileCount: additionalNeeded },
            currentProfileIds
          )
          
          if (additionalProfiles.length > 0) {
            logger.info('Global', `Successfully fetched ${additionalProfiles.length} additional profiles`)
            // Update available profiles list
            availableProfiles = profileStore.getProfilesWithoutBots()
          } else {
            logger.warn('Global', 'No additional profiles could be fetched from database')
          }
        } catch (error) {
          logger.error('Global', `Failed to fetch additional profiles: ${error.message}`)
          // Continue with available profiles if fetching fails
        }
      }

      // Step 4: Select profiles to launch (limit to requested count)
      const profilesToLaunch = availableProfiles.slice(0, neededProfiles)
      
      if (profilesToLaunch.length === 0) {
        // No profiles available to launch
        if (runningCount > 0) {
          return {
            success: true,
            message: `${runningCount} profiles already running, no additional profiles available to launch`,
            profilesList: profileStore.getAllProfiles(),
            profileCount: profileStore.getAllProfiles().length,
            runningCount: runningCount,
            newlyLaunched: 0
          }
        } else {
          return {
            success: false,
            message: 'No profiles found or available for launch'
          }
        }
      }

      logger.info('Global', `Launching ${profilesToLaunch.length} new profiles (${runningCount} already running)`)

      // Step 5: Launch only the selected profiles by passing them directly to initialize
      try {
        // Initialize bots for the selected profiles only
        const initResult = await multiProfileTicketBot.initialize(config, profilesToLaunch)
        
        if (initResult && !initResult.success) {
          logger.error('Global', `Browser launch failed: ${initResult.error}`)
          return {
            success: false,
            message: `Browser launch failed: ${initResult.error}`,
            profilesList: profileStore.getAllProfiles(),
            profileCount: profileStore.getAllProfiles().length,
            runningCount: runningCount,
            newlyLaunched: 0
          }
        }
        
        const newRunningCount = profileStore.getActiveBotsCount()
        const newlyLaunched = newRunningCount - runningCount
        
        logger.info('Global', `Launch completed - Total running: ${newRunningCount}, Newly launched: ${newlyLaunched}`)
        
        return {
          success: true,
          message: `Successfully launched ${newlyLaunched} new profiles (${newRunningCount} total running)`,
          profilesList: profileStore.getAllProfiles(),
          profileCount: profileStore.getAllProfiles().length,
          runningCount: newRunningCount,
          newlyLaunched: newlyLaunched
        }
        
      } catch (error) {
        logger.error('Global', `Failed to initialize profiles: ${error.message}`)
        throw error
      }
      
    } catch (error) {
      logger.error(
        'Global',
        `Failed to launch profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      const stoppableStatuses = [
        'Active',
        'Ready',
        'LoggedIn',
        'Navigating',
        'Scraping',
        'SearchingTickets',
        'RandomBrowsing',
        'InQueue',
        'WaitingForCaptcha',
        'SessionExpired',
        'RateLimited',
        'Launching'
      ]
      const stoppableProfiles = allProfiles.filter(
        (profile) =>
          stoppableStatuses.includes(profile.status) && profile.operationalState === 'active'
      )

      if (stoppableProfiles.length === 0) {
        logger.info(
          'Global',
          'No profiles available to stop (all profiles already stopped, in error, or completed)'
        )
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
            logger.error('Global', `Stop all profiles failed with error: ${result.error}`)
          } else if (result && result.success) {
            logger.info(
              'Global',
              `Stop all profiles completed successfully: ${result.successfulCount} stopped, ${result.failedCount} failed`
            )
          }
        })
        .catch((error) => {
          logger.error('Global', `Stop all profiles failed with error: ${error.message}`)
        })

      // Step 4: Return immediate success with profile counts
      const result = {
        success: true,
        message:
          'Stop all profiles process started successfully for ' +
          stoppableProfiles.length +
          ' profiles',
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
      const closableProfiles = allProfiles.filter((profile) => profile.status !== 'Closed')

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
            logger.error('Global', `Close all profiles failed with error: ${result.error}`)
          } else if (result && result.success) {
            logger.info(
              'Global',
              `Close all profiles completed successfully: ${result.successfulCount} closed, ${result.failedCount} failed`
            )
          }
        })
        .catch((error) => {
          logger.error('Global', `Close all profiles failed with error: ${error.message}`)
        })

      // Step 4: Return immediate success with profile counts
      const result = {
        success: true,
        message:
          'Close all profiles process started successfully for ' +
          closableProfiles.length +
          ' profiles',
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
        bot
          .initialize()
          .then((result) => {
            if (result.success) {
              logger.info(sanitizedProfileId, `Profile ${profile.name} launched successfully`)
            }
          })
          .catch((error) => {
            logger.error(
              sanitizedProfileId,
              `Profile ${profile.name} initialization failed: ${error.message}`
            )
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
      logger.error('Global', `Failed to launch single profile: ${errorMessage}`)

      // Update profile status to Error if we have a valid profileId
      if (profileId) {
        try {
          profileStore.updateStatus(profileId, 'Error Launching', errorMessage)
        } catch (statusError) {
          logger.error(
            profileId,
            `Failed to update status after launch error: ${statusError.message}`
          )
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
      logger.error('Global', `Failed to stop single profile: ${errorMessage}`)

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
      
      if (!isStoppable(profile.status)) {
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
      logger.error('Global', `Failed to stop single profile: ${errorMessage}`)

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

      // Skip status check - allow closing regardless of current status
      logger.info(sanitizedProfileId, `Starting closure of profile ${profile.name} (current status: ${profile.status})`)

      let closeResult = { success: false, message: 'No cleanup performed' }
      let cleanupPerformed = false

      // Attempt bot close if bot instance exists
      const bot = profileStore.getBotInstance(sanitizedProfileId)
      if (bot) {
        try {
          logger.info(sanitizedProfileId, `Bot instance found, attempting graceful close for profile ${profile.name}`)
          closeResult = await bot.close()
          cleanupPerformed = true
          
          if (closeResult.success) {
            logger.info(sanitizedProfileId, `Profile ${profile.name} closed successfully via bot instance`)
            return {
              success: true,
              message: `Profile ${profile.name} closed successfully`,
              profileId: sanitizedProfileId
            }
          } else {
            logger.warn(sanitizedProfileId, `Bot close failed, proceeding with manual cleanup: ${closeResult.message}`)
          }
        } catch (botError) {
          logger.warn(sanitizedProfileId, `Bot close error, proceeding with manual cleanup: ${botError.message}`)
        }
      } else {
        logger.info(sanitizedProfileId, `No bot instance found for profile ${profile.name}, proceeding with manual cleanup`)
      }

      // Manual cleanup if bot close failed or no bot instance exists
      try {
        logger.info(sanitizedProfileId, `Performing manual cleanup for profile ${profile.name}`)
        
        // Update status to closing
        profileStore.updateStatus(sanitizedProfileId, 'Closing', 'Manual cleanup in progress')
        
        // Use GoLogin service to clean up browser instances if they exist
        const instances = profileStore.getGoLoginInstances(sanitizedProfileId)
        if (instances) {
          logger.info(sanitizedProfileId, `Found GoLogin instances, attempting cleanup`)
          try {
            await goLoginService.cleanupProfile(sanitizedProfileId)
            logger.info(sanitizedProfileId, `GoLogin instances cleaned up successfully`)
          } catch (goLoginError) {
            logger.warn(sanitizedProfileId, `GoLogin cleanup warning: ${goLoginError.message}`)
            // Continue with cleanup even if GoLogin cleanup fails
          }
        }
        
        // Clear bot instance from profileStore
        profileStore.clearBotInstance(sanitizedProfileId)
        
        // Clear GoLogin instances from profileStore
        profileStore.clearGoLoginInstances(sanitizedProfileId)
        
        // Update status to closed
        profileStore.updateStatus(sanitizedProfileId, 'Closed', 'Manual cleanup completed')
        
        // Remove profile from store
        profileStore.removeProfile(sanitizedProfileId)
        
        cleanupPerformed = true
        logger.info(sanitizedProfileId, `Manual cleanup completed successfully for profile ${profile.name}`)
        
        return {
          success: true,
          message: `Profile ${profile.name} closed successfully (manual cleanup)`,
          profileId: sanitizedProfileId
        }
        
      } catch (cleanupError) {
        const errorMessage = `Manual cleanup failed: ${cleanupError.message}`
        logger.error(sanitizedProfileId, errorMessage)
        
        // Even if manual cleanup fails, try to update status and remove profile
        try {
          profileStore.updateStatus(sanitizedProfileId, 'Error Closing', errorMessage)
        } catch (statusError) {
          logger.error(sanitizedProfileId, `Failed to update status after cleanup error: ${statusError.message}`)
        }
        
        return {
          success: false,
          message: errorMessage,
          profileId: sanitizedProfileId
        }
      }
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error('Global', `Failed to close single profile: ${errorMessage}`)

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
      const canLoginProfile = canLogin(profile.loginState, profile.status)
      if (!canLoginProfile) {
        const errorMessage = `Failed due to profile ${profile.name} cannot be logged in (current status: ${profile.status})`
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

      // Start login process in background (non-blocking)
      bot
        .login()
        .then((result) => {
          if (result && result.success) {
            logger.info(sanitizedProfileId, `Profile ${profile.name} login completed successfully`)
          } else {
            logger.error(
              sanitizedProfileId,
              `Profile ${profile.name} login failed: ${result?.message || 'Unknown error'}`
            )
          }
        })
        .catch((error) => {
          logger.error(
            sanitizedProfileId,
            `Profile ${profile.name} login failed with error: ${error.message}`
          )
        })

      // Return immediately to user
      return {
        success: true,
        message: `Profile ${profile.name} login process started successfully`,
        profileId: sanitizedProfileId
      }
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error('Global', `Failed to stop single profile: ${errorMessage}`)

      return {
        success: false,
        message: errorMessage,
        profileId: profileId || 'unknown'
      }
    }
  }

  const saveProfileCookiesHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('saveProfileCookies', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      logger.info(sanitizedProfileId, 'Starting cookie save operation')

      // Save cookies using GoLogin service
      const result = await goLoginService.saveProfileCookies(sanitizedProfileId)
      
      if (result.success) {
        logger.info(sanitizedProfileId, `Cookie save completed: ${result.cookieCount} cookies saved`)
      } else {
        logger.warn(sanitizedProfileId, `Cookie save failed: ${result.message}`)
      }
      
      return {
        success: result.success,
        message: result.message,
        cookieCount: result.cookieCount || 0,
        profileId: sanitizedProfileId
      }
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error('Global', `Failed to save profile cookies: ${errorMessage}`)

      return {
        success: false,
        message: errorMessage,
        profileId: profileId || 'unknown'
      }
    }
  }

  const updateProfileCookiesHandler = async (_, profileId) => {
    try {
      const profileIdValidation = validateProfileId(profileId)
      if (!profileIdValidation.isValid) {
        logValidationError('updateProfileCookies', profileIdValidation)
        return {
          success: false,
          message: profileIdValidation.error,
          profileId: profileId || 'unknown'
        }
      }

      const sanitizedProfileId = profileIdValidation.sanitizedData
      logger.info(sanitizedProfileId, 'Starting cookie update operation')

      // Update cookies using GoLogin service
      const result = await goLoginService.updateProfileCookies(sanitizedProfileId)
      
      if (result.success) {
        logger.info(sanitizedProfileId, `Cookie update completed: ${result.cookieCount} cookies updated`)
      } else {
        logger.warn(sanitizedProfileId, `Cookie update failed: ${result.message}`)
      }
      
      return {
        success: result.success,
        message: result.message,
        cookieCount: result.cookieCount || 0,
        profileId: sanitizedProfileId
      }
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error('Global', `Failed to update profile cookies: ${errorMessage}`)

      return {
        success: false,
        message: errorMessage,
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

      // Start login process in background (non-blocking)
      bot
        .bringToFront()
        .then((result) => {
          if (result && result.success) {
            logger.info(sanitizedProfileId, `Profile ${profile.name} bring to front successfully`)
          } else {
            logger.error(
              sanitizedProfileId,
              `Profile ${profile.name} bring to front failed: ${result?.message || 'Unknown error'}`
            )
          }
        })
        .catch((error) => {
          logger.error(
            sanitizedProfileId,
            `Profile ${profile.name} login failed with error: ${error.message}`
          )
        })

      // Return immediately to user
      return {
        success: true,
        message: `Trying to bring ${profile.name} to front successfully`,
        profileId: sanitizedProfileId
      }
    } catch (error) {
      const errorMessage = `Failed due to unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      logger.error('Global', `Failed to bring profile to front: ${errorMessage}`)

      return {
        success: false,
        message: errorMessage,
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
  ipcMain.handle(IPC_CHANNELS.SAVE_PROFILE_COOKIES, saveProfileCookiesHandler)
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_COOKIES, updateProfileCookiesHandler)
}
