// IPC channel names for service operations
export const IPC_CHANNELS = {
  // Individual profile operations
  LAUNCH_SINGLE_PROFILE: 'profile:launch-single',
  START_SINGLE_PROFILE: 'profile:start-single',
  STOP_SINGLE_PROFILE: 'profile:stop-single',
  CLOSE_SINGLE_PROFILE: 'profile:close-single',
  UPDATE_PROFILE_DATA: 'profile:update-data',
  
  // New profile operations from profile-table
  START_LOOKING_FOR_TICKETS: 'profile:start-looking-for-tickets',
  LOGIN_PROFILE: 'profile:login',
  SWITCH_PROFILE_LOGIN: 'profile:switch-login',
  UPDATE_PROFILE_SEATS: 'profile:update-seats',
  UPDATE_PROFILE_FIELD: 'profile:update-field',
  BRING_PROFILE_TO_FRONT: 'profile:bring-to-front',
  
  // Toast notifications
  // SEND_TOAST: 'ui:send-toast',
  
  // Ticket operations
  // FETCH_TICKETS: 'service:fetch-tickets',
  
  // System operations
  // GET_SYSTEM_METRICS: 'service:get-system-metrics',
  
  // Profile data operations
  // SAVE_PROFILE_DATA: 'service:save-profile-data',
  // LOAD_PROFILE_DATA: 'service:load-profile-data',
  
  // Window and menu operations
  // WINDOW_MINIMIZE: 'window-minimize',
  // WINDOW_MAXIMIZE: 'window-maximize',
  // WINDOW_CLOSE: 'window-close',
  // GET_APP_VERSION: 'get-app-version',
  // SHOW_SAVE_DIALOG: 'show-save-dialog',
  // SHOW_OPEN_DIALOG: 'show-open-dialog',
  // SHOW_NOTIFICATION: 'show-notification',
  
  // Error reporting
  // REPORT_ERROR: 'report-error',
  
  // Logging operations
  GET_LOGS: 'service:get-logs',
  CLEAR_LOGS: 'service:clear-logs',
  ADD_LOG: 'service:add-log',
  
  // Launch All operations
  LAUNCH_ALL_PROFILES: 'service:launch-all-profiles',
  
  // Stop/Close All operations
  STOP_ALL_PROFILES: 'service:stop-all-profiles',
  CLOSE_ALL_PROFILES: 'service:close-all-profiles',

  // Update cookies for all profiles
  UPDATE_COOKIES: 'service:update-cookies',
  
  // Domain information operations
  GET_DOMAIN_INFO: 'api:get-domain-info',
  
  // Memory management operations
  // GET_MEMORY_USAGE: 'service:get-memory-usage',
  // CLEANUP_CLOSED_PROFILES: 'service:cleanup-closed-profiles',
  // SET_MEMORY_MONITORING: 'service:set-memory-monitoring',
  
  // Scraping operations
  // RESUME_SCRAPING: 'scraping:resume'
}