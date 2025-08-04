import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { DashboardErrorBoundary, useDashboardErrorHandler } from '../dashboard-error-boundary'
import { setupMockElectronAPI } from '@/test/test-utils'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Component that uses the error handler hook
const ComponentWithErrorHandler = ({ componentName }: { componentName?: string }) => {
  const handleError = useDashboardErrorHandler(componentName)
  
  return (
    <button 
      onClick={() => handleError(new Error('Hook error'), 'test context')}
      data-testid="trigger-error"
    >
      Trigger Error
    </button>
  )
}

describe('DashboardErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockElectronAPI()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('normal operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <DashboardErrorBoundary>
          <div data-testid="child-component">Child content</div>
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByTestId('child-component')).toBeInTheDocument()
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should not show error UI when children render successfully', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={false} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard Component Error')).not.toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('Dashboard Component Error')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByText('Retry Component')).toBeInTheDocument()
      expect(screen.getByText('Reset Component')).toBeInTheDocument()
    })

    it('should display custom component name in error message', () => {
      render(
        <DashboardErrorBoundary componentName="Profile Manager">
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('Profile Manager Error')).toBeInTheDocument()
    })

    it('should show error description', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('This component encountered an error and couldn\'t render properly.')).toBeInTheDocument()
    })

    it('should call custom error handler when provided', () => {
      const onError = vi.fn()
      
      render(
        <DashboardErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })
  })

  describe('retry functionality', () => {
    it('should retry component rendering when retry button is clicked', async () => {
      const { rerender } = render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('Dashboard Component Error')).toBeInTheDocument()
      
      // Click retry button
      fireEvent.click(screen.getByText('Retry Component'))
      
      // Rerender with no error
      rerender(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={false} />
        </DashboardErrorBoundary>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument()
      })
    })

    it('should track retry count', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      // First retry
      fireEvent.click(screen.getByText('Retry Component'))
      
      // Should show retry count after first retry
      expect(screen.getByText('Retry attempts: 1/3')).toBeInTheDocument()
    })

    it('should disable retry after max attempts', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      // Perform max retries (3)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText('Retry Component'))
      }
      
      expect(screen.getByText('Retry attempts: 3/3')).toBeInTheDocument()
      expect(screen.queryByText('Retry Component')).not.toBeInTheDocument()
    })

    it('should allow disabling retry functionality', () => {
      render(
        <DashboardErrorBoundary showRetry={false}>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.queryByText('Retry Component')).not.toBeInTheDocument()
      expect(screen.getByText('Reset Component')).toBeInTheDocument()
    })
  })

  describe('reset functionality', () => {
    it('should reset component state when reset button is clicked', async () => {
      const { rerender } = render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      expect(screen.getByText('Dashboard Component Error')).toBeInTheDocument()
      
      // Click reset button
      fireEvent.click(screen.getByText('Reset Component'))
      
      // Rerender with no error
      rerender(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={false} />
        </DashboardErrorBoundary>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument()
      })
    })

    it('should reset retry count when reset is clicked', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      // Perform some retries
      fireEvent.click(screen.getByText('Retry Component'))
      fireEvent.click(screen.getByText('Retry Component'))
      
      expect(screen.getByText('Retry attempts: 2/3')).toBeInTheDocument()
      
      // Reset
      fireEvent.click(screen.getByText('Reset Component'))
      
      // Retry count should be reset (not visible when count is 0)
      expect(screen.queryByText('Retry attempts:')).not.toBeInTheDocument()
    })
  })

  describe('error reporting', () => {
    it('should report errors to main process', async () => {
      render(
        <DashboardErrorBoundary componentName="Test Component">
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      await waitFor(() => {
        expect(window.api.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'dashboard-error',
            component: 'Test Component',
            message: 'Test error message',
            stack: expect.any(String),
            componentStack: expect.any(String),
            timestamp: expect.any(String),
            retryCount: 0,
            context: expect.objectContaining({
              url: expect.any(String),
              userAgent: expect.any(String)
            })
          })
        )
      })
    })

    it('should handle error reporting failures gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      window.api.reportError = vi.fn().mockRejectedValue(new Error('Reporting failed'))
      
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to report dashboard error:',
          expect.any(Error)
        )
      })
    })
  })
})

describe('useDashboardErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockElectronAPI()
  })

  it('should show toast notification when error is handled', () => {
    render(<ComponentWithErrorHandler componentName="Test Component" />)
    
    fireEvent.click(screen.getByTestId('trigger-error'))
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Component Error',
      description: 'Test Component encountered an error: Hook error',
      variant: 'destructive'
    })
  })

  it('should report error to main process', async () => {
    render(<ComponentWithErrorHandler componentName="Test Component" />)
    
    fireEvent.click(screen.getByTestId('trigger-error'))
    
    await waitFor(() => {
      expect(window.api.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dashboard-component-error',
          component: 'Test Component',
          message: 'Hook error',
          stack: expect.any(String),
          timestamp: expect.any(String),
          context: 'test context'
        })
      )
    })
  })

  it('should handle missing component name', () => {
    render(<ComponentWithErrorHandler />)
    
    fireEvent.click(screen.getByTestId('trigger-error'))
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Component Error',
      description: 'A component encountered an error: Hook error',
      variant: 'destructive'
    })
  })

  it('should handle error reporting failures gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    window.api.reportError = vi.fn().mockRejectedValue(new Error('Reporting failed'))
    
    render(<ComponentWithErrorHandler />)
    
    fireEvent.click(screen.getByTestId('trigger-error'))
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to report component error:',
        expect.any(Error)
      )
    })
  })

  it('should log errors to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    
    render(<ComponentWithErrorHandler componentName="Test Component" />)
    
    fireEvent.click(screen.getByTestId('trigger-error'))
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Dashboard error in Test Component:',
      expect.any(Error)
    )
  })
})