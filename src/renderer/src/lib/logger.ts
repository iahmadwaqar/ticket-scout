/**
 * Simple logging utility for sending logs to the viewer
 */

type LogSeverity = 'Info' | 'Warning' | 'Error'

class Logger {
  /**
   * Add a log entry that will appear in the log viewer
   * @param profileId - The profile ID or 'Global' for system-wide logs
   * @param severity - The severity level of the log
   * @param message - The log message
   */
  async addLog(profileId: string | 'Global', severity: LogSeverity, message: string): Promise<void> {
    try {
      await window.api.addLog(profileId, severity, message)
    } catch (error) {
      console.error('Failed to add log:', error)
    }
  }

  /**
   * Add an info log
   */
  async info(profileId: string | 'Global', message: string): Promise<void> {
    return this.addLog(profileId, 'Info', message)
  }

  /**
   * Add a warning log
   */
  async warn(profileId: string | 'Global', message: string): Promise<void> {
    return this.addLog(profileId, 'Warning', message)
  }

  /**
   * Add an error log
   */
  async error(profileId: string | 'Global', message: string): Promise<void> {
    return this.addLog(profileId, 'Error', message)
  }

  /**
   * Add a global info log (convenience method)
   */
  async globalInfo(message: string): Promise<void> {
    return this.info('Global', message)
  }

  /**
   * Add a global warning log (convenience method)
   */
  async globalWarn(message: string): Promise<void> {
    return this.warn('Global', message)
  }

  /**
   * Add a global error log (convenience method)
   */
  async globalError(message: string): Promise<void> {
    return this.error('Global', message)
  }
}

// Export a singleton instance
export const logger = new Logger()