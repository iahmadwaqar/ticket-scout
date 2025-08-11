// Shared IPC type definitions for type-safe communication between processes

import type { Profile, EnhancedProfile, SystemMetrics, PriorityLevel, LogEntry } from '../renderer/src/types'
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
  CANCEL_LAUNCH: 'service:cancel-launch',
  SET_PRIORITY: 'service:set-priority',
  
  // Individual profile operations
  LAUNCH_SINGLE_PROFILE: 'profile:launch-single',
  STOP_SINGLE_PROFILE: 'profile:stop-single',
  CLOSE_SINGLE_PROFILE: 'profile:close-single',
  UPDATE_PROFILE_DATA: 'profile:update-data',
  
  // Toast notifications
  SEND_TOAST: 'ui:send-toast',
  
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
  REPORT_ERROR: 'report-error',
  
  // Logging operations
  GET_LOGS: 'service:get-logs',
  CLEAR_LOGS: 'service:clear-logs',
  ADD_LOG: 'service:add-log',
  
  // Launch All operations
  LAUNCH_ALL_PROFILES: 'service:launch-all-profiles',
  
  // Stop/Close All operations
  STOP_ALL_PROFILES: 'service:stop-all-profiles',
  CLOSE_ALL_PROFILES: 'service:close-all-profiles',
  
  // Memory management operations
  GET_MEMORY_USAGE: 'service:get-memory-usage',
  CLEANUP_CLOSED_PROFILES: 'service:cleanup-closed-profiles',
  SET_MEMORY_MONITORING: 'service:set-memory-monitoring'
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
  [IPC_CHANNELS.GET_LOGS]: {
    args: []
    return: LogEntry[]
  }
  [IPC_CHANNELS.CLEAR_LOGS]: {
    args: []
    return: void
  }
  [IPC_CHANNELS.ADD_LOG]: {
    args: [profileId: string | 'Global', severity: 'Info' | 'Warning' | 'Error', message: string]
    return: void
  }
  [IPC_CHANNELS.LAUNCH_ALL_PROFILES]: {
    args: [config: LaunchAllConfig]
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.STOP_ALL_PROFILES]: {
    args: []
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.CLOSE_ALL_PROFILES]: {
    args: []
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.LAUNCH_SINGLE_PROFILE]: {
    args: [profileId: string]
    return: OperationResult
  }
  [IPC_CHANNELS.STOP_SINGLE_PROFILE]: {
    args: [profileId: string]
    return: OperationResult
  }
  [IPC_CHANNELS.CLOSE_SINGLE_PROFILE]: {
    args: [profileId: string]
    return: OperationResult
  }
  [IPC_CHANNELS.UPDATE_PROFILE_DATA]: {
    args: [profileId: string, updates: Partial<EnhancedProfile>]
    return: { success: boolean; message?: string }
  }
  [IPC_CHANNELS.SEND_TOAST]: {
    args: [toast: ToastMessage]
    return: void
  }
}

// Electron API interface for renderer process
export interface ElectronServiceAPI {
  // Profile operations
  launchProfile: (profileId: string) => Promise<{ success: boolean; message?: string }>
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
  
  // Logging operations
  getLogs: () => Promise<LogEntry[]>
  clearLogs: () => Promise<void>
  addLog: (profileId: string | 'Global', severity: 'Info' | 'Warning' | 'Error', message: string) => Promise<void>
  
  // Launch All operations
  launchAllProfiles: (config: LaunchAllConfig) => Promise<{ success: boolean; message?: string }>
  
  // Stop/Close All operations
  stopAllProfiles: () => Promise<{ success: boolean; message?: string }>
  closeAllProfiles: () => Promise<{ success: boolean; message?: string }>
  
  // Individual profile operations
  launchSingleProfile: (profileId: string) => Promise<OperationResult>
  stopSingleProfile: (profileId: string) => Promise<OperationResult>
  closeSingleProfile: (profileId: string) => Promise<OperationResult>
  updateProfileData: (profileId: string, updates: Partial<EnhancedProfile>) => Promise<{ success: boolean; message?: string }>
  
  // Toast notifications
  sendToast: (toast: ToastMessage) => Promise<void>
  
  // Memory management operations
  getMemoryUsage: () => Promise<{ success: boolean; data?: ProfileStoreMemoryInfo; error?: string }>
  cleanupClosedProfiles: () => Promise<{ success: boolean; data?: { message: string }; error?: string }>
  setMemoryMonitoring: (enabled: boolean) => Promise<{ success: boolean; data?: { enabled: boolean; message: string }; error?: string }>
  
  // Event listeners for real-time updates
  onLogAdded: (callback: (log: LogEntry) => void) => () => void
  onProfilesFetched: (callback: (profiles: Profile[]) => void) => () => void
  onProfileStatusChanged: (callback: (update: EnhancedProfileStatusUpdate) => void) => () => void
  onAllProfilesClosed: (callback: () => void) => () => void
  onToastReceived: (callback: (toast: ToastMessage) => void) => () => void
}

// Launch All configuration interface
export interface LaunchAllConfig {
  start: number
  count: number
  domain: string
  seats: number
  model: string
  cookies: boolean
}

// Individual profile operation result interface
export interface OperationResult {
  success: boolean
  message?: string
  profileId: string
}

// Toast notification interface
export interface ToastMessage {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

/**
 * Enhanced profile status update interface for comprehensive profile communication
 * 
 * This interface defines the complete data structure sent from the main process
 * to the renderer when profile status changes occur. It includes all enhanced
 * profile data to enable rich UI updates without additional IPC calls.
 * 
 * Used by:
 * - Profile operation functions to send status updates
 * - IPC handlers to communicate operation results
 * - Renderer components to update profile displays
 * - Error handlers to communicate error states
 */
export interface EnhancedProfileStatusUpdate {
  profileId: string
  status: string
  message?: string
  
  // Enhanced profile data
  ticketCount: number
  lastActivity: string
  errorMessage?: string
  operationalState: 'idle' | 'active' | 'error' | 'stopping'
  
  // Lifecycle timestamps
  launchedAt?: string
  stoppedAt?: string
  
  // Additional profile information for renderer context
  profileName?: string
  loginState?: 'Logged In' | 'Logged Out'
  priority?: 'High' | 'Medium' | 'Low'
  seats?: number
}

// Profile store memory usage information interface
export interface ProfileStoreMemoryInfo {
  totalProfiles: number
  activeProfiles: number
  idleProfiles: number
  errorProfiles: number
  stoppedProfiles: number
  memoryEstimateKB: number
  oldestProfileAge: number
  newestProfileAge: number
  averageProfileSize: number
}

// Helper type for extracting IPC handler function signatures
export type IPCHandler<T extends keyof IPCMessages> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: IPCMessages[T]['args']
) => Promise<IPCMessages[T]['return']>