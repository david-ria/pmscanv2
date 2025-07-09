import { useState } from 'react';
import { ArrowLeft, RotateCcw, Save, Bell, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAlerts, AlertSettings } from '@/contexts/AlertContext';

export default function CustomAlerts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    alertSettings, 
    updateAlertSettings, 
    resetToDefaults, 
    globalAlertsEnabled, 
    setGlobalAlertsEnabled 
  } = useAlerts();
  
  const [localSettings, setLocalSettings] = useState<AlertSettings>(alertSettings);

  const handleThresholdChange = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) return;

    setLocalSettings(prev => ({
      ...prev,
      [pollutant]: {
        ...prev[pollutant],
        threshold: numValue
      }
    }));
  };

  const handleDurationChange = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    value: string
  ) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) return;

    setLocalSettings(prev => ({
      ...prev,
      [pollutant]: {
        ...prev[pollutant],
        duration: numValue
      }
    }));
  };

  const handleEnabledToggle = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    enabled: boolean
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [pollutant]: {
        ...prev[pollutant],
        enabled: enabled
      }
    }));
  };

  const validateSettings = (settings: AlertSettings): boolean => {
    for (const pollutant of ['pm1', 'pm25', 'pm10'] as const) {
      const pollutantSettings = settings[pollutant];
      if (pollutantSettings.enabled) {
        if (pollutantSettings.threshold === null || pollutantSettings.threshold <= 0) {
          return false;
        }
        if (pollutantSettings.duration < 1) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateSettings(localSettings)) {
      toast({
        title: t('common.error'),
        description: t('alerts.validation.thresholdRequired'),
        variant: 'destructive'
      });
      return;
    }

    updateAlertSettings(localSettings);
    toast({
      title: t('common.success'),
      description: t('alerts.saved')
    });
    navigate('/profile');
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalSettings(alertSettings);
    toast({
      title: t('common.success'),
      description: t('alerts.resetToDefaults')
    });
  };

  const renderPollutantCard = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    title: string
  ) => {
    const settings = localSettings[pollutant];
    
    return (
      <Card key={pollutant}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => handleEnabledToggle(pollutant, enabled)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.enabled ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm">
                  {t('alerts.thresholdLevel')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={settings.threshold || ''}
                  onChange={(e) => handleThresholdChange(pollutant, e.target.value)}
                  placeholder="Ex: 25"
                  className="text-center"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">
                  {t('alerts.exposureDuration')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.duration}
                  onChange={(e) => handleDurationChange(pollutant, e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground">
                  {t('alerts.minimumDuration')}
                </p>
              </div>

              {settings.threshold !== null && (
                <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <p className="text-sm text-center">
                    {t('alerts.alertWhen', { 
                      threshold: settings.threshold, 
                      duration: settings.duration 
                    })}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {t('alerts.noAlertSet')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile')}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('alerts.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('alerts.subtitle')}
          </p>
        </div>
      </div>

      {/* Global Toggle */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {globalAlertsEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {globalAlertsEnabled ? t('alerts.enabled') : t('alerts.disabled')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('alerts.toggleDescription')}
                </p>
              </div>
            </div>
            <Switch
              checked={globalAlertsEnabled}
              onCheckedChange={setGlobalAlertsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm">
            {t('alerts.description')}
          </p>
        </CardContent>
      </Card>

      {/* Alert Controls */}
      <div className="space-y-6">
        {renderPollutantCard('pm1', t('alerts.pm1Alert'))}
        {renderPollutantCard('pm25', t('alerts.pm25Alert'))}
        {renderPollutantCard('pm10', t('alerts.pm10Alert'))}
      </div>

      <Separator className="my-6" />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('alerts.resetToDefaults')}
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1"
          disabled={!globalAlertsEnabled && !Object.values(localSettings).some(s => s.enabled)}
        >
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </div>

      {/* Validation Warning */}
      {!validateSettings(localSettings) && Object.values(localSettings).some(s => s.enabled) && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">
            {t('alerts.validation.thresholdRequired')}
          </p>
        </div>
      )}
    </div>
  );
}