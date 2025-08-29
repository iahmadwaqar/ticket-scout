/**
 * Cleanup Manager Service
 * 
 * Centralized service for managing graceful shutdown and cleanup of all application resources.
 * Handles various shutdown scenarios including:
 * - Normal app close (window close, quit menu)
 * - Ctrl+C / SIGINT interruption
 * - Task manager kill / SIGTERM
 * - System shutdown
 * 
 * Features:
 * - Graceful cleanup with fallback to force cleanup
 * - Timeout protection to prevent hanging
 * - Comprehensive resource cleanup (GoLogin, ProfileStore, etc.)
 * - Cross-platform process termination
 * - Detailed logging and monitoring
 */

import { logger } from '../utils/logger-service.js'
import { goLoginService } from './gologin/index.js'
import { profileStore } from './profile/profileStore.js'
import { spawn } from 'child_process'
import { platform } from 'os'

export class CleanupManager {
  constructor() {
    this.isCleanupInProgress = false
    this.isDisposed = false
    this.cleanupStartTime = null
    this.forceKillTimer = null
    this.cleanupResults = []
    
    // Cleanup configuration
    this.GRACEFUL_TIMEOUT_MS = 15000  // 15 seconds for graceful cleanup
    this.FORCE_TIMEOUT_MS = 8000      // 8 seconds for force cleanup
    this.EMERGENCY_TIMEOUT_MS = 3000  // 3 seconds for emergency exit
  }

  /**
   * Start comprehensive cleanup process
   * @param {string} reason - Reason for cleanup (e.g., 'app-quit', 'sigint', 'sigterm')
   * @param {boolean} isEmergency - Whether this is an emergency shutdown
   * @returns {Promise<Object>} Cleanup result
   */
  async startCleanup(reason = 'unknown', isEmergency = false) {
    if (this.isCleanupInProgress) {
      logger.warn('Global', `Cleanup already in progress, ignoring new cleanup request: ${reason}`)
      return {
        success: false,
        message: 'Cleanup already in progress',
        reason: 'already-running'
      }
    }

    if (this.isDisposed) {
      logger.warn('Global', `CleanupManager already disposed, ignoring cleanup request: ${reason}`)
      return {
        success: true,
        message: 'Already disposed',
        reason: 'already-disposed'
      }
    }

    this.isCleanupInProgress = true
    this.cleanupStartTime = Date.now()
    this.cleanupResults = []

    logger.info('Global', `=== Starting comprehensive cleanup process ===`)
    logger.info('Global', `Cleanup reason: ${reason}`)
    logger.info('Global', `Emergency mode: ${isEmergency}`)

    try {
      if (isEmergency) {
        return await this.performEmergencyCleanup(reason)
      } else {
        return await this.performGracefulCleanup(reason)
      }
    } catch (error) {
      logger.error('Global', `Cleanup process failed: ${error.message}`)
      
      // Fallback to emergency cleanup
      try {
        logger.warn('Global', 'Attempting emergency cleanup as fallback')
        return await this.performEmergencyCleanup('cleanup-error-fallback')
      } catch (emergencyError) {
        logger.error('Global', `Emergency cleanup also failed: ${emergencyError.message}`)
        return {
          success: false,
          message: `Cleanup failed: ${error.message}, Emergency: ${emergencyError.message}`,
          reason,
          duration: Date.now() - this.cleanupStartTime
        }
      }
    } finally {
      this.finalizeCleanup()
    }
  }

