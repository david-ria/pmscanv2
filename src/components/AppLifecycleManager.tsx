import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';

export function AppLifecycleManager() {
  const { toast } = useToast();

  const { appState, isVisible, orientation, isRestoring } = useAppLifecycle({
    onForeground: () => {
      logger.debug('🌅 App returned to foreground');
    },
    
    onBackground: () => {
      logger.debug('🌙 App moved to background');
    },
    
    onVisibilityChange: (visible) => {
      logger.debug(`👁️ Visibility changed: ${visible ? 'visible' : 'hidden'}`);
    },
    
    onOrientationChange: (newOrientation) => {
      logger.debug(`📱 Orientation changed: ${newOrientation}`);
      
      // Show brief toast for orientation changes during recording
      if (newOrientation) {
        toast({
          title: "Orientation Changed",
          description: "Session preserved during rotation",
          duration: 2000,
        });
      }
    },
    
    onAppStateChange: (state) => {
      logger.debug(`📱 Native app state: ${state.isActive ? 'active' : 'background'}`);
    }
  });

  // Debug info in development
  if (import.meta.env.DEV) {
    logger.debug(`🔄 App Lifecycle State: ${appState}, Visible: ${isVisible}, Orientation: ${orientation}, Restoring: ${isRestoring}`);
  }

  // This component doesn't render anything visible
  return null;
}