import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useErrorReporting } from '@/lib/error-service';
import { useDashboardErrorHandler } from './dashboard-error-boundary';

/**
 * Test component for verifying error handling functionality
 * This component should only be used in development
 */
export function ErrorTestComponent() {
  const { reportError, reportServiceError, reportIPCError } = useErrorReporting('ErrorTestComponent');
  const dashboardErrorHandler = useDashboardErrorHandler('ErrorTestComponent');
  const [errorCount, setErrorCount] = useState(0);

  const throwRenderError = () => {
    throw new Error('Test render error - this should be caught by error boundary');
  };

  const throwAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test async error')), 100);
      });
    } catch (error) {
      reportError(error as Error, 'async-operation-test');
    }
  };

  const throwServiceError = () => {
    const error = new Error('Test service error');
    reportServiceError('TestService', 'testOperation', error, { testParam: 'value' });
  };

  const throwIPCError = () => {
    const error = new Error('Test IPC communication error');
    reportIPCError('test-channel', error, ['arg1', 'arg2']);
  };

  const throwDashboardError = () => {
    const error = new Error('Test dashboard component error');
    dashboardErrorHandler(error, 'dashboard-test-context');
  };

  const throwUnhandledPromiseRejection = () => {
    // This will trigger the global unhandled rejection handler
    Promise.reject(new Error('Test unhandled promise rejection'));
  };

  const throwGlobalError = () => {
    // This will trigger the global error handler
    setTimeout(() => {
      throw new Error('Test global error');
    }, 100);
  };

  const [shouldThrowError, setShouldThrowError] = useState(false);

  if (shouldThrowError) {
    throwRenderError();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Error Handling Test Component</CardTitle>
        <CardDescription>
          Test various error scenarios to verify error handling implementation.
          This component should only be used in development.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setShouldThrowError(true)}
            variant="destructive"
            size="sm"
          >
            Throw Render Error
          </Button>
          
          <Button
            onClick={throwAsyncError}
            variant="destructive"
            size="sm"
          >
            Throw Async Error
          </Button>
          
          <Button
            onClick={throwServiceError}
            variant="destructive"
            size="sm"
          >
            Throw Service Error
          </Button>
          
          <Button
            onClick={throwIPCError}
            variant="destructive"
            size="sm"
          >
            Throw IPC Error
          </Button>
          
          <Button
            onClick={throwDashboardError}
            variant="destructive"
            size="sm"
          >
            Throw Dashboard Error
          </Button>
          
          <Button
            onClick={throwUnhandledPromiseRejection}
            variant="destructive"
            size="sm"
          >
            Unhandled Promise Rejection
          </Button>
          
          <Button
            onClick={throwGlobalError}
            variant="destructive"
            size="sm"
          >
            Throw Global Error
          </Button>
          
          <Button
            onClick={() => setErrorCount(prev => prev + 1)}
            variant="outline"
            size="sm"
          >
            Increment Counter ({errorCount})
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• Render errors should be caught by error boundaries</p>
          <p>• Async errors should be reported to the error service</p>
          <p>• Service/IPC errors should be logged with context</p>
          <p>• Dashboard errors should show toast notifications</p>
          <p>• Global errors should be caught by global handlers</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Component that always throws an error for testing error boundaries
 */
export function AlwaysErrorComponent() {
  throw new Error('This component always throws an error for testing');
}