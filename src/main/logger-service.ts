import { BrowserWindow } from 'electron'
import type { LogEntry } from '../renderer/src/types'

export type LogSeverity = 'Info' | 'Warning' | 'Error'

/**
 * Logger service for the main process that forwards logs to renderer
 */
export class LoggerService {
    private logs: LogEntry[] = []
    private logIdCounter = 1
    private maxLogs = 1000 // Keep last 1000 logs

    constructor() {
        // Initialize with a startup log
        this.addLog('Global', 'Info', 'Logger service initialized')
    }

    /**
     * Add a new log entry
     */
    addLog(profileId: string | 'Global', severity: LogSeverity, message: string): void {
        const logEntry: LogEntry = {
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
    info(profileId: string | 'Global', message: string): void {
        this.addLog(profileId, 'Info', message)
    }

    warn(profileId: string | 'Global', message: string): void {
        this.addLog(profileId, 'Warning', message)
    }

    error(profileId: string | 'Global', message: string): void {
        this.addLog(profileId, 'Error', message)
    }

    /**
     * Get all logs
     */
    getLogs(): LogEntry[] {
        return [...this.logs]
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = []
        this.logIdCounter = 1
        this.addLog('Global', 'Info', 'Logs cleared')
    }

    /**
     * Broadcast log to all renderer processes
     */
    private broadcastLog(logEntry: LogEntry): void {
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