  /**
   * Perform graceful cleanup with timeout protection
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async performGracefulCleanup(reason) {
    logger.info('Global', 'Starting graceful cleanup sequence')

    // Set up timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Graceful cleanup timed out after ${this.GRACEFUL_TIMEOUT_MS}ms`))
      }, this.GRACEFUL_TIMEOUT_MS)
    })

    const cleanupPromise = this.executeGracefulCleanupSteps(reason)

    try {
      const result = await Promise.race([cleanupPromise, timeoutPromise])
      logger.info('Global', 'Graceful cleanup completed successfully')
      return result
    } catch (error) {
      if (error.message.includes('timed out')) {
        logger.warn('Global', 'Graceful cleanup timed out, switching to force cleanup')
        return await this.performForceCleanup(reason + '-timeout')
      }
      throw error
    }
  }

  /**
   * Execute graceful cleanup steps in sequence
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async executeGracefulCleanupSteps(reason) {
    const steps = []

    // Step 1: Close all GoLogin profiles
    logger.info('Global', '[STEP 1/3] Closing all GoLogin profiles')
    const stepStartTime = Date.now()
    try {
      const goLoginResult = await goLoginService.closeAllProfiles()
      const stepDuration = Date.now() - stepStartTime
      
      steps.push({
        step: 'gologin-cleanup',
        success: goLoginResult.success,
        message: goLoginResult.message,
        profilesProcessed: goLoginResult.profilesProcessed,
        duration: stepDuration
      })
      
      logger.info('Global', `GoLogin cleanup: ${goLoginResult.success ? 'SUCCESS' : 'FAILED'} (${stepDuration}ms)`)
    } catch (error) {
      const stepDuration = Date.now() - stepStartTime
      steps.push({
        step: 'gologin-cleanup',
        success: false,
        message: error.message,
        duration: stepDuration
      })
      logger.error('Global', `GoLogin cleanup failed: ${error.message} (${stepDuration}ms)`)
    }

    // Step 2: ProfileStore cleanup
    logger.info('Global', '[STEP 2/3] Cleaning up ProfileStore')
    const step2StartTime = Date.now()
    try {
      await profileStore.cleanup()
      const step2Duration = Date.now() - step2StartTime
      
      steps.push({
        step: 'profilestore-cleanup',
        success: true,
        message: 'ProfileStore cleanup completed',
        duration: step2Duration
      })
      
      logger.info('Global', `ProfileStore cleanup: SUCCESS (${step2Duration}ms)`)
    } catch (error) {
      const step2Duration = Date.now() - step2StartTime
      steps.push({
        step: 'profilestore-cleanup',
        success: false,
        message: error.message,
        duration: step2Duration
      })
      logger.error('Global', `ProfileStore cleanup failed: ${error.message} (${step2Duration}ms)`)
    }

    // Step 3: Final resource verification
    logger.info('Global', '[STEP 3/3] Verifying resource cleanup')
    const step3StartTime = Date.now()
    try {
      const verificationResult = await this.verifyResourceCleanup()
      const step3Duration = Date.now() - step3StartTime
      
      steps.push({
        step: 'resource-verification',
        success: verificationResult.success,
        message: verificationResult.message,
        duration: step3Duration
      })
      
      logger.info('Global', `Resource verification: ${verificationResult.success ? 'SUCCESS' : 'WARNING'} (${step3Duration}ms)`)
    } catch (error) {
      const step3Duration = Date.now() - step3StartTime
      steps.push({
        step: 'resource-verification',
        success: false,
        message: error.message,
        duration: step3Duration
      })
      logger.warn('Global', `Resource verification failed: ${error.message} (${step3Duration}ms)`)
    }

    const totalDuration = Date.now() - this.cleanupStartTime
    const successful = steps.filter(s => s.success).length
    const failed = steps.filter(s => !s.success).length

    return {
      success: failed === 0,
      message: `Graceful cleanup completed - ${successful} successful, ${failed} failed`,
      reason,
      type: 'graceful',
      steps,
      totalSteps: steps.length,
      successful,
      failed,
      duration: totalDuration
    }
  }

  /**
   * Perform force cleanup with shorter timeouts
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async performForceCleanup(reason) {
    logger.warn('Global', 'Starting FORCE cleanup sequence')

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Force cleanup timed out after ${this.FORCE_TIMEOUT_MS}ms`))
      }, this.FORCE_TIMEOUT_MS)
    })

    const forceCleanupPromise = this.executeForceCleanupSteps(reason)

    try {
      const result = await Promise.race([forceCleanupPromise, timeoutPromise])
      logger.warn('Global', 'Force cleanup completed')
      return result
    } catch (error) {
      if (error.message.includes('timed out')) {
        logger.error('Global', 'Force cleanup timed out, switching to emergency cleanup')
        return await this.performEmergencyCleanup(reason + '-force-timeout')
      }
      throw error
    }
  }

  /**
   * Execute force cleanup steps with shorter timeouts
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async executeForceCleanupSteps(reason) {
    const steps = []

    // Force GoLogin cleanup
    logger.warn('Global', '[FORCE STEP 1/2] Force cleaning GoLogin instances')
    const step1StartTime = Date.now()
    try {
      const goLoginResult = await goLoginService.forceCleanupAll()
      const step1Duration = Date.now() - step1StartTime
      
      steps.push({
        step: 'force-gologin-cleanup',
        success: goLoginResult.success,
        message: goLoginResult.message,
        duration: step1Duration
      })
      
      logger.warn('Global', `Force GoLogin cleanup: ${goLoginResult.success ? 'SUCCESS' : 'FAILED'} (${step1Duration}ms)`)
    } catch (error) {
      const step1Duration = Date.now() - step1StartTime
      steps.push({
        step: 'force-gologin-cleanup',
        success: false,
        message: error.message,
        duration: step1Duration
      })
      logger.error('Global', `Force GoLogin cleanup failed: ${error.message} (${step1Duration}ms)`)
    }

    // Force ProfileStore disposal
    logger.warn('Global', '[FORCE STEP 2/2] Force disposing ProfileStore')
    const step2StartTime = Date.now()
    try {
      await profileStore.dispose()
      const step2Duration = Date.now() - step2StartTime
      
      steps.push({
        step: 'force-profilestore-disposal',
        success: true,
        message: 'ProfileStore force disposal completed',
        duration: step2Duration
      })
      
      logger.warn('Global', `Force ProfileStore disposal: SUCCESS (${step2Duration}ms)`)
    } catch (error) {
      const step2Duration = Date.now() - step2StartTime
      steps.push({
        step: 'force-profilestore-disposal',
        success: false,
        message: error.message,
        duration: step2Duration
      })
      logger.error('Global', `Force ProfileStore disposal failed: ${error.message} (${step2Duration}ms)`)
    }

    const totalDuration = Date.now() - this.cleanupStartTime
    const successful = steps.filter(s => s.success).length
    const failed = steps.filter(s => !s.success).length

    return {
      success: true, // Force cleanup always returns success
      message: `Force cleanup completed - ${successful} successful, ${failed} failed`,
      reason,
      type: 'force',
      steps,
      totalSteps: steps.length,
      successful,
      failed,
      duration: totalDuration
    }
  }

  /**
   * Perform emergency cleanup with minimal operations
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async performEmergencyCleanup(reason) {
    logger.error('Global', 'Starting EMERGENCY cleanup sequence')

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          message: 'Emergency cleanup timed out',
          reason,
          type: 'emergency-timeout'
        })
      }, this.EMERGENCY_TIMEOUT_MS)
    })

    const emergencyPromise = this.executeEmergencyCleanupSteps(reason)

    const result = await Promise.race([emergencyPromise, timeoutPromise])
    logger.error('Global', 'Emergency cleanup completed')
    return result
  }

  /**
   * Execute emergency cleanup steps with minimal timeout
   * @param {string} reason - Cleanup reason
   * @returns {Promise<Object>} Cleanup result
   */
  async executeEmergencyCleanupSteps(reason) {
    logger.error('Global', '[EMERGENCY] Force-killing all browser processes')

    try {
      // Just kill all browser processes and clear memory
      await this.forceKillAllBrowserProcesses()
      
      // Quick memory cleanup
      try {
        profileStore.instances.clear()
        profileStore.bots.clear()
        profileStore.profiles.clear()
      } catch (memoryError) {
        logger.error('Global', `Emergency memory cleanup failed: ${memoryError.message}`)
      }

      const totalDuration = Date.now() - this.cleanupStartTime

      return {
        success: true,
        message: 'Emergency cleanup completed - all browser processes killed',
        reason,
        type: 'emergency',
        duration: totalDuration
      }
    } catch (error) {
      const totalDuration = Date.now() - this.cleanupStartTime
      return {
        success: false,
        message: `Emergency cleanup failed: ${error.message}`,
        reason,
        type: 'emergency-failed',
        duration: totalDuration
      }
    }
  }

