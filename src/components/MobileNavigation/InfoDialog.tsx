import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface InfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoDialog({ open, onOpenChange }: InfoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/83ccf48a-d0be-4ac1-9039-4c4a8295958c.png" 
              alt="AirSentinels Logo" 
              className="h-16 object-contain"
            />
          </div>
          <DialogTitle className="text-center">{t('footer.infoDialog.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-center">
            {t('footer.infoDialog.developer')}
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t('footer.infoDialog.disclaimer.title')}</h3>
            <p>{t('footer.infoDialog.disclaimer.content')}</p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t('footer.infoDialog.privacy.title')}</h3>
            <p>{t('footer.infoDialog.privacy.content')}</p>
            <p>{t('footer.infoDialog.privacy.logs')}</p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t('footer.infoDialog.useAtRisk.title')}</h3>
            <p>{t('footer.infoDialog.useAtRisk.content')}</p>
          </section>

          <p className="text-center italic">
            {t('footer.infoDialog.contact')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
