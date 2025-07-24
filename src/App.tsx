import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { RecordingProvider } from '@/contexts/RecordingContext';
import { CrashRecoveryInitializer } from '@/components/CrashRecoveryInitializer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { lazy, Suspense, useEffect } from 'react';

// Lazy load pages for better performance and code splitting
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

// Optimized loading component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Chargement de l'application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="relative min-h-screen">
        <Routes>
          <Route
            path="/auth"
            element={!user ? (
              <Suspense fallback={<PageLoader />}>
                <Auth />
              </Suspense>
            ) : <Navigate to="/" replace />}
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <RecordingProvider>
                  <CrashRecoveryInitializer />
                  <div className="min-h-screen bg-background">
                    <Header />
                    <main className="pt-14 pb-16">
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<RealTime />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/analysis" element={<Analysis />} />
                          <Route path="/groups" element={<Groups />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route
                            path="/custom-thresholds"
                            element={<CustomThresholds />}
                          />
                          <Route
                            path="/custom-alerts"
                            element={<CustomAlerts />}
                          />
                          <Route path="/my-settings" element={<MySettings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </main>
                    <BottomNavigation />
                  </div>
                </RecordingProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default App;
