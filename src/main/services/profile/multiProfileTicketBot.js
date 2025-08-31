// import getProfiles from './services/ProfileService.js'
// import { RequestScheduler } from './services/RequestScheduler.js'
import { SingleProfileTicketBot } from './singleProfileTicketBot.js'
// import { createTimer } from './utils/TimerService.js'
// import Logger from './utils/Logger.js'
// import { delayInMs, statusUpdateInterval } from './utils/constants.js'
import { logger } from '../../utils/logger-service.js'
import { sendToast } from '../../utils/toast-service.js'
import { profileStore } from '../../services/profile/profileStore.js'

class MultiProfileTicketBot {
  constructor() {
    this.isRunning = false
    this.requestScheduler = null
  }

  async initialize(config) {
    try {
      // Get profiles directly from store (single source of truth)
      const profiles = profileStore.getAllProfiles()
      if (profiles.length === 0) {
        throw new Error('No profiles found')
      }

      logger.info('Global', `Batch config - Size: ${config.batchSize || 5}, Interval: ${config.batchInterval || 10}s`)

      // Create batches based on config.batchSize (default 5)
      const batchSize = config.batchSize || 5
      const batchInterval = (config.batchInterval || 10) * 1000 // Convert to milliseconds
      const batches = this.createBatches(profiles, batchSize)

      let totalSuccessful = 0
      let totalFailed = 0

      // Process each batch with delay
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        // Initialize all bots in current batch in parallel
        const batchResults = await this.processBatch(batch, config)
        
        totalSuccessful += batchResults.successful
        totalFailed += batchResults.failed

        // Wait before processing next batch (except for the last batch)
        if (batchIndex < batches.length - 1) {
          await this.delay(batchInterval)
        }
      }

      if (totalSuccessful === 0) {
        throw new Error('No profiles initialized successfully')
      }

      logger.info('Global', `Batch initialization completed - Total Success: ${totalSuccessful}, Total Failed: ${totalFailed}`)
      return { success: true, profileCount: totalSuccessful, failedCount: totalFailed }
    } catch (error) {
      logger.error('Global', `Failed to initialize MultiProfileTicketBot: ${error.message}`)
      sendToast({
        title: 'Error',
        message: error.message,
        type: 'error'
      })
      
      // Return error result instead of undefined
      return { success: false, error: error.message, profileCount: 0 }
    }
  }

  /**
   * Create batches from profiles array
   * @param {Array} profiles - Array of profiles
   * @param {number} batchSize - Size of each batch
   * @returns {Array} Array of batches
   */
  createBatches(profiles, batchSize) {
    const batches = []
    for (let i = 0; i < profiles.length; i += batchSize) {
      batches.push(profiles.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Process a single batch of profiles
   * @param {Array} batch - Array of profiles in this batch
   * @param {Object} config - Configuration object with cookies and other settings
   * @returns {Object} Results with successful and failed counts
   */
  async processBatch(batch, config = {}) {
    // Create and store SingleProfileTicketBot instances for each profile in batch
    const initPromises = batch.map(async (profile) => {
      try {
        // Create SingleProfileTicketBot instance with configuration
        const bot = new SingleProfileTicketBot(profile, config)
        
        // Store bot instance in profileStore
        profileStore.setBotInstance(profile.id, bot)
        
        // Initialize the bot
        await bot.initialize()
        
        return { success: true, profileId: profile.id }
      } catch (error) {
        logger.error(profile.id, `Failed to initialize profile bot: ${error.message}`)
        // Clean up bot instance if initialization failed
        profileStore.clearBotInstance(profile.id)
        return { success: false, profileId: profile.id, error: error.message }
      }
    })

    // Wait for all initializations in this batch to complete
    const initResults = await Promise.allSettled(initPromises)

    // Count successful and failed initializations
    let successful = 0
    let failed = 0

    initResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++
      } else {
        failed++
        const profileId = batch[index].id
        const error = result.status === 'rejected' ? result.reason : result.value.error
        logger.error(profileId, `Batch processing failed: ${error}`)
      }
    })

    return { successful, failed }
  }

  /**
   * Delay helper function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Stop all stoppable profiles
   * @param {Object} config - Configuration object with batchSize and batchInterval
   * @returns {Object} Results with successful and failed counts
   */
  async stopAll(config = {}) {
    try {
      // Get all profiles from store
      const allProfiles = profileStore.getAllProfiles()
      if (allProfiles.length === 0) {
        throw new Error('No profiles found')
      }

      // Filter profiles that can be stopped (not already stopped, error, completed, etc.)
      const stoppableStatuses = ['Active', 'Ready', 'LoggedIn', 'Navigating', 'Scraping', 'SearchingTickets', 'RandomBrowsing', 'InQueue', 'WaitingForCaptcha', 'SessionExpired', 'RateLimited', 'Launching']
      const stoppableProfiles = allProfiles.filter(profile => 
        stoppableStatuses.includes(profile.status) && 
        profile.operationalState === 'active'
      )

      if (stoppableProfiles.length === 0) {
        return {
          success: true,
          message: 'No profiles available to stop',
          stoppableCount: 0,
          successfulCount: 0,
          failedCount: 0
        }
      }

      // Create batches based on config.batchSize (default 5)
      const batchSize = config.batchSize || 5
      const batchInterval = (config.batchInterval || 5) * 1000 // Convert to milliseconds, shorter interval for stopping
      const batches = this.createBatches(stoppableProfiles, batchSize)

      let totalSuccessful = 0
      let totalFailed = 0

      // Process each batch with delay
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        // Stop all bots in current batch in parallel
        const batchResults = await this.stopBatch(batch)
        
        totalSuccessful += batchResults.successful
        totalFailed += batchResults.failed

        // Wait before processing next batch (except for the last batch)
        if (batchIndex < batches.length - 1) {
          await this.delay(batchInterval)
        }
      }

      logger.info('Global', `Batch stop completed - Total Success: ${totalSuccessful}, Total Failed: ${totalFailed}`)
      return {
        success: true,
        stoppableCount: stoppableProfiles.length,
        successfulCount: totalSuccessful,
        failedCount: totalFailed
      }
    } catch (error) {
      logger.error('Global', `Failed to stop all profiles: ${error.message}`)
      sendToast({
        title: 'Error',
        message: error.message,
        type: 'error'
      })
      
      return { success: false, error: error.message, stoppableCount: 0 }
    }
  }

  /**
   * Stop a single batch of profiles
   * @param {Array} batch - Array of profiles in this batch
   * @returns {Object} Results with successful and failed counts
   */
  async stopBatch(batch) {
    // Stop all bot instances for profiles in this batch
    const stopPromises = batch.map(async (profile) => {
      try {
        // Get bot instance from profileStore
        const bot = profileStore.getBotInstance(profile.id)
        
        if (!bot) {
          logger.warn(profile.id, 'No bot instance found for profile, updating status directly')
          // Update status directly if no bot instance - this will set operational state to 'idle'
          profileStore.updateStatus(profile.id, 'Stopped')
          return { success: true, profileId: profile.id }
        }
        
        // Stop the bot
        await bot.stop()
        
        return { success: true, profileId: profile.id }
      } catch (error) {
        logger.error(profile.id, `Failed to stop profile bot: ${error.message}`)
        // Update status to error
        profileStore.updateStatus(profile.id, 'Error Stopping', error.message)
        return { success: false, profileId: profile.id, error: error.message }
      }
    })

    // Wait for all stops in this batch to complete
    const stopResults = await Promise.allSettled(stopPromises)

    // Count successful and failed stops
    let successful = 0
    let failed = 0

    stopResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++
      } else {
        failed++
        const profileId = batch[index].id
        const error = result.status === 'rejected' ? result.reason : result.value.error
        logger.error(profileId, `Batch stop failed: ${error}`)
      }
    })

    return { successful, failed }
  }

  /**
   * Close all profiles
   * @param {Object} config - Configuration object with batchSize and batchInterval
   * @returns {Object} Results with successful and failed counts
   */
  async closeAll(config = {}) {
    try {
      // Get all profiles from store
      const allProfiles = profileStore.getAllProfiles()
      if (allProfiles.length === 0) {
        throw new Error('No profiles found')
      }

      // Close ALL profiles regardless of status (unlike stopAll which filters)
      const closableProfiles = allProfiles.filter(profile => 
        profile.status !== 'Closed' // Only exclude already closed profiles
      )

      if (closableProfiles.length === 0) {
        return {
          success: false,
          message: 'No profiles available to close',
          closableCount: 0,
          successfulCount: 0,
          failedCount: 0
        }
      }

      // Create batches based on config.batchSize (default 5)
      const batchSize = config.batchSize || 20
      const batchInterval = (config.batchInterval || 3) * 1000 // Convert to milliseconds, shorter interval for closing
      const batches = this.createBatches(closableProfiles, batchSize)

      let totalSuccessful = 0
      let totalFailed = 0

      // Process each batch with delay
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        // Close all bots in current batch in parallel
        const batchResults = await this.closeBatch(batch)
        
        totalSuccessful += batchResults.successful
        totalFailed += batchResults.failed

        // Wait before processing next batch (except for the last batch)
        if (batchIndex < batches.length - 1) {
          await this.delay(batchInterval)
        }
      }

      logger.info('Global', `Batch close completed - Total Success: ${totalSuccessful}, Total Failed: ${totalFailed}`)
      return {
        success: true,
        closableCount: closableProfiles.length,
        successfulCount: totalSuccessful,
        failedCount: totalFailed
      }
    } catch (error) {
      logger.error('Global', `Failed to close all profiles: ${error.message}`)
      sendToast({
        title: 'Error',
        message: error.message,
        type: 'error'
      })
      
      return { success: false, error: error.message, closableCount: 0 }
    }
  }

  /**
   * Close a single batch of profiles
   * @param {Array} batch - Array of profiles in this batch
   * @returns {Object} Results with successful and failed counts
   */
  async closeBatch(batch) {
    // Close all bot instances for profiles in this batch
    const closePromises = batch.map(async (profile) => {
      try {
        // Get bot instance from profileStore
        const bot = profileStore.getBotInstance(profile.id)
        
        if (!bot) {
          logger.warn(profile.id, 'No bot instance found for profile, updating status directly')
          // Update status directly if no bot instance and remove from store
          profileStore.updateStatus(profile.id, 'Closed')
          // Remove successfully closed profile from store
          profileStore.removeProfile(profile.id)
          return { success: true, profileId: profile.id }
        }
        
        // Close the bot
        await bot.close()
        
        return { success: true, profileId: profile.id }
      } catch (error) {
        logger.error(profile.id, `Failed to close profile bot: ${error.message}`)
        // Update status to error
        profileStore.updateStatus(profile.id, 'Error Closing', error.message)
        return { success: false, profileId: profile.id, error: error.message }
      }
    })

    // Wait for all closes in this batch to complete
    const closeResults = await Promise.allSettled(closePromises)

    // Count successful and failed closes
    let successful = 0
    let failed = 0

    closeResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++
      } else {
        failed++
        const profileId = batch[index].id
        const error = result.status === 'rejected' ? result.reason : result.value.error
        logger.error(profileId, `Batch close failed: ${error}`)
      }
    })

    return { successful, failed }
  }

  // async run() {
  //   this.isRunning = true
  //   try {
  //     const timer = createTimer()
  //     timer.start()
  //     const navigateLoginPromises = this.profileBots.map((bot) => bot.navigateAndLogin())
  //     const navigateLoginResults = await Promise.allSettled(navigateLoginPromises)
  //     const failedNavigates = navigateLoginResults.filter((result) => result.status === 'rejected')
  //     if (failedNavigates.length > 0) {
  //       Logger.error(`${failedNavigates.length} profiles failed to navigate or login`)
  //       failedNavigates.forEach((result, index) => {
  //         Logger.error(`Profile ${this.profileBots[index].profileId} failed:`, result.reason)
  //       })
  //     }

  //     const successfulNavigates = this.profileBots.filter(
  //       (bot, index) => navigateLoginResults[index].status === 'fulfilled'
  //     )
  //     if (successfulNavigates.length === 0) {
  //       throw new Error('No profiles logged in successfully')
  //     }
  //     Logger.important(`${successfulNavigates.length} profiles logged in successfully`)
  //     timer.stop()
  //     Logger.info(`Profile navigation and login took: ${timer.getFormattedDuration()}`)
  //     // Create and start the request scheduler
  //     this.requestScheduler = new RequestScheduler(successfulNavigates, delayInMs)
  //     this.requestScheduler.start()

  //     // Expose scheduler methods for external use
  //     //   global.resolveProfileBlock = (profileId) => {
  //     //     return this.requestScheduler.resolveProfileBlock(profileId);
  //     //   };

  //     // Print status every statusUpdateInterval seconds
  //     const statusInterval = setInterval(() => {
  //       this.requestScheduler.printStatus()
  //     }, statusUpdateInterval)

  //     //   // Run until manually stopped or tickets found
  //     return new Promise((resolve) => {
  //       // Listen for success from any profile
  //       const checkForSuccess = setInterval(() => {
  //         const stats = this.requestScheduler.getStats()
  //         if (stats.profileStates.ticketFound >= successfulNavigates.length) {
  //           clearInterval(checkForSuccess)
  //           clearInterval(statusInterval)
  //           this.requestScheduler.stop()
  //           resolve({
  //             success: true,
  //             failedProfiles: stats.profileStates.failed,
  //             successfulProfiles: stats.profileStates.ticketFound
  //           })
  //         }
  //       }, 1000)

  //       // Handle manual stop
  //       process.on('SIGINT', () => {
  //         console.log('\n🛑 Manual stop requested')
  //         clearInterval(statusInterval)
  //         clearInterval(checkForSuccess)
  //         this.requestScheduler.stop()

  //         const finalStats = this.requestScheduler.getStats()
  //         console.log('\n📊 Final Statistics:')
  //         console.log(`   Total Requests: ${finalStats.totalRequests}`)
  //         console.log(`   Success Rate: ${finalStats.successRate}%`)

  //         resolve({
  //           success: false,
  //           reason: 'ManualStop',
  //           stats: finalStats
  //         })
  //       })
  //     })
  //   } catch (error) {
  //     console.error('Error in RequestScheduler run:', error.message)
  //     throw error
  //   }
  // }

  // stop() {
  //   this.isRunning = false
  //   this.profileBots.forEach((bot) => bot.stop())
  //   if (this.requestScheduler) {
  //     this.requestScheduler.stop()
  //   }
  // }

  // async cleanup() {
  //   const cleanupPromises = this.profileBots.map((bot) => bot.cleanup())
  //   await Promise.allSettled(cleanupPromises)
  // }
}

export const multiProfileTicketBot = new MultiProfileTicketBot()
