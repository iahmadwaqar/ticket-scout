import { describe, it, expect } from 'vitest'
import type { Profile, SystemMetrics, LogEntry, ProfileStatus, PriorityLevel } from '../index'

describe('Type Definitions', () => {
  describe('ProfileStatus', () => {
    it('should include all expected status values', () => {
      const validStatuses: ProfileStatus[] = ['Idle', 'Running', 'Error', 'Success', 'Next']
      
      // This test ensures the type includes all expected values
      validStatuses.forEach(status => {
        expect(['Idle', 'Running', 'Error', 'Success', 'Next']).toContain(status)
      })
    })
  })

  describe('PriorityLevel', () => {
    it('should include all expected priority values', () => {
      const validPriorities: PriorityLevel[] = ['High', 'Medium', 'Low']
      
      validPriorities.forEach(priority => {
        expect(['High', 'Medium', 'Low']).toContain(priority)
      })
    })
  })

  describe('Profile interface', () => {
    it('should accept valid profile objects', () => {
      const validProfile: Profile = {
        id: 'test-id',
        name: 'Test Profile',
        status: 'Idle',
        loginState: 'Logged Out',
        supporterId: 'supporter-123',
        password: 'optional-password',
        cardInfo: '1234-****-****-5678',
        expiry: '12/25',
        cvv: '123',
        seats: 2,
        url: 'https://example.com',
        proxy: '127.0.0.1:8080',
        priority: 'Medium'
      }
      
      // Type checking - if this compiles, the interface is correct
      expect(validProfile.id).toBe('test-id')
      expect(validProfile.name).toBe('Test Profile')
      expect(validProfile.status).toBe('Idle')
      expect(validProfile.loginState).toBe('Logged Out')
      expect(validProfile.supporterId).toBe('supporter-123')
      expect(validProfile.cardInfo).toBe('1234-****-****-5678')
      expect(validProfile.expiry).toBe('12/25')
      expect(validProfile.cvv).toBe('123')
      expect(validProfile.seats).toBe(2)
      expect(validProfile.url).toBe('https://example.com')
      expect(validProfile.proxy).toBe('127.0.0.1:8080')
      expect(validProfile.priority).toBe('Medium')
    })

    it('should handle profile without optional password', () => {
      const profileWithoutPassword: Profile = {
        id: 'test-id',
        name: 'Test Profile',
        status: 'Running',
        loginState: 'Logged In',
        supporterId: 'supporter-123',
        cardInfo: '1234-****-****-5678',
        expiry: '12/25',
        cvv: '123',
        seats: 4,
        url: 'https://example.com',
        proxy: '127.0.0.1:8080',
        priority: 'High'
      }
      
      expect(profileWithoutPassword.password).toBeUndefined()
      expect(profileWithoutPassword.status).toBe('Running')
      expect(profileWithoutPassword.loginState).toBe('Logged In')
      expect(profileWithoutPassword.priority).toBe('High')
    })

    it('should handle all valid status values', () => {
      const statuses: ProfileStatus[] = ['Idle', 'Running', 'Error', 'Success', 'Next']
      
      statuses.forEach(status => {
        const profile: Profile = {
          id: 'test-id',
          name: 'Test Profile',
          status,
          loginState: 'Logged Out',
          supporterId: 'supporter-123',
          cardInfo: '1234-****-****-5678',
          expiry: '12/25',
          cvv: '123',
          seats: 2,
          url: 'https://example.com',
          proxy: '127.0.0.1:8080',
          priority: 'Medium'
        }
        
        expect(profile.status).toBe(status)
      })
    })

    it('should handle all valid priority levels', () => {
      const priorities: PriorityLevel[] = ['High', 'Medium', 'Low']
      
      priorities.forEach(priority => {
        const profile: Profile = {
          id: 'test-id',
          name: 'Test Profile',
          status: 'Idle',
          loginState: 'Logged Out',
          supporterId: 'supporter-123',
          cardInfo: '1234-****-****-5678',
          expiry: '12/25',
          cvv: '123',
          seats: 2,
          url: 'https://example.com',
          proxy: '127.0.0.1:8080',
          priority
        }
        
        expect(profile.priority).toBe(priority)
      })
    })

    it('should handle both login states', () => {
      const loggedInProfile: Profile = {
        id: 'test-id',
        name: 'Test Profile',
        status: 'Idle',
        loginState: 'Logged In',
        supporterId: 'supporter-123',
        cardInfo: '1234-****-****-5678',
        expiry: '12/25',
        cvv: '123',
        seats: 2,
        url: 'https://example.com',
        proxy: '127.0.0.1:8080',
        priority: 'Medium'
      }
      
      const loggedOutProfile: Profile = {
        ...loggedInProfile,
        loginState: 'Logged Out'
      }
      
      expect(loggedInProfile.loginState).toBe('Logged In')
      expect(loggedOutProfile.loginState).toBe('Logged Out')
    })
  })

  describe('SystemMetrics interface', () => {
    it('should accept valid system metrics objects', () => {
      const validMetrics: SystemMetrics = {
        cpuUsage: 45.5,
        memoryUsage: 60.2,
        concurrencyLimit: 35,
        throttlingState: 'None'
      }
      
      expect(validMetrics.cpuUsage).toBe(45.5)
      expect(validMetrics.memoryUsage).toBe(60.2)
      expect(validMetrics.concurrencyLimit).toBe(35)
      expect(validMetrics.throttlingState).toBe('None')
    })

    it('should handle all throttling states', () => {
      const throttlingStates = ['None', 'Active', 'High'] as const
      
      throttlingStates.forEach(state => {
        const metrics: SystemMetrics = {
          cpuUsage: 50,
          memoryUsage: 60,
          concurrencyLimit: 35,
          throttlingState: state
        }
        
        expect(metrics.throttlingState).toBe(state)
      })
    })

    it('should handle edge case values', () => {
      const edgeCaseMetrics: SystemMetrics = {
        cpuUsage: 0,
        memoryUsage: 100,
        concurrencyLimit: 1,
        throttlingState: 'High'
      }
      
      expect(edgeCaseMetrics.cpuUsage).toBe(0)
      expect(edgeCaseMetrics.memoryUsage).toBe(100)
      expect(edgeCaseMetrics.concurrencyLimit).toBe(1)
      expect(edgeCaseMetrics.throttlingState).toBe('High')
    })
  })

  describe('LogEntry interface', () => {
    it('should accept valid log entry objects', () => {
      const validLogEntry: LogEntry = {
        id: 1,
        timestamp: '2024-01-01T12:00:00Z',
        profileId: 'profile-123',
        severity: 'Info',
        message: 'Test log message'
      }
      
      expect(validLogEntry.id).toBe(1)
      expect(validLogEntry.timestamp).toBe('2024-01-01T12:00:00Z')
      expect(validLogEntry.profileId).toBe('profile-123')
      expect(validLogEntry.severity).toBe('Info')
      expect(validLogEntry.message).toBe('Test log message')
    })

    it('should handle global log entries', () => {
      const globalLogEntry: LogEntry = {
        id: 2,
        timestamp: '2024-01-01T12:00:00Z',
        profileId: 'Global',
        severity: 'Warning',
        message: 'Global system warning'
      }
      
      expect(globalLogEntry.profileId).toBe('Global')
      expect(globalLogEntry.severity).toBe('Warning')
    })

    it('should handle all severity levels', () => {
      const severities = ['Info', 'Warning', 'Error'] as const
      
      severities.forEach(severity => {
        const logEntry: LogEntry = {
          id: 1,
          timestamp: '2024-01-01T12:00:00Z',
          profileId: 'test-profile',
          severity,
          message: `Test ${severity} message`
        }
        
        expect(logEntry.severity).toBe(severity)
      })
    })

    it('should handle different ID types', () => {
      const logEntries: LogEntry[] = [
        {
          id: 0,
          timestamp: '2024-01-01T12:00:00Z',
          profileId: 'profile-1',
          severity: 'Info',
          message: 'First message'
        },
        {
          id: 999999,
          timestamp: '2024-01-01T12:00:00Z',
          profileId: 'profile-2',
          severity: 'Error',
          message: 'Large ID message'
        }
      ]
      
      expect(logEntries[0].id).toBe(0)
      expect(logEntries[1].id).toBe(999999)
    })
  })

  describe('Type compatibility', () => {
    it('should allow profile status to be used in conditional logic', () => {
      const profile: Profile = {
        id: 'test-id',
        name: 'Test Profile',
        status: 'Running',
        loginState: 'Logged In',
        supporterId: 'supporter-123',
        cardInfo: '1234-****-****-5678',
        expiry: '12/25',
        cvv: '123',
        seats: 2,
        url: 'https://example.com',
        proxy: '127.0.0.1:8080',
        priority: 'High'
      }
      
      const isRunning = profile.status === 'Running'
      const isIdle = profile.status === 'Idle'
      const hasError = profile.status === 'Error'
      
      expect(isRunning).toBe(true)
      expect(isIdle).toBe(false)
      expect(hasError).toBe(false)
    })

    it('should allow priority levels to be compared', () => {
      const highPriority: PriorityLevel = 'High'
      const mediumPriority: PriorityLevel = 'Medium'
      const lowPriority: PriorityLevel = 'Low'
      
      // Priority comparison logic (would be implemented elsewhere)
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
      
      expect(priorityOrder[highPriority]).toBeGreaterThan(priorityOrder[mediumPriority])
      expect(priorityOrder[mediumPriority]).toBeGreaterThan(priorityOrder[lowPriority])
    })

    it('should allow system metrics to be used in calculations', () => {
      const metrics: SystemMetrics = {
        cpuUsage: 75.5,
        memoryUsage: 80.2,
        concurrencyLimit: 35,
        throttlingState: 'Active'
      }
      
      const isHighUsage = metrics.cpuUsage > 70 && metrics.memoryUsage > 75
      const needsThrottling = metrics.throttlingState !== 'None'
      const availableConcurrency = metrics.concurrencyLimit - 10 // Assuming 10 are in use
      
      expect(isHighUsage).toBe(true)
      expect(needsThrottling).toBe(true)
      expect(availableConcurrency).toBe(25)
    })
  })
})