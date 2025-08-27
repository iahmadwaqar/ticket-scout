import { useState, useEffect } from 'react';
import { loadInitialState, saveAppState } from '@/lib/initial-state.js';
import { useErrorReporting } from '@/lib/error-service.js';

/**
 * Hook for managing application initial state
 * Handles loading, saving, and providing state management utilities
 */
export const useInitialState = () => {
  const { reportError } = useErrorReporting('useInitialState');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    concurrencyLimit: 0,
    throttlingState: 'None',
  });
  const [logs, setLogs] = useState([]);
  const [lastLogId, setLastLogId] = useState(0);

  // Load initial state on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const initialState = await loadInitialState();
        
        setProfiles(initialState.profiles);
        setSystemMetrics(initialState.systemMetrics);
        setLogs(initialState.logs);
        setLastLogId(initialState.lastLogId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load initial state');
        const errorMessage = error.message;
        setError(errorMessage);
        console.error('Error initializing state:', err);
        reportError(error, 'state-initialization');
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Auto-save state changes (debounced)
  useEffect(() => {
    if (!isLoading && profiles.length > 0) {
      const timeoutId = setTimeout(() => {
        saveAppState({ profiles, systemMetrics, logs });
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
    // Return undefined when condition is not met
    return undefined;
  }, [profiles, systemMetrics, logs, isLoading]);

  // Utility functions for state management
  const updateProfile = (profileId, updates) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.id === profileId 
          ? { ...profile, ...updates }
          : profile
      )
    );
  };

  const updateSystemMetrics = (updates) => {
    setSystemMetrics(prev => ({ ...prev, ...updates }));
  };

  const addLog = (log) => {
    const newLogId = lastLogId + 1;
    const newLog = {
      ...log,
      id: newLogId,
    };
    
    setLogs(prev => [newLog, ...prev]);
    setLastLogId(newLogId);
    
    return newLog;
  };

  const clearLogs = () => {
    setLogs([]);
    setLastLogId(0);
  };

  // Manual save function
  const saveState = async () => {
    try {
      await saveAppState({ profiles, systemMetrics, logs });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save state');
      console.error('Failed to save state:', err);
      reportError(error, 'state-save');
      return false;
    }
  };

  return {
    // State
    isLoading,
    error,
    profiles,
    systemMetrics,
    logs,
    lastLogId,
    
    // State setters (for direct manipulation if needed)
    setProfiles,
    setSystemMetrics,
    setLogs,
    setLastLogId,
    
    // Utility functions
    updateProfile,
    updateSystemMetrics,
    addLog,
    clearLogs,
    saveState,
  };
};