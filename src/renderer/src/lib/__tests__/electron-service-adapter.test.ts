import { describe, it, expect, vi, beforeEach } from 'vitest'
import { electronService } from '../electron-service-adapter'
import { setupMockElectronAPI, setupFailingMockElectronAPI, createMockProfile, createMockSystemMetrics } from '@/test/test-utils'

// Mock the error service
vi.mock('../error-service', () => ({
  errorService: {
    reportServiceError: vi.fn()
  }
}))

describe('ElectronServiceAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockElectronAPI()
  })

  describe('launchProfile', () => {
    it('should successfully launch a profile', async () => {
      const result = await electronService.launchProfile('test-profile-1')
      
      expect(result).toEqual({ success: true })
      expect(window.api.launchProfile).toHaveBeenCalledWith('test-profile-1')
    })

    it('should handle launch failure gracefully', async () => {
      setupFailingMockElectronAPI(['launchProfile'])
      
      const result = await electronService.launchProfile('test-profile-1')
      
      expect(result).toEqual({ success: false })
    })

    it('should log launch attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.launchProfile('test-profile-1')
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Launching profile: test-profile-1')
      
      consoleSpy.mockRestore()
    })

    it('should log errors on failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      setupFailingMockElectronAPI(['launchProfile'])
      
      await electronService.launchProfile('test-profile-1')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RENDERER] Failed to launch profile test-profile-1:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('cancelLaunch', () => {
    it('should successfully cancel a profile launch', async () => {
      const result = await electronService.cancelLaunch('test-profile-1')
      
      expect(result).toEqual({ success: true })
      expect(window.api.cancelLaunch).toHaveBeenCalledWith('test-profile-1')
    })

    it('should handle cancel failure gracefully', async () => {
      setupFailingMockElectronAPI(['cancelLaunch'])
      
      const result = await electronService.cancelLaunch('test-profile-1')
      
      expect(result).toEqual({ success: false })
    })

    it('should log cancel attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.cancelLaunch('test-profile-1')
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Cancelling launch for profile: test-profile-1')
      
      consoleSpy.mockRestore()
    })
  })

  describe('setPriority', () => {
    it('should successfully set profile priority', async () => {
      const result = await electronService.setPriority('test-profile-1', 'High')
      
      expect(result).toEqual({ success: true })
      expect(window.api.setPriority).toHaveBeenCalledWith('test-profile-1', 'High')
    })

    it('should handle priority setting failure', async () => {
      setupFailingMockElectronAPI(['setPriority'])
      
      const result = await electronService.setPriority('test-profile-1', 'High')
      
      expect(result).toEqual({ success: false })
    })

    it('should log priority changes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.setPriority('test-profile-1', 'High')
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Setting priority for profile test-profile-1 to High')
      
      consoleSpy.mockRestore()
    })
  })

  describe('fetchTickets', () => {
    it('should successfully fetch tickets', async () => {
      const result = await electronService.fetchTickets()
      
      expect(result).toEqual({ ticketsFound: 3 })
      expect(window.api.fetchTickets).toHaveBeenCalled()
    })

    it('should return zero tickets on failure', async () => {
      setupFailingMockElectronAPI(['fetchTickets'])
      
      const result = await electronService.fetchTickets()
      
      expect(result).toEqual({ ticketsFound: 0 })
    })

    it('should log fetch attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.fetchTickets()
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Fetching tickets...')
      
      consoleSpy.mockRestore()
    })
  })

  describe('getSystemMetrics', () => {
    it('should successfully get system metrics', async () => {
      const mockMetrics = createMockSystemMetrics()
      setupMockElectronAPI({ getSystemMetrics: mockMetrics })
      
      const result = await electronService.getSystemMetrics()
      
      expect(result).toEqual(mockMetrics)
      expect(window.api.getSystemMetrics).toHaveBeenCalled()
    })

    it('should return default metrics on failure', async () => {
      setupFailingMockElectronAPI(['getSystemMetrics'])
      
      const result = await electronService.getSystemMetrics()
      
      expect(result).toEqual({
        cpuUsage: 0,
        memoryUsage: 0,
        concurrencyLimit: 0,
        throttlingState: 'None'
      })
    })

    it('should log metrics requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.getSystemMetrics()
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Fetching system metrics...')
      
      consoleSpy.mockRestore()
    })
  })

  describe('saveProfileData', () => {
    it('should successfully save profile data', async () => {
      const profiles = [createMockProfile()]
      
      await expect(electronService.saveProfileData(profiles)).resolves.toBeUndefined()
      expect(window.api.saveProfileData).toHaveBeenCalledWith(profiles)
    })

    it('should throw error on save failure', async () => {
      setupFailingMockElectronAPI(['saveProfileData'])
      const profiles = [createMockProfile()]
      
      await expect(electronService.saveProfileData(profiles)).rejects.toThrow()
    })

    it('should log save attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const profiles = [createMockProfile(), createMockProfile()]
      
      await electronService.saveProfileData(profiles)
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Saving profile data for 2 profiles')
      
      consoleSpy.mockRestore()
    })
  })

  describe('loadProfileData', () => {
    it('should successfully load profile data', async () => {
      const mockProfiles = [createMockProfile()]
      setupMockElectronAPI({ loadProfileData: mockProfiles })
      
      const result = await electronService.loadProfileData()
      
      expect(result).toEqual(mockProfiles)
      expect(window.api.loadProfileData).toHaveBeenCalled()
    })

    it('should return empty array on load failure', async () => {
      setupFailingMockElectronAPI(['loadProfileData'])
      
      const result = await electronService.loadProfileData()
      
      expect(result).toEqual([])
    })

    it('should log load attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await electronService.loadProfileData()
      
      expect(consoleSpy).toHaveBeenCalledWith('[RENDERER] Loading profile data...')
      
      consoleSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should report service errors to error service', async () => {
      const { errorService } = await import('../error-service')
      setupFailingMockElectronAPI(['launchProfile'])
      
      await electronService.launchProfile('test-profile-1')
      
      expect(errorService.reportServiceError).toHaveBeenCalledWith(
        'ElectronServiceAdapter',
        'launchProfile',
        expect.any(Error),
        { profileId: 'test-profile-1' }
      )
    })

    it('should include context in error reports', async () => {
      const { errorService } = await import('../error-service')
      setupFailingMockElectronAPI(['setPriority'])
      
      await electronService.setPriority('test-profile-1', 'High')
      
      expect(errorService.reportServiceError).toHaveBeenCalledWith(
        'ElectronServiceAdapter',
        'setPriority',
        expect.any(Error),
        { profileId: 'test-profile-1', priority: 'High' }
      )
    })
  })
})