import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { preloadCriticalChunks, preloadRouteChunks } from '@/utils/dynamicImports';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load page components for code splitting
const RealTime = lazy(() => import('./pages/RealTime'));
const History = lazy(() => import('./pages/History'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Groups = lazy(() => import('./pages/Groups'));
const Profile = lazy(() => import('./pages/Profile'));
const CustomThresholds = lazy(() => import('./pages/CustomThresholds'));
const CustomAlerts = lazy(() => import('./pages/CustomAlerts'));

const Auth = lazy(() => import('./pages/Auth'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load heavy components
const Header = lazy(() => 
  import('@/components/Header').then(module => ({ default: module.Header }))
);
const BottomNavigation = lazy(() => 
  import('@/components/BottomNavigation').then(module => ({ default: module.BottomNavigation }))
);
const UnifiedDataProvider = lazy(() => 
  import('@/components/UnifiedDataProvider').then(module => ({ default: module.UnifiedDataProvider }))
);
const CrashRecoveryInitializer = lazy(() => 
  import('@/components/CrashRecoveryInitializer').then(module => ({ default: module.CrashRecoveryInitializer }))
);
const PMLineGraph = lazy(() => 
  import('@/components/PMLineGraph').then(module => ({ default: module.PMLineGraph }))
);
const GlobalDataCollector = lazy(() => 
  import('@/components/GlobalDataCollector').then(module => ({ default: module.GlobalDataCollector }))
);

// Import skeleton screens
const AppLayoutSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.AppLayoutSkeleton }))
);
const RealTimePageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.RealTimePageSkeleton }))
);
const HistoryPageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.HistoryPageSkeleton }))
);
const AnalysisPageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.AnalysisPageSkeleton }))
);
const GroupsPageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.GroupsPageSkeleton }))
);
const ProfilePageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens').then(module => ({ default: module.ProfilePageSkeleton }))
);

// Minimal fallback for critical loading states
const MinimalSkeleton = () => (
  <div className="min-h-screen bg-background animate-pulse flex items-center justify-center">
    <div className="w-8 h-8 bg-muted rounded animate-pulse" />
  </div>
);

const App = () => {
  // Preload critical chunks on app startup
  useEffect(() => {
    // Use requestIdleCallback to preload during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloadCriticalChunks(), { timeout: 2000 });
    } else {
      setTimeout(preloadCriticalChunks, 100);
    }
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="relative min-h-screen">
          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><AppLayoutSkeleton /></Suspense>}>
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
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Preload route-specific chunks when route changes
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloadRouteChunks(location.pathname), { timeout: 1000 });
    } else {
      setTimeout(() => preloadRouteChunks(location.pathname), 50);
    }
  }, [location.pathname]);

  if (loading) {
    return <MinimalSkeleton />;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <Suspense fallback={<MinimalSkeleton />}>
            {!user ? <Auth /> : <Navigate to="/" replace />}
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><AppLayoutSkeleton /></Suspense>}>
              <UnifiedDataProvider>
                <CrashRecoveryInitializer />
                <div className="min-h-screen bg-background">
                  <Header />
                  <main className="pt-14 pb-16">
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><RealTimePageSkeleton /></Suspense>}>
                            <RealTime />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/history" 
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><HistoryPageSkeleton /></Suspense>}>
                            <History />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/analysis" 
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><AnalysisPageSkeleton /></Suspense>}>
                            <Analysis />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/groups" 
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><GroupsPageSkeleton /></Suspense>}>
                            <Groups />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/profile" 
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><ProfilePageSkeleton /></Suspense>}>
                            <Profile />
                          </Suspense>
                        } 
                      />
                      <Route
                        path="/custom-thresholds"
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><ProfilePageSkeleton /></Suspense>}>
                            <CustomThresholds />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/custom-alerts"
                        element={
                          <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><ProfilePageSkeleton /></Suspense>}>
                            <CustomAlerts />
                          </Suspense>
                        }
                      />
                      <Route 
                        path="*" 
                        element={
                          <Suspense fallback={<MinimalSkeleton />}>
                            <NotFound />
                          </Suspense>
                        } 
                      />
                    </Routes>
                  </main>
                  <BottomNavigation />
                  
                  {/* Global data collection that persists across pages */}
                  <Suspense fallback={null}>
                    <GlobalDataCollector />
                  </Suspense>
                  
                  
                  {/* Keep chart alive across pages - hidden but still mounted */}
                  <div className={location.pathname === '/' ? 'hidden' : 'hidden absolute -top-[9999px]'}>
                    <Suspense fallback={null}>
                      <PMLineGraph data={[]} events={[]} className="h-64" />
                    </Suspense>
                  </div>
                </div>
              </UnifiedDataProvider>
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