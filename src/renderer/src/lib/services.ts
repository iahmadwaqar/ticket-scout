// Service layer that communicates with the main process via IPC
// These functions provide a secure interface between renderer and main process
// with comprehensive error handling, timeout mechanisms, and fallback strategies

import type { Profile, SystemMetrics, PriorityLevel } from '@/types';

// Configuration for IPC calls
const IPC_CONFIG = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  LONG_OPERATION_TIMEOUT: 30000, // 30 seconds for operations like fetchTickets
} as const;

// Error types for better error handling
enum IPCErrorType {
  TIMEOUT = 'TIMEOUT',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

class IPCError extends Error {
  constructor(
    public type: IPCErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

/**
 * Enhanced IPC call wrapper with comprehensive error handling, timeout, and retry logic
 */
async function safeIpcCall<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    validateInput?: () => boolean;
    fallbackStrategy?: 'return-fallback' | 'throw-error' | 'retry-with-mock';
  } = {}
): Promise<T> {
  const {
    timeout = IPC_CONFIG.DEFAULT_TIMEOUT,
    retries = IPC_CONFIG.RETRY_ATTEMPTS,
    retryDelay = IPC_CONFIG.RETRY_DELAY,
    validateInput,
    fallbackStrategy = 'return-fallback'
  } = options;

  // Input validation if provided
  if (validateInput && !validateInput()) {
    const error = new IPCError(IPCErrorType.VALIDATION_ERROR, `Invalid input for ${operationName}`);
    console.error(`[SERVICE] ${error.message}`);
    
    if (fallbackStrategy === 'throw-error') {
      throw error;
    }
    return fallback;
  }

  // Check if the API is available
  if (!window.api) {
    const error = new IPCError(IPCErrorType.API_UNAVAILABLE, `API not available for ${operationName}`);
    console.error(`[SERVICE] ${error.message}`);
    
    if (fallbackStrategy === 'throw-error') {
      throw error;
    }
    return fallback;
  }

  let lastError: unknown;
  
  // Retry logic
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[SERVICE] Attempting ${operationName} (attempt ${attempt}/${retries})`);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new IPCError(IPCErrorType.TIMEOUT, `IPC call timeout after ${timeout}ms`));
        }, timeout);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      console.log(`[SERVICE] ${operationName} completed successfully on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      lastError = error;
      const errorType = error instanceof IPCError ? error.type : IPCErrorType.UNKNOWN_ERROR;
      
      console.warn(`[SERVICE] ${operationName} failed on attempt ${attempt}/${retries}:`, error);
      
      // Don't retry on validation errors or if it's the last attempt
      if (errorType === IPCErrorType.VALIDATION_ERROR || attempt === retries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`[SERVICE] Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  const finalError = new IPCError(
    IPCErrorType.NETWORK_ERROR,
    `${operationName} failed after ${retries} attempts`,
    lastError
  );
  
  console.error(`[SERVICE] ${finalError.message}`, lastError);
  
  // Handle fallback strategy
  switch (fallbackStrategy) {
    case 'throw-error':
      throw finalError;
    case 'retry-with-mock':
      console.warn(`[SERVICE] Using mock data for ${operationName}`);
      return getMockData(operationName, fallback);
    case 'return-fallback':
    default:
      return fallback;
  }
}

/**
 * Provides mock data when IPC communication fails completely
 */
function getMockData<T>(operationName: string, fallback: T): T {
  console.log(`[SERVICE] Generating mock data for ${operationName}`);
  
  // Return enhanced mock data based on operation type
  switch (operationName) {
    case 'getSystemMetrics':
      return {
        cpuUsage: Math.floor(Math.random() * 50) + 10, // 10-60%
        memoryUsage: Math.floor(Math.random() * 40) + 20, // 20-60%
        concurrencyLimit: 35,
        throttlingState: 'None'
      } as T;
    case 'fetchTickets':
      return { ticketsFound: Math.floor(Math.random() * 3) } as T;
    default:
      return fallback;
  }
}

/**
 * Launches a scraping process for a given profile.
 * @param profileId - The ID of the profile to launch.
 */
export async function launchProfile(profileId: string): Promise<{ success: boolean }> {
  return safeIpcCall(
    () => window.api.launchProfile(profileId),
    { success: false },
    'launchProfile',
    {
      timeout: IPC_CONFIG.LONG_OPERATION_TIMEOUT,
      validateInput: () => Boolean(profileId && typeof profileId === 'string' && profileId.trim().length > 0),
      fallbackStrategy: 'return-fallback'
    }
  );
}

/**
 * Cancels a running scraping process for a given profile.
 * @param profileId - The ID of the profile to cancel.
 */
export async function cancelLaunch(profileId: string): Promise<{ success: boolean }> {
  return safeIpcCall(
    () => window.api.cancelLaunch(profileId),
    { success: false },
    'cancelLaunch',
    {
      timeout: IPC_CONFIG.DEFAULT_TIMEOUT,
      validateInput: () => Boolean(profileId && typeof profileId === 'string' && profileId.trim().length > 0),
      fallbackStrategy: 'return-fallback'
    }
  );
}

/**
 * Sets the priority level for a given profile.
 * @param profileId - The ID of the profile to update.
 * @param priority - The new priority level.
 */
export async function setPriority(profileId: string, priority: PriorityLevel): Promise<{ success: boolean }> {
  return safeIpcCall(
    () => window.api.setPriority(profileId, priority),
    { success: false },
    'setPriority',
    {
      timeout: IPC_CONFIG.DEFAULT_TIMEOUT,
      validateInput: () => {
        const validProfileId = Boolean(profileId && typeof profileId === 'string' && profileId.trim().length > 0);
        const validPriority = ['High', 'Medium', 'Low'].includes(priority);
        return validProfileId && validPriority;
      },
      fallbackStrategy: 'return-fallback'
    }
  );
}

/**
 * Fetches available tickets based on search criteria.
 */
export async function fetchTickets(): Promise<{ ticketsFound: number }> {
  return safeIpcCall(
    () => window.api.fetchTickets(),
    { ticketsFound: 0 },
    'fetchTickets',
    {
      timeout: IPC_CONFIG.LONG_OPERATION_TIMEOUT,
      retries: 2, // Fewer retries for long operations
      fallbackStrategy: 'retry-with-mock'
    }
  );
}

/**
 * Retrieves the current system metrics from the backend.
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const fallbackMetrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    concurrencyLimit: 0,
    throttlingState: 'None',
  };
  
  return safeIpcCall(
    () => window.api.getSystemMetrics(),
    fallbackMetrics,
    'getSystemMetrics',
    {
      timeout: IPC_CONFIG.DEFAULT_TIMEOUT,
      fallbackStrategy: 'retry-with-mock'
    }
  );
}

/**
 * Saves profile data to persistent storage.
 * @param profiles - Array of profiles to save.
 */
export async function saveProfileData(profiles: Profile[]): Promise<void> {
  return safeIpcCall(
    () => window.api.saveProfileData(profiles),
    undefined,
    'saveProfileData',
    {
      timeout: IPC_CONFIG.LONG_OPERATION_TIMEOUT,
      validateInput: () => Array.isArray(profiles),
      fallbackStrategy: 'throw-error' // Data persistence failures should be explicit
    }
  );
}

/**
 * Loads profile data from persistent storage.
 */
export async function loadProfileData(): Promise<Profile[]> {
  return safeIpcCall(
    () => window.api.loadProfileData(),
    [],
    'loadProfileData',
    {
      timeout: IPC_CONFIG.LONG_OPERATION_TIMEOUT,
      fallbackStrategy: 'return-fallback' // Return empty array if loading fails
    }
  );
}

// Additional utility functions for service health and diagnostics

/**
 * Checks if the IPC communication is working properly
 */
export async function checkServiceHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    if (!window.api) {
      return { healthy: false, error: 'API not available' };
    }
    
    // Use a lightweight operation to test connectivity
    await window.api.getSystemMetrics();
    const latency = Date.now() - startTime;
    
    return { healthy: true, latency };
  } catch (error) {
    return { 
      healthy: false, 
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch operation wrapper for multiple service calls
 */
export async function batchServiceCall<T>(
  operations: Array<() => Promise<T>>,
  options: { 
    concurrency?: number; 
    failFast?: boolean;
    timeout?: number;
  } = {}
): Promise<Array<{ success: boolean; data?: T; error?: string }>> {
  const { concurrency = 3, failFast = false, timeout = IPC_CONFIG.DEFAULT_TIMEOUT } = options;
  const results: Array<{ success: boolean; data?: T; error?: string }> = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (operation) => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Batch operation timeout')), timeout);
        });
        
        const data = await Promise.race([operation(), timeoutPromise]);
        return { success: true, data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (failFast) {
          throw new Error(`Batch operation failed: ${errorMessage}`);
        }
        return { success: false, error: errorMessage };
      }
    });
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      if (failFast) {
        throw error;
      }
    }
  }
  
  return results;
}

/**
 * Service call with circuit breaker pattern
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async call<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        console.warn('[SERVICE] Circuit breaker is OPEN, returning fallback');
        return fallback;
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.warn(`[SERVICE] Circuit breaker opened after ${this.failures} failures`);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Export circuit breaker instance for critical operations
export const serviceCircuitBreaker = new CircuitBreaker();