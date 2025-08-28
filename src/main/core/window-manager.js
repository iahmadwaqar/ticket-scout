import { BrowserWindow, shell, dialog, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'
import { logger } from '../utils/logger-service.js'

/**
 * Create the main application window
 * @returns {BrowserWindow} The created main window
 */
export function createMainWindow() {
  // Create the browser window with dashboard-optimized configuration
  const mainWindow = new BrowserWindow({
    accentColor: '#2b7fff',
    center: true,
    icon: icon,
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // Center the window on screen
    mainWindow.center()

    // Set up window state management
    setupWindowStateManagement(mainWindow)

    // Set main window reference for gologin service
    // gologinService.setMainWindow(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the appropriate content based on environment
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**
 * Set up window state management for dashboard
 * @param {BrowserWindow} mainWindow - The main window to set up
 */
function setupWindowStateManagement(mainWindow) {
  // Handle window state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal')
  })

  mainWindow.on('minimize', () => {
    mainWindow.webContents.send('window-state-changed', 'minimized')
  })

  mainWindow.on('restore', () => {
    mainWindow.webContents.send('window-state-changed', 'normal')
  })

  // Handle window focus for dashboard updates
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus-changed', true)
  })

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus-changed', false)
  })

  // Prevent window from being closed accidentally
  mainWindow.on('close', (event) => {
    if (!global.app?.isQuiting) {
      event.preventDefault()

      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Cancel', 'Minimize to Tray', 'Quit'],
        defaultId: 0,
        title: 'Confirm Close',
        message: 'Are you sure you want to close Ticket Scout?',
        detail: 'Active profiles will be stopped.'
      })

      if (choice === 1) {
        // Minimize to tray (if tray is implemented)
        mainWindow.hide()
      } else if (choice === 2) {
        global.app.isQuiting = true
        global.app.quit()
      }
    }
  })
}

/**
 * Register IPC handlers for menu actions and window management
 */
export function registerWindowHandlers() {
  // Handle window control actions
  ipcMain.handle('window-minimize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.minimize()
    }
  })

  ipcMain.handle('window-maximize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      if (focusedWindow.isMaximized()) {
        focusedWindow.unmaximize()
      } else {
        focusedWindow.maximize()
      }
    }
  })

  ipcMain.handle('window-close', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })

  // Handle application info requests
  ipcMain.handle('get-app-version', () => {
    return {
      version: global.app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome
    }
  })

  // Handle file operations for profile import/export
  ipcMain.handle('show-save-dialog', async (_, options) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      return await dialog.showSaveDialog(focusedWindow, options)
    }
    return { canceled: true }
  })

  ipcMain.handle('show-open-dialog', async (_, options) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      return await dialog.showOpenDialog(focusedWindow, options)
    }
    return { canceled: true, filePaths: [] }
  })

  // Handle system notifications
  ipcMain.handle('show-notification', (_, title, body) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      // Use system notifications if available
      if (process.platform === 'win32' || process.platform === 'darwin') {
        if (Notification.isSupported()) {
          new Notification({ title, body }).show()
        }
      }
    }
  })

  // Handle error reporting
  ipcMain.handle('report-error', (_, errorReport) => {
    console.error('[MAIN] Error reported from renderer:', errorReport)
    logger.addLog('Global', 'Error', JSON.stringify(errorReport))
  })
}