/**
 * Simple logging utility for sending logs to the viewer
 */

class Logger {
  /**
   * Add a log entry that will appear in the log viewer
   * @param profileId - The profile ID or 'Global' for system-wide logs
   * @param severity - The severity level of the log
   * @param message - The log message
   */
  async addLog(profileId, severity, message) {
    try {
      await window.api.addLog(profileId, severity, message)
    } catch (error) {
      console.error('Failed to add log:', error)
    }
  }

  /**
   * Add an info log
   */
  async info(profileId, message) {
    return this.addLog(profileId, 'Info', message)
  }

  /**
   * Add a warning log
   */
  async warn(profileId, message) {
    return this.addLog(profileId, 'Warning', message)
  }

  /**
   * Add an error log
   */
  async error(profileId, message) {
    return this.addLog(profileId, 'Error', message)
  }

  /**
   * Add a global info log (convenience method)
   */
  async globalInfo(message) {
    return this.info('Global', message)
  }

  /**
   * Add a global warning log (convenience method)
   */
  async globalWarn(message) {
    return this.warn('Global', message)
  }

  /**
   * Add a global error log (convenience method)
   */
  async globalError(message) {
    return this.error('Global', message)
  }
}

// Export a singleton instance
export const logger = new Logger()