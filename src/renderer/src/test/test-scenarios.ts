/**
 * Common test scenarios and data for comprehensive testing
 * These scenarios represent real-world usage patterns
 */

import type { Profile, SystemMetrics, LogEntry, PriorityLevel } from '@/types'

// Test data generators
export const createTestProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Profile',
  status: 'Idle',
  loginState: 'Logged Out',
  supporterId: 'test-supporter-123',
  cardInfo: '1234-****-****-5678',
  expiry: '12/25',
  cvv: '123',
  seats: 2,
  url: 'https://example.com/tickets',
  proxy: '127.0.0.1:8080',
  priority: 'Medium',
  ...overrides
})

export const createTestSystemMetrics = (overrides: Partial<SystemMetrics> = {}): SystemMetrics => ({
  cpuUsage: 45 + Math.random() * 30, // 45-75%
  memoryUsage: 50 + Math.random() * 30, // 50-80%
  concurrencyLimit: 35,
  throttlingState: 'None',
  ...overrides
})

export const createTestLogEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  id: Math.floor(Math.random() * 10000),
  timestamp: new Date().toISOString(),
  profileId: 'test-profile-1',
  severity: 'Info',
  message: 'Test log message',
  ...overrides
})

// Test scenarios
export const testScenarios = {
  // Profile management scenarios
  profileManagement: {
    singleProfile: () => [createTestProfile()],
    multipleProfiles: () => [
      createTestProfile({ id: 'profile-1', name: 'Profile 1', priority: 'High' }),
      createTestProfile({ id: 'profile-2', name: 'Profile 2', priority: 'Medium' }),
      createTestProfile({ id: 'profile-3', name: 'Profile 3', priority: 'Low' })
    ],
    profilesWithDifferentStates: () => [
      createTestProfile({ id: 'idle-profile', status: 'Idle' }),
      createTestProfile({ id: 'running-profile', status: 'Running' }),
      createTestProfile({ id: 'error-profile', status: 'Error' }),
      createTestProfile({ id: 'success-profile', status: 'Success' })
    ],
    profilesWithDifferentLoginStates: () => [
      createTestProfile({ id: 'logged-in', loginState: 'Logged In' }),
      createTestProfile({ id: 'logged-out', loginState: 'Logged Out' })
    ]
  },

  // System metrics scenarios
  systemMetrics: {
    normalLoad: () => createTestSystemMetrics({
      cpuUsage: 45,
      memoryUsage: 60,
      throttlingState: 'None'
    }),
    highLoad: () => createTestSystemMetrics({
      cpuUsage: 85,
      memoryUsage: 90,
      throttlingState: 'Active'
    }),
    criticalLoad: () => createTestSystemMetrics({
      cpuUsage: 95,
      memoryUsage: 95,
      throttlingState: 'High'
    }),
    lowLoad: () => createTestSystemMetrics({
      cpuUsage: 15,
      memoryUsage: 25,
      throttlingState: 'None'
    })
  },

  // Error scenarios
  errors: {
    networkError: new Error('Network connection failed'),
    timeoutError: new Error('Operation timed out'),
    validationError: new Error('Invalid input data'),
    serviceUnavailable: new Error('Service temporarily unavailable'),
    authenticationError: new Error('Authentication failed'),
    permissionError: new Error('Insufficient permissions')
  },

  // IPC communication scenarios
  ipcScenarios: {
    successfulOperation: {
      launchProfile: { success: true },
      cancelLaunch: { success: true },
      setPriority: { success: true },
      fetchTickets: { ticketsFound: 3 }
    },
    failedOperation: {
      launchProfile: { success: false },
      cancelLaunch: { success: false },
      setPriority: { success: false },
      fetchTickets: { ticketsFound: 0 }
    },
    partialFailure: {
      // Some operations succeed, others fail
      mixed: true
    }
  },

  // Workflow scenarios
  workflows: {
    dashboardInitialization: async (api: any) => {
      // Simulate dashboard startup sequence
      const steps = [
        () => api.getSystemMetrics(),
        () => api.loadProfileData(),
        () => api.fetchTickets()
      ]
      return steps
    },
    
    profileLaunchWorkflow: async (api: any, profileId: string) => {
      // Simulate complete profile launch workflow
      const steps = [
        () => api.setPriority(profileId, 'High'),
        () => api.launchProfile(profileId),
        () => api.getSystemMetrics(), // Monitor during launch
        () => api.fetchTickets() // Check for tickets
      ]
      return steps
    },
    
    errorRecoveryWorkflow: async (api: any, profileId: string) => {
      // Simulate error recovery scenario
      const steps = [
        () => api.launchProfile(profileId), // This might fail
        () => api.cancelLaunch(profileId), // Cancel if needed
        () => api.setPriority(profileId, 'Low'), // Lower priority
        () => api.launchProfile(profileId) // Retry
      ]
      return steps
    },
    
    dataManagementWorkflow: async (api: any) => {
      // Simulate data persistence workflow
      const profiles = testScenarios.profileManagement.multipleProfiles()
      const steps = [
        () => api.loadProfileData(),
        () => api.saveProfileData(profiles),
        () => api.loadProfileData() // Verify save
      ]
      return steps
    }
  },

  // Performance scenarios
  performance: {
    highConcurrency: {
      operationCount: 50,
      concurrencyLimit: 10,
      expectedMaxDuration: 5000 // ms
    },
    lowLatency: {
      operationCount: 10,
      expectedMaxLatency: 100 // ms per operation
    },
    bulkOperations: {
      profileCount: 100,
      batchSize: 10
    }
  },

  // Edge cases
  edgeCases: {
    emptyData: {
      profiles: [],
      metrics: createTestSystemMetrics({ cpuUsage: 0, memoryUsage: 0 }),
      tickets: { ticketsFound: 0 }
    },
    invalidData: {
      invalidProfileId: '',
      invalidPriority: 'Invalid' as PriorityLevel,
      malformedProfile: { id: 'test' } as Profile // Missing required fields
    },
    extremeValues: {
      maxProfiles: Array(1000).fill(0).map((_, i) => 
        createTestProfile({ id: `profile-${i}`, name: `Profile ${i}` })
      ),
      maxMetrics: createTestSystemMetrics({ 
        cpuUsage: 100, 
        memoryUsage: 100, 
        concurrencyLimit: 1000 
      })
    }
  }
}

