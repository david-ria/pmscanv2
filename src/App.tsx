import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { preloadCriticalChunks, preloadRouteChunks } from '@/utils/dynamicImports';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load page components for code splitting
const RealTime = lazy(() => import('./pages/RealTime'));
const History = lazy(() => import('./pages/History'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Groups = lazy(() => import('./pages/Groups'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
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
// ✅ Import synchronously - critical for recording stability during language changes
import { UnifiedDataProvider } from '@/components/UnifiedDataProvider';
import { GlobalDataCollector } from '@/components/GlobalDataCollector';
import { InterruptionDetector } from '@/components/InterruptionDetector';
import { StorageMonitor } from '@/components/StorageMonitor';
const CrashRecoveryInitializer = lazy(() => 
  import('@/components/CrashRecoveryInitializer').then(module => ({ default: module.CrashRecoveryInitializer }))
);
const PMLineGraph = lazy(() => 
  import('@/components/PMLineGraph').then(module => ({ default: module.PMLineGraph }))
);

// Import OfflineDetector synchronously - critical component that must load immediately
import { OfflineDetector } from '@/components/OfflineDetector';

// Import skeleton screens
const AppLayoutSkeleton = lazy(() => 
  import('@/components/shared/AppLayoutSkeleton')
);
const RealTimePageSkeleton = lazy(() => 
  import('@/components/shared/SkeletonScreens')
);
const HistoryPageSkeleton = lazy(() => 
  import('@/components/shared/HistoryPageSkeleton')
);
const AnalysisPageSkeleton = lazy(() => 
  import('@/components/shared/AnalysisPageSkeleton')
);
const GroupsPageSkeleton = lazy(() => 
  import('@/components/shared/GroupsPageSkeleton')
);
const ProfilePageSkeleton = lazy(() => 
  import('@/components/shared/ProfilePageSkeleton')
);

// Minimal fallback for critical loading states
const MinimalSkeleton = () => (
  <div className="min-h-screen bg-background animate-pulse flex items-center justify-center">
    <div className="w-8 h-8 bg-muted rounded animate-pulse" />
  </div>
);

const App = () => {
  // Preload critical chunks and route pages on app startup when online
  useEffect(() => {
    const preload = () => {
      preloadCriticalChunks();
      if (navigator.onLine) {
        Promise.all([
          import('./pages/RealTime'),
          import('./pages/History'),
          import('./pages/Analysis'),
          import('./pages/Groups'),
          import('./pages/GroupDetails'),
          import('./pages/Profile'),
          import('./pages/CustomThresholds'),
          import('./pages/CustomAlerts'),
          import('./pages/NotFound'),
          // Preload heavy shared components used across routes
          import('@/components/Header'),
          import('@/components/BottomNavigation'),
          import('@/components/CrashRecoveryInitializer'),
          import('@/components/PMLineGraph'),
          // UnifiedDataProvider and GlobalDataCollector are now imported synchronously
        ]).catch((err) => {
          // Ignore preload failures (likely offline)
          console.debug('[Preload] Skipped (offline?):', err?.name || err);
        });
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 2000 });
    } else {
      setTimeout(preload, 100);
    }
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <OfflineDetector />
      <ErrorBoundary>
        <TooltipProvider>
          <div className="relative min-h-screen">
            <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><AppLayoutSkeleton /></Suspense>}>
              <AppRoutes />
            </Suspense>
          </div>
        </TooltipProvider>
      </ErrorBoundary>
    </>
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
            <UnifiedDataProvider>
              <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><AppLayoutSkeleton /></Suspense>}>
                <CrashRecoveryInitializer />
                <div className="min-h-screen bg-background">
                  <Header />
                  <ErrorBoundary showReload={false}>
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
                          path="/main" 
                          element={<Navigate to="/" replace />}
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
                          path="/groups/:groupId" 
                          element={
                            <Suspense fallback={<Suspense fallback={<MinimalSkeleton />}><GroupsPageSkeleton /></Suspense>}>
                              <GroupDetails />
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
                          element={<Navigate to="/" replace />}
                        />
                      </Routes>
                    </main>
                  </ErrorBoundary>
                  <BottomNavigation />
                  
                  {/* Global data collection that persists across pages */}
                  <GlobalDataCollector />
                  
                  {/* Interruption detection for emergency saves */}
                  <InterruptionDetector />
                  
                  {/* Storage monitoring for capacity alerts */}
                  <StorageMonitor />
                  
                  {/* Keep chart alive across pages - hidden but still mounted */}
                  <div className={location.pathname === '/' ? 'hidden' : 'hidden absolute -top-[9999px]'}>
                    <Suspense fallback={null}>
                      <PMLineGraph data={[]} events={[]} className="h-64" />
                    </Suspense>
                  </div>
                </div>
              </Suspense>
            </UnifiedDataProvider>
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;