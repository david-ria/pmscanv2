import { useTranslation } from 'react-i18next';

export function MobileNavigationFooter() {
  const { t } = useTranslation();
  const appVersion = "V3.1"; // Version incrémentielle

  return (
    <div className="p-4 pb-20 border-t border-border">{/* pb-20 to avoid bottom nav bar */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>{t('settings.appVersion')}</p>
        <p>{t('settings.dataSync')}</p>
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="font-mono text-xs text-muted-foreground/80">
            {appVersion}
          </p>
        </div>
      </div>
    </div>
  );
}
