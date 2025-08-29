import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerAllHandlers } from '../handlers/index.js'
import { registerWindowHandlers, createMainWindow } from './window-manager.js'
import { logger } from '../utils/logger-service.js'
import { cleanupManager } from '../services/cleanup-manager.js'
/**
 * Initialize the application
 */
export function initializeApp() {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.ticket-scout')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Register all IPC handlers
  registerAllHandlers()

  // Register window management handlers
  registerWindowHandlers()

  // Create the main window
  createMainWindow()

  // Handle activate event (macOS)
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  logger.info('Global', 'Application initialized successfully')
}

/**
 * Handle application shutdown
 */
export function handleAppShutdown() {
  // Handle app before quit to initiate cleanup
  app.on('before-quit', async (event) => {
    // Prevent immediate quit to allow cleanup
    if (!app.isQuiting) {
      event.preventDefault()
      
      logger.info('Global', 'Application shutdown initiated - starting cleanup process')
      app.isQuiting = true
      global.app = app // Make app globally available for window manager
      
      try {
        // Start comprehensive cleanup
        const cleanupResult = await cleanupManager.startCleanup('app-quit', false)
        
        if (cleanupResult.success) {
          logger.info('Global', `Cleanup completed successfully: ${cleanupResult.message}`)
        } else {
          logger.warn('Global', `Cleanup completed with issues: ${cleanupResult.message}`)
        }
        
        logger.info('Global', 'Application cleanup completed - proceeding with quit')
      } catch (error) {
        logger.error('Global', `Cleanup process failed: ${error.message}`)
        // Continue with quit even if cleanup fails
      }
      
      // Force quit after cleanup
      app.exit(0)
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
  
  // Handle SIGINT (Ctrl+C) for graceful shutdown
  process.on('SIGINT', async () => {
    logger.warn('Global', 'SIGINT received - initiating graceful shutdown')
    
    try {
      const cleanupResult = await cleanupManager.startCleanup('sigint', false)
      logger.info('Global', `SIGINT cleanup result: ${cleanupResult.message}`)
    } catch (error) {
      logger.error('Global', `SIGINT cleanup failed: ${error.message}`)
    }
    
    process.exit(0)
  })
  
  // Handle SIGTERM (Task manager kill, system shutdown) for emergency cleanup
  process.on('SIGTERM', async () => {
    logger.warn('Global', 'SIGTERM received - initiating emergency shutdown')
    
    try {
      const cleanupResult = await cleanupManager.startCleanup('sigterm', true)
      logger.warn('Global', `SIGTERM cleanup result: ${cleanupResult.message}`)
    } catch (error) {
      logger.error('Global', `SIGTERM cleanup failed: ${error.message}`)
    }
    
    process.exit(1)
  })
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Global', `Uncaught exception: ${error.message}`)
    
    try {
      const cleanupResult = await cleanupManager.startCleanup('uncaught-exception', true)
      logger.error('Global', `Exception cleanup result: ${cleanupResult.message}`)
    } catch (cleanupError) {
      logger.error('Global', `Exception cleanup failed: ${cleanupError.message}`)
    }
    
    process.exit(1)
  })
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Global', `Unhandled promise rejection at: ${promise}, reason: ${reason}`)
    
    try {
      const cleanupResult = await cleanupManager.startCleanup('unhandled-rejection', true)
      logger.error('Global', `Rejection cleanup result: ${cleanupResult.message}`)
    } catch (cleanupError) {
      logger.error('Global', `Rejection cleanup failed: ${cleanupError.message}`)
    }
    
    process.exit(1)
  })
  
  // Handle Windows-specific shutdown events
  if (process.platform === 'win32') {
    // Handle Windows shutdown/logoff
    process.on('SIGHUP', async () => {
      logger.warn('Global', 'SIGHUP received (Windows logoff/shutdown) - initiating emergency cleanup')
      
      try {
        const cleanupResult = await cleanupManager.startCleanup('sighup', true)
        logger.warn('Global', `SIGHUP cleanup result: ${cleanupResult.message}`)
      } catch (error) {
        logger.error('Global', `SIGHUP cleanup failed: ${error.message}`)
      }
      
      process.exit(1)
    })
  }
  
  logger.info('Global', 'Application shutdown handlers registered')
}