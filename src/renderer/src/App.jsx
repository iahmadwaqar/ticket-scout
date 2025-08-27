import DashboardPage from './components/dashboard/dashboard-page.jsx';
import { Toaster } from './components/ui/toaster.jsx';
import { ErrorBoundary } from './components/error-boundary.jsx';

function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DashboardPage />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;