  /**
   * Force kill all browser processes across platforms
   * @returns {Promise<void>}
   */
  async forceKillAllBrowserProcesses() {
    const currentPlatform = platform()
    
    const killCommands = []
    
    if (currentPlatform === 'win32') {
      // Windows: Kill Chrome/Edge processes
      killCommands.push(
        { cmd: 'taskkill', args: ['/F', '/IM', 'chrome.exe', '/T'] },
        { cmd: 'taskkill', args: ['/F', '/IM', 'msedge.exe', '/T'] },
        { cmd: 'taskkill', args: ['/F', '/IM', 'chromium.exe', '/T'] }
      )
    } else {
      // Unix: Kill Chrome/Chromium processes
      killCommands.push(
        { cmd: 'pkill', args: ['-f', 'chrome'] },
        { cmd: 'pkill', args: ['-f', 'chromium'] },
        { cmd: 'pkill', args: ['-f', 'Chrome'] },
        { cmd: 'pkill', args: ['-f', 'Chromium'] }
      )
    }

    const killPromises = killCommands.map(async ({ cmd, args }) => {
      return new Promise((resolve) => {
        const killProcess = spawn(cmd, args)
        
        killProcess.on('close', (code) => {
          logger.info('Global', `Kill command "${cmd} ${args.join(' ')}" exited with code ${code}`)
          resolve()
        })
        
        killProcess.on('error', (error) => {
          logger.warn('Global', `Kill command "${cmd}" failed: ${error.message}`)
          resolve() // Don't reject, continue with other kill commands
        })
        
        // Timeout individual kill commands
        setTimeout(() => {
          killProcess.kill('SIGTERM')
          resolve()
        }, 2000)
      })
    })

    await Promise.all(killPromises)
    logger.info('Global', 'All browser process kill commands completed')
  }

