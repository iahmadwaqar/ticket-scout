import React from 'react';

/**
 * Error service for centralized error handling and reporting
 * Provides consistent error logging and user notification across the application
 */
class ErrorService {
  constructor() {
    this.errorQueue = [];
    this.isReporting = false;
    this.maxQueueSize = 100;
    this.reportingInterval = 5000; // 5 seconds
  }

  /**
   * Initialize global error handlers
   */
  initializeGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'UnhandledPromiseRejection'
      );
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.reportError(
        event.error instanceof Error ? event.error : new Error(event.message),
        'UncaughtError'
      );
    });
  }

  /**
   * Report a general error
   */
  async reportError(error, context = 'Unknown') {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    console.error(`[ErrorService] ${context}:`, error);

    // Add to queue for batch processing
    this.addToQueue(errorInfo);

    // Try to send to main process for logging
    try {
      if (window.api?.logError) {
        await window.api.logError(errorInfo);
      }
    } catch (reportingError) {
      console.error('Failed to report error to main process:', reportingError);
    }
  }

  /**
   * Report a service-specific error
   */
  async reportServiceError(serviceName, operation, error, params = {}) {
    const context = `${serviceName}.${operation}`;
    const enhancedError = new Error(`Service error in ${context}: ${error.message}`);
    enhancedError.stack = error.stack;
    enhancedError.originalError = error;
    enhancedError.serviceParams = params;

    await this.reportError(enhancedError, context);
  }

  /**
   * Report an IPC communication error
   */
  async reportIPCError(channel, error, args = []) {
    const context = `IPC.${channel}`;
    const enhancedError = new Error(`IPC error on channel ${channel}: ${error.message}`);
    enhancedError.stack = error.stack;
    enhancedError.originalError = error;
    enhancedError.ipcArgs = args;

    await this.reportError(enhancedError, context);
  }

  /**
   * Add error to processing queue
   */
  addToQueue(errorInfo) {
    this.errorQueue.push(errorInfo);

    // Limit queue size to prevent memory issues
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }

    // Start processing if not already running
    if (!this.isReporting) {
      this.processQueue();
    }
  }

  /**
   * Process error queue in batches
   */
  async processQueue() {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      // Process errors in batches
      const batch = this.errorQueue.splice(0, 10); // Process up to 10 errors at once

      for (const errorInfo of batch) {
        try {
          // Additional processing could go here
          // For now, just ensure they're logged
          console.log('[ErrorService] Processed error:', errorInfo.context);
        } catch (processingError) {
          console.error('Error processing error info:', processingError);
        }
      }
    } finally {
      this.isReporting = false;

      // Continue processing if there are more errors
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processQueue(), this.reportingInterval);
      }
    }
  }

  /**
   * Get current error service status
   */
  getStatus() {
    return {
      queueLength: this.errorQueue.length,
      isReporting: this.isReporting,
    };
  }

  /**
   * Clear error queue
   */
  clearErrorQueue() {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const errorService = new ErrorService();

/**
 * Utility function to wrap async functions with error handling
 */
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      await errorService.reportError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
}

/**
 * Utility function to wrap sync functions with error handling
 */
export function withSyncErrorHandling(fn, context) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      errorService.reportError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
}

/**
 * React hook for error handling in components
 */
export function useErrorReporting(componentName) {
  const reportError = React.useCallback(
    (error, context) => {
      errorService.reportError(error, context || componentName);
    },
    [componentName]
  );

  const reportServiceError = React.useCallback(
    (service, operation, error, params) => {
      errorService.reportServiceError(service, operation, error, params);
    },
    []
  );

  const reportIPCError = React.useCallback(
    (channel, error, args) => {
      errorService.reportIPCError(channel, error, args);
    },
    []
  );

  return {
    reportError,
    reportServiceError,
    reportIPCError,
  };
}

// Initialize global handlers when module loads
if (typeof window !== 'undefined') {
  errorService.initializeGlobalHandlers();
}