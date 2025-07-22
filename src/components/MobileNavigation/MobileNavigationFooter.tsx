import { useTranslation } from 'react-i18next';

export function MobileNavigationFooter() {
  const { t } = useTranslation();
  const appVersion = "V1.1"; // Version incrémentielle

  return (
    <div className="p-4 border-t border-border">
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