  /**
   * Verify that resources have been properly cleaned up
   * @returns {Promise<Object>} Verification result
   */
  async verifyResourceCleanup() {
    try {
      const issues = []

      // Check ProfileStore
      if (profileStore.profiles.size > 0) {
        issues.push(`ProfileStore still has ${profileStore.profiles.size} profiles`)
      }
      if (profileStore.instances.size > 0) {
        issues.push(`ProfileStore still has ${profileStore.instances.size} instances`)
      }
      if (profileStore.bots.size > 0) {
        issues.push(`ProfileStore still has ${profileStore.bots.size} bots`)
      }

      // Check for running browser processes
      const hasRunningBrowsers = await this.checkForRunningBrowsers()
      if (hasRunningBrowsers) {
        issues.push('Browser processes still running')
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 
          ? 'All resources verified as clean' 
          : `Found ${issues.length} issues: ${issues.join(', ')}`,
        issues
      }
    } catch (error) {
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
        issues: [error.message]
      }
    }
  }

  /**
   * Check if browser processes are still running
   * @returns {Promise<boolean>} True if browsers are running
   */
  async checkForRunningBrowsers() {
    try {
      const currentPlatform = platform()
      let checkCommand, checkArgs

      if (currentPlatform === 'win32') {
        checkCommand = 'tasklist'
        checkArgs = ['/FI', 'IMAGENAME eq chrome.exe', '/FO', 'CSV']
      } else {
        checkCommand = 'pgrep'
        checkArgs = ['-f', 'chrome|chromium']
      }

      return new Promise((resolve) => {
        const checkProcess = spawn(checkCommand, checkArgs)
        
        let stdout = ''
        checkProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        checkProcess.on('close', (code) => {
          if (currentPlatform === 'win32') {
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Image Name'))
            resolve(lines.length > 0)
          } else {
            resolve(code === 0)
          }
        })
        
        checkProcess.on('error', () => {
          resolve(false)
        })
        
        setTimeout(() => {
          checkProcess.kill('SIGTERM')
          resolve(false)
        }, 2000)
      })
    } catch (error) {
      logger.warn('Global', `Error checking for running browsers: ${error.message}`)
      return false
    }
  }

  /**
   * Finalize cleanup process
   */
  finalizeCleanup() {
    const totalDuration = this.cleanupStartTime ? Date.now() - this.cleanupStartTime : 0
    
    logger.info('Global', `=== Cleanup process finalized ===`)
    logger.info('Global', `Total cleanup duration: ${totalDuration}ms`)
    
    this.isCleanupInProgress = false
    this.isDisposed = true
    
    if (this.forceKillTimer) {
      clearTimeout(this.forceKillTimer)
      this.forceKillTimer = null
    }
  }

  /**
   * Quick cleanup status check
   * @returns {Object} Current cleanup status
   */
  getStatus() {
    return {
      isCleanupInProgress: this.isCleanupInProgress,
      isDisposed: this.isDisposed,
      cleanupStartTime: this.cleanupStartTime,
      duration: this.cleanupStartTime ? Date.now() - this.cleanupStartTime : 0
    }
  }
}

// Export singleton instance
export const cleanupManager = new CleanupManager()