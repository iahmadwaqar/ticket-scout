// Shared IPC type definitions for type-safe communication between processes

import type { Profile, SystemMetrics, PriorityLevel } from '../renderer/src/types'
import type { ErrorReport } from '../renderer/src/lib/error-service'

// Common IPC response wrapper for error handling
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// IPC channel names for service operations
export const IPC_CHANNELS = {
  // Profile operations
  LAUNCH_PROFILE: 'service:launch-profile',
  LAUNCH_MULTIPLE_PROFILES: 'service:launch-multiple-profiles',
  CANCEL_LAUNCH: 'service:cancel-launch',
  SET_PRIORITY: 'service:set-priority',
  
  // Ticket operations
  FETCH_TICKETS: 'service:fetch-tickets',
  
  // System operations
  GET_SYSTEM_METRICS: 'service:get-system-metrics',
  
  // Profile data operations
  SAVE_PROFILE_DATA: 'service:save-profile-data',
  LOAD_PROFILE_DATA: 'service:load-profile-data',
  
  // Window and menu operations
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  GET_APP_VERSION: 'get-app-version',
  SHOW_SAVE_DIALOG: 'show-save-dialog',
  SHOW_OPEN_DIALOG: 'show-open-dialog',
  SHOW_NOTIFICATION: 'show-notification',
  
  // Error reporting
  REPORT_ERROR: 'report-error'
} as const

// Application version info interface
export interface AppVersionInfo {
  version: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
}

// Dialog options interfaces
export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface OpenDialogOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

// IPC message types for type safety
export interface IPCMessages {
  [IPC_CHANNELS.LAUNCH_PROFILE]: {
    args: [profileId: string]
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.LAUNCH_MULTIPLE_PROFILES]: {
    args: [profileIds: string[], gologinProfileIds: string[], token: string]
    return: { success: boolean; results: Array<{ profileId: string; success: boolean; message?: string }> }
  }
  [IPC_CHANNELS.CANCEL_LAUNCH]: {
    args: [profileId: string]
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.SET_PRIORITY]: {
    args: [profileId: string, priority: PriorityLevel]
    return: { success: boolean }
  }
  [IPC_CHANNELS.FETCH_TICKETS]: {
    args: []
    return: { ticketsFound: number }
  }
  [IPC_CHANNELS.GET_SYSTEM_METRICS]: {
    args: []
    return: SystemMetrics
  }
  [IPC_CHANNELS.SAVE_PROFILE_DATA]: {
    args: [profiles: Profile[]]
    return: void
  }
  [IPC_CHANNELS.LOAD_PROFILE_DATA]: {
    args: []
    return: Profile[]
  }
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    args: []
    return: void
  }
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: {
    args: []
    return: void
  }
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    args: []
    return: void
  }
  [IPC_CHANNELS.GET_APP_VERSION]: {
    args: []
    return: AppVersionInfo
  }
  [IPC_CHANNELS.SHOW_SAVE_DIALOG]: {
    args: [options: SaveDialogOptions]
    return: { canceled: boolean; filePath?: string }
  }
  [IPC_CHANNELS.SHOW_OPEN_DIALOG]: {
    args: [options: OpenDialogOptions]
    return: { canceled: boolean; filePaths: string[] }
  }
  [IPC_CHANNELS.SHOW_NOTIFICATION]: {
    args: [title: string, body: string]
    return: void
  }
  [IPC_CHANNELS.REPORT_ERROR]: {
    args: [errorReport: ErrorReport]
    return: void
  }
}

// Electron API interface for renderer process
export interface ElectronServiceAPI {
  // Profile operations
  launchProfile: (profileId: string) => Promise<{ success: boolean; message?: string }>
  launchMultipleProfiles: (profileIds: string[], gologinProfileIds: string[], token: string) => Promise<{ success: boolean; results: Array<{ profileId: string; success: boolean; message?: string }> }>
  cancelLaunch: (profileId: string) => Promise<{ success: boolean; message?: string }>
  setPriority: (profileId: string, priority: PriorityLevel) => Promise<{ success: boolean }>
  
  // Ticket operations
  fetchTickets: () => Promise<{ ticketsFound: number }>
  
  // System operations
  getSystemMetrics: () => Promise<SystemMetrics>
  
  // Profile data operations
  saveProfileData: (profiles: Profile[]) => Promise<void>
  loadProfileData: () => Promise<Profile[]>
  
  // Window and menu operations
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  getAppVersion: () => Promise<AppVersionInfo>
  showSaveDialog: (options: SaveDialogOptions) => Promise<{ canceled: boolean; filePath?: string }>
  showOpenDialog: (options: OpenDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>
  showNotification: (title: string, body: string) => Promise<void>
  
  // Error reporting
  reportError: (errorReport: ErrorReport) => Promise<void>
}

// Helper type for extracting IPC handler function signatures
export type IPCHandler<T extends keyof IPCMessages> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: IPCMessages[T]['args']
) => Promise<IPCMessages[T]['return']>