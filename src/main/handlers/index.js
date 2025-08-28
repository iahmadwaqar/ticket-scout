import { registerProfileHandlers } from './profile-handlers.js'
import { registerScrapingHandlers } from './scraping-handlers.js'
import { registerSystemHandlers } from './system-handlers.js'
import { logger } from '../utils/logger-service.js'

/**
 * Register all IPC handlers for the application
 * This is the main entry point for all handler registration
 */
export function registerAllHandlers() {
  try {
    // Register profile-related handlers
    registerProfileHandlers()
    
    // Register scraping-related handlers
    registerScrapingHandlers()
    
    // Register system and logging handlers
    registerSystemHandlers()
    
  } catch (error) {
    logger.error(
      'Global',
      `Failed to register IPC handlers: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    throw error
  }
}

// Export sendToast utility for use by other modules
export { sendToast } from '../utils/toast-service.js'