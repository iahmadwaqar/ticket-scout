import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { SystemMetrics } from '../renderer/src/types'
import { IPC_CHANNELS, type IPCHandler } from '../shared/ipc-types'
import { gologinService, type LaunchProfileRequest, type LaunchMultipleProfilesRequest } from './gologin-service'

function createWindow(): void {
  // Create the browser window with dashboard-optimized configuration
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: false, // Show menu bar for dashboard functionality
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Set up application menu
  createApplicationMenu(mainWindow)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Create application menu with dashboard-specific functionality
 */
function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Profile',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-profile')
          }
        },
        {
          label: 'Import Profiles',
          accelerator: 'CmdOrCtrl+I',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Import Profiles',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            })
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu-action', 'import-profiles', result.filePaths[0])
            }
          }
        },
        {
          label: 'Export Profiles',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              title: 'Export Profiles',
              defaultPath: 'profiles.json',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            })
            
            if (!result.canceled && result.filePath) {
              mainWindow.webContents.send('menu-action', 'export-profiles', result.filePath)
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-action', 'preferences')
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Dashboard',
      submenu: [
        {
          label: 'Start All Profiles',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'start-all-profiles')
          }
        },
        {
          label: 'Stop All Profiles',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => {
            mainWindow.webContents.send('menu-action', 'stop-all-profiles')
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Logs',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            mainWindow.webContents.send('menu-action', 'clear-logs')
          }
        },
        {
          label: 'Refresh System Metrics',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('menu-action', 'refresh-metrics')
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu-action', 'toggle-sidebar')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' as const },
          { role: 'front' as const }
        ] : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Ticket Scout',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Ticket Scout',
              message: 'Ticket Scout',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}`
            })
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/your-repo/ticket-scout#readme')
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/your-repo/ticket-scout/issues')
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })

    // Remove quit from File menu on macOS
    const fileMenu = template.find(item => item.label === 'File')
    if (fileMenu && Array.isArray(fileMenu.submenu)) {
      fileMenu.submenu = fileMenu.submenu.filter(item => 
        typeof item === 'object' && item.role !== 'quit'
      )
    }
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Set up window state management for dashboard
 */
function setupWindowStateManagement(mainWindow: BrowserWindow): void {
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
    if (!app.isQuiting) {
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
        app.isQuiting = true
        app.quit()
      }
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Register IPC handlers for service operations
  registerServiceHandlers()
  
  // Register menu action handlers
  registerMenuHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Add app quitting flag for proper window close handling
declare global {
  namespace Electron {
    interface App {
      isQuiting?: boolean
    }
  }
}

// Handle app before quit to set quitting flag
app.on('before-quit', async () => {
  app.isQuiting = true
  // Clean up GoLogin service
  await gologinService.cleanup()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

/**
 * Register IPC handlers for service operations
 */
function registerServiceHandlers(): void {
  // Profile operations
  const launchProfileHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_PROFILE> = async (_, profileId) => {
    try {
      console.log(`[MAIN] Launching profile: ${profileId}`)
      
      // Validate input
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }
      
      // Create launch request for GoLogin service
      const launchRequest: LaunchProfileRequest = {
        profileId,
        profileName: `Profile-${profileId}`,
        // TODO: Get these from profile data
        gologinProfileId: undefined,
        token: undefined
      }
      
      // Use GoLogin service to launch profile
      const result = await gologinService.launchProfile(launchRequest)
      
      return { 
        success: result.success,
        message: result.message 
      }
    } catch (error) {
      console.error(`[MAIN] Failed to launch profile ${profileId}:`, error)
      return { 
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const launchMultipleProfilesHandler: IPCHandler<typeof IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES> = async (_, profileIds, gologinProfileIds, token) => {
    try {
      console.log(`[MAIN] Launching multiple profiles: ${profileIds.length} profiles`);
      
      // Validate inputs
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        throw new Error('Invalid profile IDs provided');
      }
      if (!Array.isArray(gologinProfileIds) || gologinProfileIds.length !== profileIds.length) {
        throw new Error('GoLogin profile IDs must match the number of profiles');
      }
      if (!token || typeof token !== 'string') {
        throw new Error('GoLogin token is required');
      }
      
      // Create launch request for GoLogin service
      const launchRequest: LaunchMultipleProfilesRequest = {
        profileIds,
        gologinProfileIds,
        token
      };
      
      // Use GoLogin service to launch profiles
      const result = await gologinService.launchMultipleProfiles(launchRequest);
      
      return result;
    } catch (error) {
      console.error(`[MAIN] Failed to launch multiple profiles:`, error);
      return { 
        success: false,
        results: profileIds.map(profileId => ({
          profileId,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }))
      };
    }
  };

  const cancelLaunchHandler: IPCHandler<typeof IPC_CHANNELS.CANCEL_LAUNCH> = async (_, profileId) => {
    try {
      console.log(`[MAIN] Cancelling launch for profile: ${profileId}`)
      
      // Validate input
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }
      
      // Use GoLogin service to stop profile
      const result = await gologinService.stopProfile(profileId)
      
      return { 
        success: result.success,
        message: result.message 
      }
    } catch (error) {
      console.error(`[MAIN] Failed to cancel launch for profile ${profileId}:`, error)
      return { 
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  const setPriorityHandler: IPCHandler<typeof IPC_CHANNELS.SET_PRIORITY> = async (_, profileId, priority) => {
    try {
      console.log(`[MAIN] Setting priority for profile ${profileId} to ${priority}`)
      
      // Validate inputs
      if (!profileId || typeof profileId !== 'string') {
        throw new Error('Invalid profile ID provided')
      }
      if (!priority || !['High', 'Medium', 'Low'].includes(priority)) {
        throw new Error('Invalid priority level provided')
      }
      
      // TODO: Implement actual priority setting logic
      await new Promise(resolve => setTimeout(resolve, 200))
      return { success: true }
    } catch (error) {
      console.error(`[MAIN] Failed to set priority for profile ${profileId}:`, error)
      return { success: false }
    }
  }

  // Ticket operations
  const fetchTicketsHandler: IPCHandler<typeof IPC_CHANNELS.FETCH_TICKETS> = async () => {
    try {
      console.log(`[MAIN] Fetching tickets...`)
      // TODO: Implement actual ticket fetching logic
      await new Promise(resolve => setTimeout(resolve, 1000))
      const ticketsFound = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0
      return { ticketsFound }
    } catch (error) {
      console.error(`[MAIN] Failed to fetch tickets:`, error)
      return { ticketsFound: 0 }
    }
  }

  // System operations
  const getSystemMetricsHandler: IPCHandler<typeof IPC_CHANNELS.GET_SYSTEM_METRICS> = async () => {
    try {
      console.log(`[MAIN] Fetching system metrics...`)
      // TODO: Implement actual system metrics collection
      await new Promise(resolve => setTimeout(resolve, 500))
      const metrics: SystemMetrics = {
        cpuUsage: Math.floor(Math.random() * (85 - 20 + 1) + 20),
        memoryUsage: Math.floor(Math.random() * (90 - 30 + 1) + 30),
        concurrencyLimit: 35,
        throttlingState: Math.random() > 0.9 ? 'Active' : 'None',
      }
      return metrics
    } catch (error) {
      console.error(`[MAIN] Failed to get system metrics:`, error)
      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      }
    }
  }

  // Profile data operations (for future use)
  const saveProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.SAVE_PROFILE_DATA> = async (_, profiles) => {
    try {
      console.log(`[MAIN] Saving profile data for ${profiles.length} profiles`)
      // TODO: Implement actual profile data persistence
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`[MAIN] Failed to save profile data:`, error)
      throw error
    }
  }

  const loadProfileDataHandler: IPCHandler<typeof IPC_CHANNELS.LOAD_PROFILE_DATA> = async () => {
    try {
      console.log(`[MAIN] Loading profile data...`)
      // TODO: Implement actual profile data loading
      await new Promise(resolve => setTimeout(resolve, 300))
      return [] // Return empty array for now
    } catch (error) {
      console.error(`[MAIN] Failed to load profile data:`, error)
      return []
    }
  }

  // Register all handlers
  ipcMain.handle(IPC_CHANNELS.LAUNCH_PROFILE, launchProfileHandler)
  ipcMain.handle(IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES, launchMultipleProfilesHandler)
  ipcMain.handle(IPC_CHANNELS.CANCEL_LAUNCH, cancelLaunchHandler)
  ipcMain.handle(IPC_CHANNELS.SET_PRIORITY, setPriorityHandler)
  ipcMain.handle(IPC_CHANNELS.FETCH_TICKETS, fetchTicketsHandler)
  ipcMain.handle(IPC_CHANNELS.GET_SYSTEM_METRICS, getSystemMetricsHandler)
  ipcMain.handle(IPC_CHANNELS.SAVE_PROFILE_DATA, saveProfileDataHandler)
  ipcMain.handle(IPC_CHANNELS.LOAD_PROFILE_DATA, loadProfileDataHandler)
}

/**
 * Register IPC handlers for menu actions and window management
 */
function registerMenuHandlers(): void {
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
      version: app.getVersion(),
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
  ipcMain.handle('show-notification', (_, title: string, body: string) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      // Use system notifications if available
      if (process.platform === 'win32' || process.platform === 'darwin') {
        const { Notification } = require('electron')
        if (Notification.isSupported()) {
          new Notification({ title, body }).show()
        }
      }
    }
  })

  // Handle error reporting
  ipcMain.handle('report-error', (_, errorReport) => {
    console.error('[MAIN] Error reported from renderer:', errorReport)
    
    // Log error with timestamp and process info
    const logEntry = {
      timestamp: new Date().toISOString(),
      process: 'renderer',
      ...errorReport,
    }
    
    // TODO: Implement persistent error logging (file system, external service, etc.)
    // For now, just log to console with structured format
    console.error('[ERROR_LOG]', JSON.stringify(logEntry, null, 2))
    
    // Could also:
    // - Write to log file
    // - Send to external error reporting service
    // - Show native error dialog for critical errors
    // - Trigger application recovery mechanisms
  })
}
