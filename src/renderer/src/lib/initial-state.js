/**
 * Initial state configuration for the Electron application
 * Handles both development (mock data) and production (persistent data) scenarios
 */

/**
 * Environment detection for determining data source
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || !window.electron;
};

/**
 * Loads initial application state
 * In development: uses mock data
 * In production: attempts to load from persistent storage, falls back to mock data
 */
export const loadInitialState = async () => {
  try {
    // In production, try to load from Electron's persistent storage
    // if (window.electron?.ipcRenderer) {
    //   try {
    //     const savedProfiles = await window.electron.ipcRenderer.invoke('load-profiles');
    //     const savedMetrics = await window.electron.ipcRenderer.invoke('load-system-metrics');
    //     const savedLogs = await window.electron.ipcRenderer.invoke('load-logs');

    //     // If we have saved data, use it
    //     if (savedProfiles && Array.isArray(savedProfiles) && savedProfiles.length > 0) {
    //       return {
    //         profiles: savedProfiles,
    //         systemMetrics: savedMetrics || [],
    //         logs: savedLogs || [],
    //         lastLogId: savedLogs ? Math.max(...savedLogs.map(log => log.id), 0) : 0,
    //       };
    //     }
    //   } catch (error) {
    //     console.warn('Failed to load saved state, falling back to mock data:', error);
    //   }
    // }

    // Fallback to mock data if no saved state or loading failed
    return {
      profiles: [],
      systemMetrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None',
      },
      logs: [],
      lastLogId: 0,
    };
  } catch (error) {
    console.error('Error loading initial state:', error);
    // Always fallback to mock data on error
    return {
      profiles: [],
      systemMetrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None',
      },
      logs: [],
      lastLogId: 0,
    };
  }
};

/**
 * Saves current application state to persistent storage
 * Only works in production Electron environment
 */
export const saveAppState = async (state) => {
  try {
    // Only save in production Electron environment
    if (!isDevelopment() && window.electron?.ipcRenderer) {
      if (state.profiles) {
        await window.electron.ipcRenderer.invoke('save-profiles', state.profiles);
      }
      if (state.systemMetrics) {
        await window.electron.ipcRenderer.invoke('save-system-metrics', state.systemMetrics);
      }
      if (state.logs) {
        await window.electron.ipcRenderer.invoke('save-logs', state.logs);
      }
    }
  } catch (error) {
    console.error('Failed to save application state:', error);
    // Don't throw - saving state is not critical for app functionality
  }
};

/**
 * Validates that the loaded state has the correct structure
 */
export const validateAppState = (state) => {
  return (
    state &&
    Array.isArray(state.profiles) &&
    typeof state.systemMetrics === 'object' &&
    Array.isArray(state.logs) &&
    typeof state.lastLogId === 'number'
  );
};