import { BrowserWindow } from 'electron'

/**
 * Logger service for the main process that forwards logs to renderer
 */
export class LoggerService {
    constructor() {
        this.logs = []
        this.logIdCounter = 1
        this.maxLogs = 100 // Keep last 1000 logs
        
        // Initialize with a startup log
        this.addLog('Global', 'Info', 'Logger service initialized')
    }

    /**
     * Add a new log entry
     */
    addLog(profileId, severity, message) {
        const logEntry = {
            id: this.logIdCounter++,
            timestamp: new Date().toISOString(),
            profileId,
            severity,
            message
        }

        // Add to internal storage
        this.logs.push(logEntry)

        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs)
        }

        // Send to all renderer processes
        this.broadcastLog(logEntry)
    }

    /**
     * Convenience methods for different log levels
     */
    info(profileId, message) {
        this.addLog(profileId, 'Info', message)
    }

    warn(profileId, message) {
        this.addLog(profileId, 'Warning', message)
    }

    error(profileId, message) {
        this.addLog(profileId, 'Error', message)
    }

    /**
     * Get all logs
     */
    getLogs() {
        return [...this.logs]
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = []
        this.logIdCounter = 1
        this.addLog('Global', 'Info', 'Logs cleared')
    }

    /**
     * Broadcast log to all renderer processes
     */
    broadcastLog(logEntry) {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('log-added', logEntry)
            }
        })
    }

}

// Export singleton instance
export const logger = new LoggerService()