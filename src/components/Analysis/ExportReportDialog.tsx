import { useState } from 'react';
import { Send, Mail, Download } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (method: 'download' | 'email', email?: string) => Promise<void>;
  loading: boolean;
}

export const ExportReportDialog = ({
  open,
  onOpenChange,
  onExport,
  loading,
}: ExportReportDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('download');

  const handleExport = async () => {
    try {
      if (activeTab === 'email') {
        if (!email.trim()) {
          toast({
            title: t('analysis.emailRequired'),
            description: t('analysis.emailRequiredDescription'),
            variant: 'destructive',
          });
          return;
        }
        
        if (!email.includes('@')) {
          toast({
            title: t('analysis.invalidEmail'),
            description: t('analysis.invalidEmailDescription'),
            variant: 'destructive',
          });
          return;
        }
        
        await onExport('email', email);
      } else {
        await onExport('download');
      }
      
      onOpenChange(false);
      setEmail('');
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('analysis.exportFailed'),
        description: t('analysis.exportFailedDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('analysis.exportReport')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('analysis.exportReportDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('analysis.download')}
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('analysis.sendByEmail')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4">
            <div className="text-center py-4">
              <Download className="h-12 w-12 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('analysis.downloadDescription')}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('analysis.emailAddress')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('analysis.enterEmailAddress')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                {activeTab === 'email' ? t('analysis.sending') : t('analysis.generating')}
              </>
            ) : (
              <>
                {activeTab === 'email' ? (
                  <Send className="h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {activeTab === 'email' ? t('analysis.sendEmail') : t('analysis.downloadPDF')}
              </>
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};