import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from 'react-i18next';

const DISMISSAL_KEY = 'pwa-install-dismissed';
const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISSAL_DURATION) {
        setIsVisible(false);
        return;
      }
    }

    // Show if can install or is iOS
    setIsVisible(canInstall || isIOS);
  }, [canInstall, isIOS, isInstalled]);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await promptInstall();
    setIsInstalling(false);
    
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <Alert className="pointer-events-auto bg-card border-border shadow-lg max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <AlertDescription className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {t('pwa.install.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isIOS ? t('pwa.install.iosDescription') : t('pwa.install.description')}
                </p>
              </div>

              {isIOS ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{t('pwa.install.iosInstructions')}</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>{t('pwa.install.iosStep1')}</li>
                    <li>{t('pwa.install.iosStep2')}</li>
                  </ol>
                  <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded">
                    <Share className="h-4 w-4 text-primary" />
                    <span className="text-xs">{t('pwa.install.iosShareIcon')}</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="w-full"
                  size="sm"
                >
                  {isInstalling ? t('pwa.install.installing') : t('pwa.install.installButton')}
                </Button>
              )}
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
};
