import { useState, useEffect, useCallback } from 'react'

export function useLogs() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load initial logs
  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const initialLogs = await window.api.getLogs()
      setLogs(initialLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
      console.error('Failed to load logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Clear all logs
  const clearLogs = useCallback(async () => {
    try {
      await window.api.clearLogs()
      setLogs([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs')
      console.error('Failed to clear logs:', err)
    }
  }, [])

  // Filter logs by severity
  const getLogsBySeverity = useCallback((severity) => {
    return logs.filter(log => log.severity === severity)
  }, [logs])

  // Filter logs by profile ID
  const getLogsByProfile = useCallback((profileId) => {
    return logs.filter(log => log.profileId === profileId)
  }, [logs])

  // Get recent logs (last N entries)
  const getRecentLogs = useCallback((count = 100) => {
    return logs.slice(-count)
  }, [logs])

  // Set up real-time log updates
  useEffect(() => {
    loadLogs()

    // Check if onLogAdded is available (might not be if app needs restart)
    if (window.api.onLogAdded && typeof window.api.onLogAdded === 'function') {
      // Listen for new logs from main process
      const unsubscribe = window.api.onLogAdded((newLog) => {
        setLogs(prevLogs => {
          // Add new log and keep only last 1000 logs
          const updatedLogs = [...prevLogs, newLog]
          return updatedLogs.slice(-1000)
        })
      })

      return unsubscribe
    } else {
      console.warn('Real-time log updates not available. Please restart the application.')
      
      // Fallback: Poll for logs every 2 seconds
      const pollInterval = setInterval(() => {
        loadLogs()
      }, 2000)
      
      return () => clearInterval(pollInterval)
    }
  }, [loadLogs])

  return {
    logs,
    isLoading,
    error,
    clearLogs,
    loadLogs,
    getLogsBySeverity,
    getLogsByProfile,
    getRecentLogs,
    // Computed values
    errorCount: logs.filter(log => log.severity === 'Error').length,
    warningCount: logs.filter(log => log.severity === 'Warning').length,
    infoCount: logs.filter(log => log.severity === 'Info').length
  }
}