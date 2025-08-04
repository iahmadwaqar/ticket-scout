import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import type { Profile, SystemMetrics, PriorityLevel } from '@/types'

// Mock data generators
export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'test-profile-1',
  name: 'Test Profile',
  status: 'Idle',
  loginState: 'Logged Out',
  supporterId: 'test-supporter',
  cardInfo: '1234-****-****-5678',
  expiry: '12/25',
  cvv: '123',
  seats: 2,
  url: 'https://example.com',
  proxy: '127.0.0.1:8080',
  priority: 'Medium',
  ...overrides
})

export const createMockSystemMetrics = (overrides: Partial<SystemMetrics> = {}): SystemMetrics => ({
  cpuUsage: 45,
  memoryUsage: 60,
  concurrencyLimit: 35,
  throttlingState: 'None',
  ...overrides
})

// Mock IPC responses
export const mockIPCResponses = {
  launchProfile: { success: true },
  cancelLaunch: { success: true },
  setPriority: { success: true },
  fetchTickets: { ticketsFound: 3 },
  getSystemMetrics: createMockSystemMetrics(),
  saveProfileData: undefined,
  loadProfileData: [createMockProfile()],
  getAppVersion: {
    version: '1.0.0',
    electronVersion: '28.0.0',
    nodeVersion: '18.17.0',
    chromeVersion: '120.0.0'
  }
}

// Enhanced render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock Electron API with realistic responses
export const setupMockElectronAPI = (customResponses: Partial<typeof mockIPCResponses> = {}) => {
  const responses = { ...mockIPCResponses, ...customResponses }
  
  window.api = {
    launchProfile: vi.fn().mockResolvedValue(responses.launchProfile),
    cancelLaunch: vi.fn().mockResolvedValue(responses.cancelLaunch),
    setPriority: vi.fn().mockResolvedValue(responses.setPriority),
    fetchTickets: vi.fn().mockResolvedValue(responses.fetchTickets),
    getSystemMetrics: vi.fn().mockResolvedValue(responses.getSystemMetrics),
    saveProfileData: vi.fn().mockResolvedValue(responses.saveProfileData),
    loadProfileData: vi.fn().mockResolvedValue(responses.loadProfileData),
    windowMinimize: vi.fn().mockResolvedValue(undefined),
    windowMaximize: vi.fn().mockResolvedValue(undefined),
    windowClose: vi.fn().mockResolvedValue(undefined),
    getAppVersion: vi.fn().mockResolvedValue(responses.getAppVersion),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/test/path' }),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/test/path'] }),
    showNotification: vi.fn().mockResolvedValue(undefined),
    reportError: vi.fn().mockResolvedValue(undefined)
  }
  
  return window.api
}

// Mock failing Electron API
export const setupFailingMockElectronAPI = (failingMethods: string[] = []) => {
  const api = setupMockElectronAPI()
  
  failingMethods.forEach(method => {
    if (method in api) {
      ;(api as any)[method] = vi.fn().mockRejectedValue(new Error(`Mock ${method} failure`))
    }
  })
  
  return api
}

// Utility to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Utility to create mock error
export const createMockError = (message = 'Test error', stack?: string) => {
  const error = new Error(message)
  if (stack) {
    error.stack = stack
  }
  return error
}

// Priority level values for testing
export const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low']

// Profile status values for testing
export const PROFILE_STATUSES = ['Idle', 'Running', 'Error', 'Success', 'Next'] as const

// Export everything
export * from '@testing-library/react'
export { customRender as render }