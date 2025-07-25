import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load page components for code splitting
const RealTime = lazy(() => import('./pages/RealTime'));
const History = lazy(() => import('./pages/History'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Groups = lazy(() => import('./pages/Groups'));
const Profile = lazy(() => import('./pages/Profile'));
const CustomThresholds = lazy(() => import('./pages/CustomThresholds'));
const CustomAlerts = lazy(() => import('./pages/CustomAlerts'));
const MySettings = lazy(() => import('./pages/MySettings'));
const Auth = lazy(() => import('./pages/Auth'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load heavy components
const Header = lazy(() => 
  import('@/components/Header').then(module => ({ default: module.Header }))
);
const BottomNavigation = lazy(() => 
  import('@/components/BottomNavigation').then(module => ({ default: module.BottomNavigation }))
);
const RecordingProvider = lazy(() => 
  import('@/contexts/RecordingContext').then(module => ({ default: module.RecordingProvider }))
);
const CrashRecoveryInitializer = lazy(() => 
  import('@/components/CrashRecoveryInitializer').then(module => ({ default: module.CrashRecoveryInitializer }))
);

// Loading fallback component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="relative min-h-screen">
          <Suspense fallback={<LoadingSpinner />}>
            <AppProviders>
              <AppRoutes />
            </AppProviders>
          </Suspense>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

const AppRoutes = () => {
  // Import useAuth hook from the already loaded context
  const { useAuth } = require('@/contexts/AuthContext');
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            {!user ? <Auth /> : <Navigate to="/" replace />}
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <Suspense fallback={<LoadingSpinner />}>
              <RecordingProvider>
                <CrashRecoveryInitializer />
                <div className="min-h-screen bg-background">
                  <Header />
                  <main className="pt-14 pb-16">
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <RealTime />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/history" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <History />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/analysis" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <Analysis />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/groups" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <Groups />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/profile" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <Profile />
                          </Suspense>
                        } 
                      />
                      <Route
                        path="/custom-thresholds"
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <CustomThresholds />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/custom-alerts"
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <CustomAlerts />
                          </Suspense>
                        }
                      />
                      <Route 
                        path="/my-settings" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <MySettings />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="*" 
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <NotFound />
                          </Suspense>
                        } 
                      />
                    </Routes>
                  </main>
                  <BottomNavigation />
                </div>
              </RecordingProvider>
            </Suspense>
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;