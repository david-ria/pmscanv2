import { useTranslation } from "react-i18next";

export function MobileNavigationHeader() {
  const { t } = useTranslation();

  return (
    <div className="p-6 border-b border-border">
      <h2 className="text-xl font-bold text-foreground">{t('settings.title')}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
    </div>
  );
}