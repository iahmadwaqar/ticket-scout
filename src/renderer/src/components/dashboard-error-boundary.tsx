import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Specialized Error Boundary for Dashboard components
 * Provides dashboard-specific error handling and recovery options
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`DashboardErrorBoundary caught error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error with dashboard context
    this.reportDashboardError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async reportDashboardError(error: Error, errorInfo: ErrorInfo) {
    try {
      if ((window as any).api?.reportError) {
        await (window as any).api.reportError({
          type: 'dashboard-error',
          component: this.props.componentName || 'unknown',
          message: error.message,
          stack: error.stack || '',
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          retryCount: this.state.retryCount,
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        });
      }
    } catch (reportingError) {
      console.error('Failed to report dashboard error:', reportingError);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.props.showRetry !== false && this.state.retryCount < this.maxRetries;
      const componentName = this.props.componentName || 'Dashboard Component';

      return (
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-lg">{componentName} Error</CardTitle>
              <CardDescription>
                This component encountered an error and couldn't render properly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              {this.state.retryCount > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Retry attempts: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}
              
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Component
                  </Button>
                )}
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Reset Component
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
 * Hook-based error boundary for functional components
 */
export function useDashboardErrorHandler(componentName?: string) {
  const { toast } = useToast();

  return React.useCallback((error: Error, context?: string) => {
    console.error(`Dashboard error in ${componentName || 'component'}:`, error);
    
    // Show user-friendly toast notification
    toast({
      title: "Component Error",
      description: `${componentName || 'A component'} encountered an error: ${error.message}`,
      variant: "destructive",
    });

    // Report error to main process
    if ((window as any).api?.reportError) {
      (window as any).api.reportError({
        type: 'dashboard-component-error',
        component: componentName || 'unknown',
        message: error.message,
        stack: error.stack || '',
        timestamp: new Date().toISOString(),
        context: context || '',
      }).catch(reportingError => {
        console.error('Failed to report component error:', reportingError);
      });
    }
  }, [componentName, toast]);
}