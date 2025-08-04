import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron API
const mockElectronAPI = {
  launchProfile: vi.fn(),
  cancelLaunch: vi.fn(),
  setPriority: vi.fn(),
  fetchTickets: vi.fn(),
  getSystemMetrics: vi.fn(),
  saveProfileData: vi.fn(),
  loadProfileData: vi.fn(),
  windowMinimize: vi.fn(),
  windowMaximize: vi.fn(),
  windowClose: vi.fn(),
  getAppVersion: vi.fn(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
  showNotification: vi.fn(),
  reportError: vi.fn()
}

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockElectronAPI,
  writable: true
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Export mock API for use in tests
export { mockElectronAPI }