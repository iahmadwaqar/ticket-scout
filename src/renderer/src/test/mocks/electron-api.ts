import { vi } from 'vitest'
import type { ElectronServiceAPI } from '@/../../shared/ipc-types'
import { createMockProfile, createMockSystemMetrics } from '../test-utils'

/**
 * Comprehensive mock implementation of the Electron API
 * Provides realistic responses and behavior for testing
 */
export class MockElectronAPI implements ElectronServiceAPI {
  // Internal state for testing
  private profiles: any[] = [createMockProfile()]
  private systemMetrics = createMockSystemMetrics()
  private isHealthy = true
  private latency = 50 // ms

  // Mock implementations
  launchProfile = vi.fn().mockImplementation(async (profileId: string) => {
    await this.simulateLatency()
    if (!this.isHealthy) throw new Error('Service unavailable')
    return { success: true }
  })

  cancelLaunch = vi.fn().mockImplementation(async (profileId: string) => {
    await this.simulateLatency()
    if (!this.isHealthy) throw new Error('Service unavailable')
    return { success: true }
  })

  setPriority = vi.fn().mockImplementation(async (profileId: string, priority: any) => {
    await this.simulateLatency()
    if (!this.isHealthy) throw new Error('Service unavailable')
    return { success: true }
  })

  fetchTickets = vi.fn().mockImplementation(async () => {
    await this.simulateLatency(200) // Longer operation
    if (!this.isHealthy) throw new Error('Service unavailable')
    return { ticketsFound: Math.floor(Math.random() * 5) }
  })

  getSystemMetrics = vi.fn().mockImplementation(async () => {
    await this.simulateLatency()
    if (!this.isHealthy) throw new Error('Service unavailable')
    return { ...this.systemMetrics }
  })

  saveProfileData = vi.fn().mockImplementation(async (profiles: any[]) => {
    await this.simulateLatency(100)
    if (!this.isHealthy) throw new Error('Service unavailable')
    this.profiles = [...profiles]
  })

  loadProfileData = vi.fn().mockImplementation(async () => {
    await this.simulateLatency()
    if (!this.isHealthy) throw new Error('Service unavailable')
    return [...this.profiles]
  })

  windowMinimize = vi.fn().mockImplementation(async () => {
    await this.simulateLatency(10)
  })

  windowMaximize = vi.fn().mockImplementation(async () => {
    await this.simulateLatency(10)
  })

  windowClose = vi.fn().mockImplementation(async () => {
    await this.simulateLatency(10)
  })

  getAppVersion = vi.fn().mockImplementation(async () => {
    await this.simulateLatency()
    return {
      version: '1.0.0',
      electronVersion: '28.0.0',
      nodeVersion: '18.17.0',
      chromeVersion: '120.0.0'
    }
  })

  showSaveDialog = vi.fn().mockImplementation(async (options: any) => {
    await this.simulateLatency(50)
    return { canceled: false, filePath: '/mock/save/path.json' }
  })

  showOpenDialog = vi.fn().mockImplementation(async (options: any) => {
    await this.simulateLatency(50)
    return { canceled: false, filePaths: ['/mock/open/path.json'] }
  })

  showNotification = vi.fn().mockImplementation(async (title: string, body: string) => {
    await this.simulateLatency(10)
  })

  reportError = vi.fn().mockImplementation(async (errorReport: any) => {
    await this.simulateLatency(30)
    console.log('[MOCK] Error reported:', errorReport)
  })

  // Test utilities
  private async simulateLatency(ms: number = this.latency) {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  // Mock control methods for testing
  setHealthy(healthy: boolean) {
    this.isHealthy = healthy
  }

  setLatency(ms: number) {
    this.latency = ms
  }

  setSystemMetrics(metrics: any) {
    this.systemMetrics = { ...metrics }
  }

  setProfiles(profiles: any[]) {
    this.profiles = [...profiles]
  }

  simulateError(method: keyof ElectronServiceAPI, error: Error) {
    ;(this[method] as any).mockRejectedValueOnce(error)
  }

  simulateTimeout(method: keyof ElectronServiceAPI, timeoutMs: number) {
    ;(this[method] as any).mockImplementationOnce(async (...args: any[]) => {
      await new Promise(resolve => setTimeout(resolve, timeoutMs))
      throw new Error('Operation timeout')
    })
  }

  reset() {
    this.isHealthy = true
    this.latency = 50
    this.profiles = [createMockProfile()]
    this.systemMetrics = createMockSystemMetrics()
    
    // Reset all mocks
    Object.values(this).forEach(value => {
      if (vi.isMockFunction(value)) {
        value.mockClear()
      }
    })
  }

  getCallHistory() {
    const history: Record<string, any[]> = {}
    
    Object.entries(this).forEach(([key, value]) => {
      if (vi.isMockFunction(value)) {
        history[key] = value.mock.calls
      }
    })
    
    return history
  }
}

// Export singleton instance
export const mockElectronAPI = new MockElectronAPI()

// Helper to install mock API
export function installMockElectronAPI() {
  ;(window as any).api = mockElectronAPI
  return mockElectronAPI
}

// Helper to uninstall mock API
export function uninstallMockElectronAPI() {
  delete (window as any).api
}