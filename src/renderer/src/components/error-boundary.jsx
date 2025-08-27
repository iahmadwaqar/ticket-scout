import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';

/**
 * React Error Boundary component for catching and handling React component errors
 * Provides user-friendly error UI and error reporting capabilities
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Report error to main process for logging
    this.reportErrorToMainProcess(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  async reportErrorToMainProcess(error, errorInfo) {
    try {
      // Send error details to main process for centralized logging
      if (window.api?.reportError) {
        await window.api.reportError({
          type: 'renderer-error',
          message: error.message,
          stack: error.stack || '',
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error to main process:', reportingError);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset to initial state and clear any stored state
    this.handleRetry();
    // Could also trigger navigation to home if routing is implemented
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred in the application. This has been reported automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.props.showDetails && this.state.error && (
                <div className="rounded-md bg-muted p-4">
                  <h4 className="font-medium text-sm mb-2">Error Details:</h4>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer hover:text-foreground">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload App
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary(
  Component,
  errorBoundaryProps
) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for manually reporting errors to the error boundary system
 */
export function useErrorHandler() {
  return React.useCallback((error) => {
    // Throw error to be caught by nearest error boundary
    throw error;
  }, []);
}