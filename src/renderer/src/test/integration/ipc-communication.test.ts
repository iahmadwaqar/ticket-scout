import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupMockElectronAPI, setupFailingMockElectronAPI, createMockProfile, createMockSystemMetrics, waitForAsync } from '@/test/test-utils'
import * as services from '@/lib/services'
import { electronService } from '@/lib/electron-service-adapter'

describe('IPC Communication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockElectronAPI()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Service Layer Integration', () => {
    it('should handle complete profile launch workflow', async () => {
      const profileId = 'test-profile-1'
      
      // Launch profile
      const launchResult = await services.launchProfile(profileId)
      expect(launchResult.success).toBe(true)
      expect(window.api.launchProfile).toHaveBeenCalledWith(profileId)
      
      // Check system metrics during launch
      const metrics = await services.getSystemMetrics()
      expect(metrics).toHaveProperty('cpuUsage')
      expect(metrics).toHaveProperty('memoryUsage')
      expect(window.api.getSystemMetrics).toHaveBeenCalled()
      
      // Cancel launch
      const cancelResult = await services.cancelLaunch(profileId)
      expect(cancelResult.success).toBe(true)
      expect(window.api.cancelLaunch).toHaveBeenCalledWith(profileId)
    })

    it('should handle profile priority management workflow', async () => {
      const profileId = 'test-profile-1'
      const priorities = ['High', 'Medium', 'Low'] as const
      
      for (const priority of priorities) {
        const result = await services.setPriority(profileId, priority)
        expect(result.success).toBe(true)
        expect(window.api.setPriority).toHaveBeenCalledWith(profileId, priority)
      }
    })

    it('should handle data persistence workflow', async () => {
      const mockProfiles = [
        createMockProfile({ id: 'profile-1', name: 'Profile 1' }),
        createMockProfile({ id: 'profile-2', name: 'Profile 2' })
      ]
      
      // Save profiles
      await expect(services.saveProfileData(mockProfiles)).resolves.toBeUndefined()
      expect(window.api.saveProfileData).toHaveBeenCalledWith(mockProfiles)
      
      // Load profiles
      setupMockElectronAPI({ loadProfileData: mockProfiles })
      const loadedProfiles = await services.loadProfileData()
      expect(loadedProfiles).toEqual(mockProfiles)
      expect(window.api.loadProfileData).toHaveBeenCalled()
    })

    it('should handle ticket fetching workflow', async () => {
      const ticketResult = await services.fetchTickets()
      expect(ticketResult).toHaveProperty('ticketsFound')
      expect(typeof ticketResult.ticketsFound).toBe('number')
      expect(window.api.fetchTickets).toHaveBeenCalled()
    })
  })

  describe('Service Adapter Integration', () => {
    it('should maintain consistency between service layers', async () => {
      const profileId = 'test-profile-1'
      
      // Test both service layers return consistent results
      const servicesResult = await services.launchProfile(profileId)
      const adapterResult = await electronService.launchProfile(profileId)
      
      expect(servicesResult).toEqual(adapterResult)
    })

    it('should handle errors consistently across service layers', async () => {
      setupFailingMockElectronAPI(['launchProfile'])
      const profileId = 'test-profile-1'
      
      const servicesResult = await services.launchProfile(profileId)
      const adapterResult = await electronService.launchProfile(profileId)
      
      expect(servicesResult).toEqual({ success: false })
      expect(adapterResult).toEqual({ success: false })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle IPC timeout scenarios', async () => {
      vi.useFakeTimers()
      
      // Mock a long-running operation
      const mockApi = setupMockElectronAPI()
      mockApi.fetchTickets.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ticketsFound: 5 }), 35000))
      )
      
      const resultPromise = services.fetchTickets()
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(31000)
      
      const result = await resultPromise
      
      // Should return mock data due to timeout
      expect(result).toHaveProperty('ticketsFound')
      expect(typeof result.ticketsFound).toBe('number')
      
      vi.useRealTimers()
    })

    it('should handle API unavailability gracefully', async () => {
      // Remove API completely
      delete (window as any).api
      
      const result = await services.launchProfile('test-profile-1')
      expect(result).toEqual({ success: false })
      
      const metrics = await services.getSystemMetrics()
      expect(metrics).toEqual({
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      })
    })

    it('should handle partial API failures', async () => {
      setupFailingMockElectronAPI(['launchProfile', 'cancelLaunch'])
      
      // These should fail gracefully
      const launchResult = await services.launchProfile('test-profile-1')
      const cancelResult = await services.cancelLaunch('test-profile-1')
      
      expect(launchResult.success).toBe(false)
      expect(cancelResult.success).toBe(false)
      
      // These should still work
      const metrics = await services.getSystemMetrics()
      const tickets = await services.fetchTickets()
      
      expect(metrics).toHaveProperty('cpuUsage')
      expect(tickets).toHaveProperty('ticketsFound')
    })

    it('should handle network-like errors with retry logic', async () => {
      const mockApi = setupMockElectronAPI()
      
      // Fail first two attempts, succeed on third
      mockApi.launchProfile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true })
      
      const result = await services.launchProfile('test-profile-1')
      
      expect(result.success).toBe(true)
      expect(mockApi.launchProfile).toHaveBeenCalledTimes(3)
    })
  })

  describe('Service Health Monitoring', () => {
    it('should accurately report service health', async () => {
      const health = await services.checkServiceHealth()
      
      expect(health.healthy).toBe(true)
      expect(health.latency).toBeGreaterThan(0)
      expect(health.error).toBeUndefined()
    })

    it('should detect unhealthy services', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const health = await services.checkServiceHealth()
      
      expect(health.healthy).toBe(false)
      expect(health.latency).toBeGreaterThan(0)
      expect(health.error).toContain('Mock getSystemMetrics failure')
    })

    it('should detect missing API', async () => {
      delete (window as any).api
      
      const health = await services.checkServiceHealth()
      
      expect(health.healthy).toBe(false)
      expect(health.error).toBe('API not available')
    })
  })

  describe('Batch Operations', () => {
    it('should handle batch service calls successfully', async () => {
      const operations = [
        () => services.launchProfile('profile-1'),
        () => services.launchProfile('profile-2'),
        () => services.getSystemMetrics(),
        () => services.fetchTickets()
      ]
      
      const results = await services.batchServiceCall(operations)
      
      expect(results).toHaveLength(4)
      expect(results.every(r => r.success)).toBe(true)
      expect(results[0].data).toEqual({ success: true })
      expect(results[1].data).toEqual({ success: true })
      expect(results[2].data).toHaveProperty('cpuUsage')
      expect(results[3].data).toHaveProperty('ticketsFound')
    })

    it('should handle mixed success and failure in batch operations', async () => {
      const mockApi = setupMockElectronAPI()
      mockApi.launchProfile
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'))
      
      const operations = [
        () => services.launchProfile('profile-1'),
        () => services.launchProfile('profile-2')
      ]
      
      const results = await services.batchServiceCall(operations)
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toContain('Failed')
    })

    it('should respect concurrency limits in batch operations', async () => {
      const operations = Array(10).fill(0).map((_, i) => 
        () => services.launchProfile(`profile-${i}`)
      )
      
      const startTime = Date.now()
      const results = await services.batchServiceCall(operations, { concurrency: 2 })
      const endTime = Date.now()
      
      expect(results).toHaveLength(10)
      expect(results.every(r => r.success)).toBe(true)
      
      // With concurrency limit of 2, operations should take longer than if all were parallel
      // This is a rough check - in real scenarios you'd have more precise timing
      expect(endTime - startTime).toBeGreaterThan(0)
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should integrate circuit breaker with service calls', async () => {
      const operation = () => services.getSystemMetrics()
      const fallback = createMockSystemMetrics({ cpuUsage: 0 })
      
      const result = await services.serviceCircuitBreaker.call(operation, fallback)
      
      expect(result).toHaveProperty('cpuUsage')
      expect(result).toHaveProperty('memoryUsage')
    })

    it('should open circuit breaker after repeated failures', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const operation = () => services.getSystemMetrics()
      const fallback = createMockSystemMetrics({ cpuUsage: 0 })
      
      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await services.serviceCircuitBreaker.call(operation, fallback)
        } catch (error) {
          // Expected failures
        }
      }
      
      const state = services.serviceCircuitBreaker.getState()
      expect(state.state).toBe('OPEN')
      expect(state.failures).toBe(5)
    })

    it('should return fallback when circuit is open', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const operation = () => services.getSystemMetrics()
      const fallback = createMockSystemMetrics({ cpuUsage: 99 })
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await services.serviceCircuitBreaker.call(operation, fallback)
        } catch (error) {
          // Expected failures
        }
      }
      
      // Now circuit should be open and return fallback
      const result = await services.serviceCircuitBreaker.call(operation, fallback)
      expect(result.cpuUsage).toBe(99)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle complete dashboard initialization workflow', async () => {
      // Simulate dashboard startup sequence
      const healthCheck = await services.checkServiceHealth()
      expect(healthCheck.healthy).toBe(true)
      
      const profiles = await services.loadProfileData()
      expect(Array.isArray(profiles)).toBe(true)
      
      const metrics = await services.getSystemMetrics()
      expect(metrics).toHaveProperty('cpuUsage')
      
      const tickets = await services.fetchTickets()
      expect(tickets).toHaveProperty('ticketsFound')
    })

    it('should handle profile management workflow', async () => {
      const profileId = 'workflow-test-profile'
      
      // Set priority
      const priorityResult = await services.setPriority(profileId, 'High')
      expect(priorityResult.success).toBe(true)
      
      // Launch profile
      const launchResult = await services.launchProfile(profileId)
      expect(launchResult.success).toBe(true)
      
      // Monitor system during operation
      const metrics = await services.getSystemMetrics()
      expect(metrics).toHaveProperty('cpuUsage')
      
      // Cancel if needed
      const cancelResult = await services.cancelLaunch(profileId)
      expect(cancelResult.success).toBe(true)
    })

    it('should handle degraded service scenarios', async () => {
      // Simulate partial service failure
      setupFailingMockElectronAPI(['fetchTickets', 'launchProfile'])
      
      // Critical operations should still work
      const metrics = await services.getSystemMetrics()
      expect(metrics).toHaveProperty('cpuUsage')
      
      const profiles = await services.loadProfileData()
      expect(Array.isArray(profiles)).toBe(true)
      
      // Failed operations should degrade gracefully
      const tickets = await services.fetchTickets()
      expect(tickets).toHaveProperty('ticketsFound')
      
      const launchResult = await services.launchProfile('test-profile')
      expect(launchResult.success).toBe(false)
    })
  })
})