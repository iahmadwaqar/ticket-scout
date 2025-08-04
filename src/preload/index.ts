import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Profile, SystemMetrics, PriorityLevel } from '../renderer/src/types'
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
  
  launchMultipleProfiles: (profileIds: string[], gologinProfileIds: string[], token: string) =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES, profileIds, gologinProfileIds, token), 30000),
  
  cancelLaunch: (profileId: string): Promise<{ success: boolean }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.CANCEL_LAUNCH, profileId)),
  
  setPriority: (profileId: string, priority: PriorityLevel): Promise<{ success: boolean }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SET_PRIORITY, profileId, priority), 5000),
  
  // Ticket operations
  fetchTickets: (): Promise<{ ticketsFound: number }> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.FETCH_TICKETS), 15000),
  
  // System operations
  getSystemMetrics: (): Promise<SystemMetrics> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.GET_SYSTEM_METRICS)),
  
  // Profile data operations
  saveProfileData: (profiles: Profile[]): Promise<void> =>
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROFILE_DATA, profiles)),
  
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
    withTimeout(ipcRenderer.invoke(IPC_CHANNELS.REPORT_ERROR, errorReport), 5000)
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
