import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { InfoDialog } from './InfoDialog';
import { useDialog } from '@/hooks/useDialog';

export function MobileNavigationFooter() {
  const { t } = useTranslation();
  const appVersion = "V 2.0";
  const { open, openDialog, closeDialog } = useDialog();

  return (
    <>
      <div className="p-4 pb-20 border-t border-border">
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <button 
            onClick={openDialog}
            className="flex items-center justify-center gap-1 mx-auto hover:text-foreground transition-colors"
          >
            <Info className="h-3 w-3" />
            <span>{t('footer.info')}</span>
          </button>
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="font-mono text-xs text-muted-foreground/80">
              {appVersion}
            </p>
          </div>
        </div>
      </div>
      
      <InfoDialog open={open} onOpenChange={closeDialog} />
    </>
  );
}
