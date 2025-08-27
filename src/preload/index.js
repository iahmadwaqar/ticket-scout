import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc-types.js'

// Helper function to add timeout to IPC calls
function withTimeout(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`IPC call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

// Custom APIs for renderer
const api = {
  // Profile operations
  // launchProfile: (profileId) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_PROFILE, profileId)),
  
  // cancelLaunch: (profileId) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CANCEL_LAUNCH, profileId)),
  
  // setPriority: (profileId, priority) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SET_PRIORITY, profileId, priority), 5000),
  
  // System operations
  // getSystemMetrics: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_SYSTEM_METRICS)),
  
  // // Profile data operations
  // loadProfileData: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROFILE_DATA)),
  
  // // Window and menu operations
  // windowMinimize: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE), 2000),
  
  // windowMaximize: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE), 2000),
  
  // windowClose: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE), 2000),
  
  // getAppVersion: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION), 2000),
  
  // showSaveDialog: (options) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options), 30000),
  
  // showOpenDialog: (options) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options), 30000),
  
  // showNotification: (title, body) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_NOTIFICATION, title, body), 2000),
  
  // Error reporting
  // reportError: (errorReport) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.REPORT_ERROR, errorReport), 5000),
  
  // Logging operations
  getLogs: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS)),
  
  clearLogs: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS)),
  
  addLog: (profileId, severity, message) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.ADD_LOG, profileId, severity, message)),
  
  // Launch All operations
  launchAllProfiles: (config) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_ALL_PROFILES, config)),
  
  // Stop/Close All operations
  stopAllProfiles: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.STOP_ALL_PROFILES)),
  
  closeAllProfiles: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLOSE_ALL_PROFILES)),

  updateCookies: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.UPDATE_COOKIES)),
  
  // Ticket operations (placeholder)
  // fetchTickets: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.FETCH_TICKETS)),
  
  // // Profile data operations (placeholder)
  // saveProfileData: (profiles) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROFILE_DATA, profiles)),
  
  // Individual profile operations
  launchSingleProfile: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_SINGLE_PROFILE, profileId)),
  
  stopSingleProfile: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.STOP_SINGLE_PROFILE, profileId)),
  
  closeSingleProfile: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLOSE_SINGLE_PROFILE, profileId)),
  
  updateProfileData: (profileId, updates) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE_DATA, profileId, updates)),
  
  // New profile operations from profile-table
  startLookingForTickets: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.START_LOOKING_FOR_TICKETS, profileId)),
  
  loginProfile: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LOGIN_PROFILE, profileId)),
  
  switchProfileLogin: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SWITCH_PROFILE_LOGIN, profileId)),
  
  updateProfileSeats: (profileId, seats) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE_SEATS, profileId, seats)),
  
  updateProfileField: (profileId, field, value) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE_FIELD, profileId, field, value)),
  
  bringProfileToFront: (profileId) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.BRING_PROFILE_TO_FRONT, profileId)),
  
  // // Toast notifications
  // sendToast: (toast) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SEND_TOAST, toast)),
  
  // // Memory management operations
  // getMemoryUsage: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_MEMORY_USAGE)),
  
  // cleanupClosedProfiles: () =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_CLOSED_PROFILES)),
  
  // setMemoryMonitoring: (enabled) =>
  //   withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SET_MEMORY_MONITORING, enabled)),
  
  // Event listeners for real-time updates
  onLogAdded: (callback) => {
    const handler = (_, log) => callback(log)
    ipcRenderer.on('log-added', handler)
    return () => ipcRenderer.removeListener('log-added', handler)
  },
  
  onProfilesFetched: (callback) => {
    const handler = (_, profiles) => callback(profiles)
    ipcRenderer.on('profiles-fetched', handler)
    return () => ipcRenderer.removeListener('profiles-fetched', handler)
  },
  
  onProfileStatusChanged: (callback) => {
    const handler = (_, update) => callback(update)
    ipcRenderer.on('profile-status-changed', handler)
    return () => ipcRenderer.removeListener('profile-status-changed', handler)
  },
  
  onAllProfilesClosed: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('all-profiles-closed', handler)
    return () => ipcRenderer.removeListener('all-profiles-closed', handler)
  },
  
  onToastReceived: (callback) => {
    const handler = (_, toast) => callback(toast)
    ipcRenderer.on('toast-received', handler)
    return () => ipcRenderer.removeListener('toast-received', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}