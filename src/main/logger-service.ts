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

        // Add some sample logs for testing (remove in production)
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                this.addLog('Global', 'Info', 'Application started successfully')
                this.addLog('profile-1', 'Info', 'Profile configuration loaded')
                this.addLog('profile-2', 'Warning', 'Profile has missing configuration')
                this.addLog('Global', 'Info', 'Ready to launch profiles')
            }, 1000)
        }
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

        // Also log to console for debugging
        const timestamp = new Date().toLocaleTimeString()
        const prefix = `[${timestamp}] [${severity}] [${profileId}]`

        switch (severity) {
            case 'Error':
                console.error(prefix, message)
                break
            case 'Warning':
                console.warn(prefix, message)
                break
            default:
                console.log(prefix, message)
                break
        }
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

    /**
     * Log operation start/progress/completion
     */
    operation(
        profileId: string | 'Global',
        operation: string,
        status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED',
        details?: Record<string, any>
    ): void {
        const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''

        switch (status) {
            case 'IN_PROGRESS':
                this.info(profileId, `${operation} started${detailsStr}`)
                break
            case 'SUCCESS':
                this.info(profileId, `${operation} completed successfully${detailsStr}`)
                break
            case 'FAILED':
                this.error(profileId, `${operation} failed${detailsStr}`)
                break
        }
    }

    /**
     * Log debug information (only in development)
     */
    debug(profileId: string | 'Global', message: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            const dataStr = data ? ` - ${JSON.stringify(data)}` : ''
            this.info(profileId, `[DEBUG] ${message}${dataStr}`)
        }
    }
}

// Export singleton instance
export const logger = new LoggerService()