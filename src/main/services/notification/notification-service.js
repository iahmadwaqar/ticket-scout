import { logger } from '../../utils/logger-service.js'

/**
 * Notification Service
 * Handles sound notifications and alerts
 * Reference from Python: notification.py → TicketSoundPlayer
 */
export class NotificationService {
  constructor() {
    this.isPlaying = false
    this.queue = []
  }

  /**
   * Play sound notification for tickets found
   * @param {string} message - Message to announce
   * @returns {Promise<void>}
   */
  async playTicketSound(message) {
    try {
      logger.info('Global', `Playing sound notification: ${message}`)
      
      // In a real implementation, this would use:
      // 1. Web Speech API for text-to-speech
      // 2. Electron's notification system
      // 3. Or integrate with system notifications
      
      // For now, we'll use the browser's built-in notification if available
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.lang = 'en-US'
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        window.speechSynthesis.speak(utterance)
      } else {
        // Fallback: Use Electron's notification system
        this.showSystemNotification('Ticket Alert', message)
      }
      
    } catch (error) {
      logger.error('Global', `Sound notification error: ${error.message}`)
    }
  }

  /**
   * Show system notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  showSystemNotification(title, message) {
    try {
      // In Electron main process, this would use:
      // const { Notification } = require('electron')
      // new Notification({ title, body: message }).show()
      
      logger.info('Global', `System notification: ${title} - ${message}`)
      
      // For browser context, use Web Notifications API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message })
            }
          })
        }
      }
      
    } catch (error) {
      logger.error('Global', `System notification error: ${error.message}`)
    }
  }

  /**
   * Play multiple sounds concurrently (following Python threading pattern)
   * @param {string} message - Sound message
   */
  playTicketSoundAsync(message) {
    // Add to queue and process asynchronously
    this.queue.push(message)
    this.processQueue()
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.isPlaying || this.queue.length === 0) {
      return
    }

    this.isPlaying = true
    
    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift()
        await this.playTicketSound(message)
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      this.isPlaying = false
    }
  }

  /**
   * Clear notification queue
   */
  clearQueue() {
    this.queue = []
    logger.info('Global', 'Notification queue cleared')
  }
}

/**
 * Electron-specific notification service for main process
 */
export class ElectronNotificationService {
  constructor() {
    this.isMainProcess = typeof process !== 'undefined' && process.versions && process.versions.electron
  }

  /**
   * Show Electron notification in main process
   * @param {string} title - Notification title  
   * @param {string} message - Notification message
   */
  async showElectronNotification(title, message) {
    if (!this.isMainProcess) {
      logger.warn('Global', 'ElectronNotificationService can only be used in main process')
      return
    }

    try {
      const { Notification } = await import('electron')
      
      const notification = new Notification({
        title,
        body: message,
        icon: null, // Add icon path if needed
        sound: true
      })

      notification.show()
      
      logger.info('Global', `Electron notification shown: ${title}`)
      
    } catch (error) {
      logger.error('Global', `Electron notification error: ${error.message}`)
    }
  }

  /**
   * Play system sound (Windows specific)
   * @param {string} soundType - Type of sound ('default', 'notification', etc.)
   */
  async playSystemSound(soundType = 'notification') {
    if (!this.isMainProcess) {
      return
    }

    try {
      const { shell } = await import('electron')
      
      // On Windows, use shell.beep() or system sounds
      if (process.platform === 'win32') {
        shell.beep()
      }
      
    } catch (error) {
      logger.error('Global', `System sound error: ${error.message}`)
    }
  }
}

// Export singleton instances
export const notificationService = new NotificationService()
export const electronNotificationService = new ElectronNotificationService()