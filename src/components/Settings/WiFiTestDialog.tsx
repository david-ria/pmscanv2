import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TestTube, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WiFiTestDialogProps {
  children: React.ReactNode;
}

export function WiFiTestDialog({ children }: WiFiTestDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [testWifi, setTestWifi] = useState('');

  const handleSetTestWifi = () => {
    // Store the test WiFi SSID in localStorage for mock detection
    localStorage.setItem('mock_wifi_ssid', testWifi);
    
    toast({
      title: t('settings.wifiTest.set'),
      description: t('settings.wifiTest.setDescription', { ssid: testWifi }),
    });
    setIsOpen(false);
  };

  const handleClearTestWifi = () => {
    localStorage.removeItem('mock_wifi_ssid');
    setTestWifi('');
    
    toast({
      title: t('settings.wifiTest.cleared'),
      description: t('settings.wifiTest.clearedDescription'),
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            {t('settings.wifiTest.title')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.wifiTest.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="test-wifi" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              {t('settings.wifiTest.networkName')}
            </Label>
            <Input
              id="test-wifi"
              value={testWifi}
              onChange={(e) => setTestWifi(e.target.value)}
              placeholder={t('settings.wifiTest.networkNamePlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClearTestWifi}>
            {t('settings.wifiTest.clear')}
          </Button>
          <Button onClick={handleSetTestWifi} disabled={!testWifi.trim()}>
            {t('settings.wifiTest.set')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}