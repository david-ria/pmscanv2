import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Wifi, Home, Building2 } from 'lucide-react';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WiFiConfigDialogProps {
  children: React.ReactNode;
}

export function WiFiConfigDialog({ children }: WiFiConfigDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { settings, updateSettings } = useAutoContext();
  const [isOpen, setIsOpen] = useState(false);
  const [homeWifi, setHomeWifi] = useState(settings.homeWifiSSID || '');
  const [workWifi, setWorkWifi] = useState(settings.workWifiSSID || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update local settings
      updateSettings({
        homeWifiSSID: homeWifi,
        workWifiSSID: workWifi,
      });

      // Save to database
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            home_wifi_ssid: homeWifi || null,
            work_wifi_ssid: workWifi || null,
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving WiFi settings:', error);
          throw error;
        }
      }

      toast({
        title: t('settings.wifi.saved'),
        description: t('settings.wifi.savedDescription'),
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving WiFi settings:', error);
      toast({
        title: t('common.error'),
        description: t('settings.wifi.saveError'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setHomeWifi(settings.homeWifiSSID || '');
    setWorkWifi(settings.workWifiSSID || '');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            {t('settings.wifi.title')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.wifi.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="home-wifi" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t('settings.wifi.homeNetwork')}
            </Label>
            <Input
              id="home-wifi"
              value={homeWifi}
              onChange={(e) => setHomeWifi(e.target.value)}
              placeholder={t('settings.wifi.homeNetworkPlaceholder')}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="work-wifi" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('settings.wifi.workNetwork')}
            </Label>
            <Input
              id="work-wifi"
              value={workWifi}
              onChange={(e) => setWorkWifi(e.target.value)}
              placeholder={t('settings.wifi.workNetworkPlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