// Test utilities for scenarios
export const runScenario = async (scenario: any[], api: any) => {
  const results = []
  for (const step of scenario) {
    try {
      const result = await step()
      results.push({ success: true, data: result })
    } catch (error) {
      results.push({ success: false, error })
    }
  }
  return results
}

export const measurePerformance = async (operation: () => Promise<any>) => {
  const startTime = performance.now()
  const result = await operation()
  const endTime = performance.now()
  return {
    result,
    duration: endTime - startTime,
    timestamp: new Date().toISOString()
  }
}

export const simulateUserInteraction = (delay: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Validation helpers
export const validateProfile = (profile: any): profile is Profile => {
  return (
    typeof profile === 'object' &&
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    ['Idle', 'Running', 'Error', 'Success', 'Next'].includes(profile.status) &&
    ['Logged In', 'Logged Out'].includes(profile.loginState) &&
    ['High', 'Medium', 'Low'].includes(profile.priority)
  )
}

export const validateSystemMetrics = (metrics: any): metrics is SystemMetrics => {
  return (
    typeof metrics === 'object' &&
    typeof metrics.cpuUsage === 'number' &&
    typeof metrics.memoryUsage === 'number' &&
    typeof metrics.concurrencyLimit === 'number' &&
    ['None', 'Active', 'High'].includes(metrics.throttlingState)
  )
}

export const validateLogEntry = (entry: any): entry is LogEntry => {
  return (
    typeof entry === 'object' &&
    typeof entry.id === 'number' &&
    typeof entry.timestamp === 'string' &&
    typeof entry.profileId === 'string' &&
    ['Info', 'Warning', 'Error'].includes(entry.severity) &&
    typeof entry.message === 'string'
  )
}