import { useTranslation } from 'react-i18next';

export function MobileNavigationFooter() {
  const { t } = useTranslation();

  return (
    <div className="p-4 border-t border-border">
      <div className="text-center text-xs text-muted-foreground">
        <p>{t('settings.appVersion')}</p>
        <p className="mt-1">{t('settings.dataSync')}</p>
      </div>
    </div>
  );
}
