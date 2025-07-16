import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { RecordingProvider } from '@/contexts/RecordingContext';
import { SensorProvider } from '@/contexts/SensorContext';
import { CrashRecoveryInitializer } from '@/components/CrashRecoveryInitializer';
import { useAuth } from '@/contexts/AuthContext';
import RealTime from './pages/RealTime';
import History from './pages/History';
import Analysis from './pages/Analysis';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import CustomThresholds from './pages/CustomThresholds';
import CustomAlerts from './pages/CustomAlerts';
import MySettings from './pages/MySettings';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="relative min-h-screen">
        <Routes>
          <Route
            path="/auth"
            element={!user ? <Auth /> : <Navigate to="/" replace />}
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SensorProvider>
                  <RecordingProvider>
                    <CrashRecoveryInitializer />
                    <div className="min-h-screen bg-background">
                      <Header />
                      <main className="pt-14 pb-16">
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
                      </main>
                      <BottomNavigation />
                    </div>
                  </RecordingProvider>
                </SensorProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </TooltipProvider>
  );
};

export default App;
