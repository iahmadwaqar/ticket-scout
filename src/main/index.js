import { app } from 'electron'
import { initializeApp, handleAppShutdown } from './core/app.js'

// Make app globally available for other modules
global.app = app

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  initializeApp()
})

// Set up application shutdown handlers
handleAppShutdown()