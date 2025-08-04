import { JSX } from 'react';
import DashboardPage from './components/dashboard/dashboard-page';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/error-boundary';

function App(): JSX.Element {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DashboardPage />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
