import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerAllHandlers } from '../handlers/index.js'
import { registerWindowHandlers, createMainWindow } from './window-manager.js'
import { logger } from '../utils/logger-service.js'
import { gologinService } from '../services/gologin/index.js'

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
  // Handle app before quit to set quitting flag
  app.on('before-quit', async () => {
    app.isQuiting = true
    global.app = app // Make app globally available for window manager
    
    // Dispose of GoLogin service and all resources
    try {
      await gologinService.dispose()
      logger.info('Global', 'GoLogin service disposed successfully')
    } catch (error) {
      console.error('Error during GoLogin service disposal:', error)
      logger.addLog('Global', 'Error', `GoLogin service disposal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  logger.info('Global', 'Application shutdown handlers registered')
}