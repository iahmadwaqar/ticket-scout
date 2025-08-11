import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Profile, SystemMetrics, PriorityLevel, LogEntry } from '../renderer/src/types'
import { IPC_CHANNELS, type ElectronServiceAPI } from '../shared/ipc-types'

// Helper function to add timeout to IPC calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`IPC call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

// Custom APIs for renderer - implements ElectronServiceAPI interface
const api: ElectronServiceAPI = {
  // Profile operations
  launchProfile: (profileId: string): Promise<{ success: boolean }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_PROFILE, profileId)),
  
  cancelLaunch: (profileId: string): Promise<{ success: boolean }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CANCEL_LAUNCH, profileId)),
  
  setPriority: (profileId: string, priority: PriorityLevel): Promise<{ success: boolean }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SET_PRIORITY, profileId, priority), 5000),
  
  // System operations
  getSystemMetrics: (): Promise<SystemMetrics> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_SYSTEM_METRICS)),
  
  // Profile data operations
  loadProfileData: (): Promise<Profile[]> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROFILE_DATA)),
  
  // Window and menu operations
  windowMinimize: (): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE), 2000),
  
  windowMaximize: (): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE), 2000),
  
  windowClose: (): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE), 2000),
  
  getAppVersion: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION), 2000),
  
  showSaveDialog: (options) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options), 30000),
  
  showOpenDialog: (options) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options), 30000),
  
  showNotification: (title: string, body: string): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SHOW_NOTIFICATION, title, body), 2000),
  
  // Error reporting
  reportError: (errorReport): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.REPORT_ERROR, errorReport), 5000),
  
  // Logging operations
  getLogs: (): Promise<LogEntry[]> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS)),
  
  clearLogs: (): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS)),
  
  addLog: (profileId: string | 'Global', severity: 'Info' | 'Warning' | 'Error', message: string): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.ADD_LOG, profileId, severity, message)),
  
  // Launch All operations
  launchAllProfiles: (config): Promise<{ success: boolean; message?: string }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_ALL_PROFILES, config)),
  
  // Stop/Close All operations
  stopAllProfiles: (): Promise<{ success: boolean; message?: string }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.STOP_ALL_PROFILES)),
  
  closeAllProfiles: (): Promise<{ success: boolean; message?: string }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLOSE_ALL_PROFILES)),
  
  // Ticket operations (placeholder)
  fetchTickets: (): Promise<{ ticketsFound: number }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.FETCH_TICKETS)),
  
  // Profile data operations (placeholder)
  saveProfileData: (profiles: Profile[]): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROFILE_DATA, profiles)),
  
  // Individual profile operations
  launchSingleProfile: (profileId: string) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_SINGLE_PROFILE, profileId)),
  
  stopSingleProfile: (profileId: string) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.STOP_SINGLE_PROFILE, profileId)),
  
  closeSingleProfile: (profileId: string) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLOSE_SINGLE_PROFILE, profileId)),
  
  updateProfileData: (profileId: string, updates: any) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE_DATA, profileId, updates)),
  
  // Toast notifications
  sendToast: (toast: any) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SEND_TOAST, toast)),
  
  // Memory management operations
  getMemoryUsage: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_MEMORY_USAGE)),
  
  cleanupClosedProfiles: () =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_CLOSED_PROFILES)),
  
  setMemoryMonitoring: (enabled: boolean) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SET_MEMORY_MONITORING, enabled)),
  
  // Event listeners for real-time updates
  onLogAdded: (callback: (log: LogEntry) => void): (() => void) => {
    const handler = (_: any, log: LogEntry) => callback(log)
    ipcRenderer.on('log-added', handler)
    return () => ipcRenderer.removeListener('log-added', handler)
  },
  
  onProfilesFetched: (callback: (profiles: Profile[]) => void): (() => void) => {
    const handler = (_: any, profiles: Profile[]) => callback(profiles)
    ipcRenderer.on('profiles-fetched', handler)
    return () => ipcRenderer.removeListener('profiles-fetched', handler)
  },
  
  onProfileStatusChanged: (callback: (update: import('../shared/ipc-types').EnhancedProfileStatusUpdate) => void): (() => void) => {
    const handler = (_: any, update: import('../shared/ipc-types').EnhancedProfileStatusUpdate) => callback(update)
    ipcRenderer.on('profile-status-changed', handler)
    return () => ipcRenderer.removeListener('profile-status-changed', handler)
  },
  
  onAllProfilesClosed: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('all-profiles-closed', handler)
    return () => ipcRenderer.removeListener('all-profiles-closed', handler)
  },
  
  onToastReceived: (callback: (toast: any) => void): (() => void) => {
    const handler = (_: any, toast: any) => callback(toast)
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
