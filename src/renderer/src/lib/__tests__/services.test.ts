import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  launchProfile,
  cancelLaunch,
  setPriority,
  fetchTickets,
  getSystemMetrics,
  saveProfileData,
  loadProfileData,
  checkServiceHealth,
  batchServiceCall,
  serviceCircuitBreaker
} from '../services'
import { setupMockElectronAPI, setupFailingMockElectronAPI, createMockProfile, createMockSystemMetrics } from '@/test/test-utils'

describe('Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockElectronAPI()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('launchProfile', () => {
    it('should successfully launch a profile', async () => {
      const result = await launchProfile('test-profile-1')
      
      expect(result).toEqual({ success: true })
      expect(window.api.launchProfile).toHaveBeenCalledWith('test-profile-1')
    })

    it('should return failure when profile ID is invalid', async () => {
      const result = await launchProfile('')
      
      expect(result).toEqual({ success: false })
      expect(window.api.launchProfile).not.toHaveBeenCalled()
    })

    it('should handle IPC communication failure', async () => {
      setupFailingMockElectronAPI(['launchProfile'])
      
      const result = await launchProfile('test-profile-1')
      
      expect(result).toEqual({ success: false })
    })

    it('should retry on failure', async () => {
      const mockApi = setupMockElectronAPI()
      mockApi.launchProfile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true })
      
      const result = await launchProfile('test-profile-1')
      
      expect(result).toEqual({ success: true })
      expect(mockApi.launchProfile).toHaveBeenCalledTimes(2)
    })
  })

  describe('cancelLaunch', () => {
    it('should successfully cancel a profile launch', async () => {
      const result = await cancelLaunch('test-profile-1')
      
      expect(result).toEqual({ success: true })
      expect(window.api.cancelLaunch).toHaveBeenCalledWith('test-profile-1')
    })

    it('should validate profile ID', async () => {
      const result = await cancelLaunch('   ')
      
      expect(result).toEqual({ success: false })
      expect(window.api.cancelLaunch).not.toHaveBeenCalled()
    })
  })

  describe('setPriority', () => {
    it('should successfully set profile priority', async () => {
      const result = await setPriority('test-profile-1', 'High')
      
      expect(result).toEqual({ success: true })
      expect(window.api.setPriority).toHaveBeenCalledWith('test-profile-1', 'High')
    })

    it('should validate priority level', async () => {
      const result = await setPriority('test-profile-1', 'Invalid' as any)
      
      expect(result).toEqual({ success: false })
      expect(window.api.setPriority).not.toHaveBeenCalled()
    })

    it('should validate profile ID and priority together', async () => {
      const result = await setPriority('', 'High')
      
      expect(result).toEqual({ success: false })
      expect(window.api.setPriority).not.toHaveBeenCalled()
    })
  })

  describe('fetchTickets', () => {
    it('should successfully fetch tickets', async () => {
      const result = await fetchTickets()
      
      expect(result).toEqual({ ticketsFound: 3 })
      expect(window.api.fetchTickets).toHaveBeenCalled()
    })

    it('should use mock data on failure', async () => {
      setupFailingMockElectronAPI(['fetchTickets'])
      
      const result = await fetchTickets()
      
      expect(result).toHaveProperty('ticketsFound')
      expect(typeof result.ticketsFound).toBe('number')
    })

    it('should handle timeout for long operations', async () => {
      vi.useFakeTimers()
      
      const mockApi = setupMockElectronAPI()
      mockApi.fetchTickets.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ticketsFound: 5 }), 35000))
      )
      
      const resultPromise = fetchTickets()
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(31000)
      
      const result = await resultPromise
      
      expect(result).toHaveProperty('ticketsFound')
      expect(typeof result.ticketsFound).toBe('number')
      
      vi.useRealTimers()
    })
  })

  describe('getSystemMetrics', () => {
    it('should successfully get system metrics', async () => {
      const mockMetrics = createMockSystemMetrics()
      setupMockElectronAPI({ getSystemMetrics: mockMetrics })
      
      const result = await getSystemMetrics()
      
      expect(result).toEqual(mockMetrics)
      expect(window.api.getSystemMetrics).toHaveBeenCalled()
    })

    it('should return fallback metrics on failure', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const result = await getSystemMetrics()
      
      expect(result).toEqual({
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      })
    })

    it('should use mock data when retry strategy is enabled', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const result = await getSystemMetrics()
      
      expect(result).toHaveProperty('cpuUsage')
      expect(result).toHaveProperty('memoryUsage')
      expect(result).toHaveProperty('concurrencyLimit')
      expect(result).toHaveProperty('throttlingState')
    })
  })

  describe('saveProfileData', () => {
    it('should successfully save profile data', async () => {
      const profiles = [createMockProfile()]
      
      await expect(saveProfileData(profiles)).resolves.toBeUndefined()
      expect(window.api.saveProfileData).toHaveBeenCalledWith(profiles)
    })

    it('should validate input data', async () => {
      await expect(saveProfileData(null as any)).rejects.toThrow()
      expect(window.api.saveProfileData).not.toHaveBeenCalled()
    })

    it('should throw on save failure', async () => {
      setupFailingMockElectronAPI(['saveProfileData'])
      const profiles = [createMockProfile()]
      
      await expect(saveProfileData(profiles)).rejects.toThrow()
    })
  })

  describe('loadProfileData', () => {
    it('should successfully load profile data', async () => {
      const mockProfiles = [createMockProfile()]
      setupMockElectronAPI({ loadProfileData: mockProfiles })
      
      const result = await loadProfileData()
      
      expect(result).toEqual(mockProfiles)
      expect(window.api.loadProfileData).toHaveBeenCalled()
    })

    it('should return empty array on failure', async () => {
      setupFailingMockElectronAPI(['loadProfileData'])
      
      const result = await loadProfileData()
      
      expect(result).toEqual([])
    })
  })

  describe('checkServiceHealth', () => {
    it('should return healthy status when API is available', async () => {
      const result = await checkServiceHealth()
      
      expect(result.healthy).toBe(true)
      expect(result.latency).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })

    it('should return unhealthy status when API is unavailable', async () => {
      delete (window as any).api
      
      const result = await checkServiceHealth()
      
      expect(result.healthy).toBe(false)
      expect(result.error).toBe('API not available')
    })

    it('should return unhealthy status on API failure', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const result = await checkServiceHealth()
      
      expect(result.healthy).toBe(false)
      expect(result.latency).toBeGreaterThan(0)
      expect(result.error).toContain('Mock getSystemMetrics failure')
    })
  })

  describe('batchServiceCall', () => {
    it('should execute multiple operations successfully', async () => {
      const operations = [
        () => window.api.launchProfile('profile-1'),
        () => window.api.launchProfile('profile-2'),
        () => window.api.getSystemMetrics()
      ]
      
      const results = await batchServiceCall(operations)
      
      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle mixed success and failure', async () => {
      const mockApi = setupMockElectronAPI()
      mockApi.launchProfile
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'))
      
      const operations = [
        () => window.api.launchProfile('profile-1'),
        () => window.api.launchProfile('profile-2')
      ]
      
      const results = await batchServiceCall(operations)
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toContain('Failed')
    })

    it('should respect concurrency limits', async () => {
      const operations = Array(10).fill(0).map((_, i) => 
        () => window.api.launchProfile(`profile-${i}`)
      )
      
      const results = await batchServiceCall(operations, { concurrency: 2 })
      
      expect(results).toHaveLength(10)
      expect(window.api.launchProfile).toHaveBeenCalledTimes(10)
    })

    it('should fail fast when enabled', async () => {
      const mockApi = setupMockElectronAPI()
      mockApi.launchProfile.mockRejectedValue(new Error('Batch failure'))
      
      const operations = [
        () => window.api.launchProfile('profile-1'),
        () => window.api.launchProfile('profile-2')
      ]
      
      await expect(
        batchServiceCall(operations, { failFast: true })
      ).rejects.toThrow('Batch operation failed')
    })
  })

  describe('Circuit Breaker', () => {
    it('should track circuit breaker state', () => {
      const state = serviceCircuitBreaker.getState()
      
      expect(state.state).toBe('CLOSED')
      expect(state.failures).toBe(0)
    })

    it('should open circuit after threshold failures', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service failure'))
      
      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await serviceCircuitBreaker.call(operation, 'fallback')
        } catch (error) {
          // Expected failures
        }
      }
      
      const state = serviceCircuitBreaker.getState()
      expect(state.state).toBe('OPEN')
      expect(state.failures).toBe(5)
    })
  })
})