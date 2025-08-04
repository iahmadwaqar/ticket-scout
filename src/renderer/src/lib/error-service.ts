import React from 'react';

/**
 * Centralized error handling and logging service for the Electron renderer process
 * Provides error reporting, logging, and user feedback mechanisms
 */

export interface ErrorReport {
  type: 'renderer-error' | 'dashboard-error' | 'dashboard-component-error' | 'ipc-error' | 'service-error';
  component?: string;
  message: string;
  stack: string;
  componentStack?: string;
  timestamp: string;
  retryCount?: number;
  context?: string | Record<string, any>;
  url?: string;
  userAgent?: string;
}

export interface ErrorServiceConfig {
  enableConsoleLogging: boolean;
  enableMainProcessReporting: boolean;
  enableUserNotifications: boolean;
  maxRetries: number;
}

class ErrorService {
  private config: ErrorServiceConfig = {
    enableConsoleLogging: true,
    enableMainProcessReporting: true,
    enableUserNotifications: true,
    maxRetries: 3,
  };

  private errorQueue: ErrorReport[] = [];
  private isReporting = false;

  /**
   * Configure the error service
   */
  configure(config: Partial<ErrorServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Report an error with full context
   */
  async reportError(error: Error | ErrorReport, context?: string | Record<string, any>): Promise<void> {
    let errorReport: ErrorReport;

    if (error instanceof Error) {
      errorReport = {
        type: 'renderer-error',
        message: error.message,
        stack: error.stack || '',
        timestamp: new Date().toISOString(),
        context,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
    } else {
      errorReport = error;
    }

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.error('[ErrorService]', errorReport);
    }

    // Add to queue for batch processing
    this.errorQueue.push(errorReport);

    // Process queue
    await this.processErrorQueue();
  }

  /**
   * Report IPC communication errors
   */
  async reportIPCError(channel: string, error: Error, args?: any[]): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'ipc-error',
      message: `IPC call failed for channel: ${channel}`,
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      context: {
        channel,
        args: args ? JSON.stringify(args) : undefined,
        originalError: error.message,
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * Report service layer errors
   */
  async reportServiceError(service: string, operation: string, error: Error, params?: any): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'service-error',
      component: service,
      message: `Service operation failed: ${service}.${operation}`,
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      context: {
        service,
        operation,
        params: params ? JSON.stringify(params) : undefined,
        originalError: error.message,
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * Process the error queue and send to main process
   */
  private async processErrorQueue(): Promise<void> {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      if (this.config.enableMainProcessReporting && (window as any).api?.reportError) {
        // Send errors to main process in batches
        for (const error of errors) {
          try {
            await (window as any).api.reportError(error);
          } catch (reportingError) {
            console.error('Failed to report error to main process:', reportingError);
            // Re-queue the error for retry
            this.errorQueue.push(error);
          }
        }
      }
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.reportError(error, 'unhandled-promise-rejection');
  };

  /**
   * Handle global errors
   */
  private handleGlobalError = (event: ErrorEvent) => {
    console.error('Global error:', event.error);
    
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    this.reportError(error, 'global-error');
  };

  /**
   * Initialize global error handlers
   */
  initializeGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Handle global errors
    window.addEventListener('error', this.handleGlobalError);

    console.log('[ErrorService] Global error handlers initialized');
  }

  /**
   * Clean up global error handlers
   */
  cleanup(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { queueLength: number; isReporting: boolean } {
    return {
      queueLength: this.errorQueue.length,
      isReporting: this.isReporting,
    };
  }

  /**
   * Clear error queue
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const errorService = new ErrorService();

/**
 * Utility function to wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
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
export function withSyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: string
): (...args: T) => R {
  return (...args: T): R => {
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
export function useErrorReporting(componentName?: string) {
  const reportError = React.useCallback(
    (error: Error, context?: string) => {
      errorService.reportError(error, context || componentName);
    },
    [componentName]
  );

  const reportServiceError = React.useCallback(
    (service: string, operation: string, error: Error, params?: any) => {
      errorService.reportServiceError(service, operation, error, params);
    },
    []
  );

  const reportIPCError = React.useCallback(
    (channel: string, error: Error, args?: any[]) => {
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