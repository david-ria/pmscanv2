import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Volume2, Vibrate } from 'lucide-react';
import { useGroupAlarms } from '@/hooks/useGroupAlarms';
import { useSubscription } from '@/hooks/useSubscription';

interface GroupAlarmsDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupAlarmsDialog({ groupId, open, onOpenChange }: GroupAlarmsDialogProps) {
  const { t } = useTranslation();
  const { alarms, loading, createAlarm, updateAlarm, deleteAlarm } = useGroupAlarms(groupId);
  const { features } = useSubscription();
  const [isCreating, setIsCreating] = useState(false);
  const [newAlarm, setNewAlarm] = useState<{
    name: string;
    pollutant: 'pm1' | 'pm25' | 'pm10';
    threshold: number;
    enabled: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
    color: string;
  }>({
    name: '',
    pollutant: 'pm25',
    threshold: 25,
    enabled: true,
    sound_enabled: true,
    vibration_enabled: true,
    color: '#ef4444',
  });

  const handleCreateAlarm = async () => {
    if (!newAlarm.name.trim()) return;
    
    await createAlarm(newAlarm);
    setNewAlarm({
      name: '',
      pollutant: 'pm25',
      threshold: 25,
      enabled: true,
      sound_enabled: true,
      vibration_enabled: true,
      color: '#ef4444',
    });
    setIsCreating(false);
  };

  const pollutantLabels = {
    pm1: 'PM1.0',
    pm25: 'PM2.5',
    pm10: 'PM10',
  };

  if (!features.customAlarms) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('groups.alarms.premiumFeature')}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {t('groups.alarms.premiumDescription')}
            </p>
            <Button onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('groups.alarms.title')}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-6">
          {/* Existing Alarms */}
          <div className="space-y-4">
            {alarms.map((alarm) => (
              <Card key={alarm.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{alarm.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={alarm.enabled ? 'default' : 'secondary'}
                        style={{ backgroundColor: alarm.enabled ? alarm.color : undefined }}
                      >
                        {pollutantLabels[alarm.pollutant]} &gt; {alarm.threshold} μg/m³
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAlarm(alarm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>{t('groups.alarms.threshold')}</Label>
                      <Input
                        type="number"
                        value={alarm.threshold}
                        onChange={(e) => updateAlarm(alarm.id, { threshold: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{t('groups.alarms.color')}</Label>
                      <Input
                        type="color"
                        value={alarm.color}
                        onChange={(e) => updateAlarm(alarm.id, { color: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={alarm.sound_enabled}
                        onCheckedChange={(checked) => updateAlarm(alarm.id, { sound_enabled: checked })}
                      />
                      <Label className="flex items-center gap-1">
                        <Volume2 className="h-4 w-4" />
                        {t('groups.alarms.sound')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={alarm.vibration_enabled}
                        onCheckedChange={(checked) => updateAlarm(alarm.id, { vibration_enabled: checked })}
                      />
                      <Label className="flex items-center gap-1">
                        <Vibrate className="h-4 w-4" />
                        {t('groups.alarms.vibration')}
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={alarm.enabled}
                      onCheckedChange={(checked) => updateAlarm(alarm.id, { enabled: checked })}
                    />
                    <Label>{t('groups.alarms.enabled')}</Label>
                  </div>
                </CardContent>
              </Card>
            ))}

            {alarms.length === 0 && !isCreating && (
              <div className="text-center py-8 text-muted-foreground">
                {t('groups.alarms.noAlarms')}
              </div>
            )}
          </div>

          {/* Create New Alarm */}
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('groups.alarms.createNewAlarm')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('groups.alarms.alarmName')}</Label>
                    <Input
                      value={newAlarm.name}
                      onChange={(e) => setNewAlarm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('groups.alarms.highPMAlert')}
                    />
                  </div>
                  <div>
                    <Label>{t('groups.alarms.pollutant')}</Label>
                    <Select
                      value={newAlarm.pollutant}
                      onValueChange={(value: 'pm1' | 'pm25' | 'pm10') => 
                        setNewAlarm(prev => ({ ...prev, pollutant: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pm1">PM1.0</SelectItem>
                        <SelectItem value="pm25">PM2.5</SelectItem>
                        <SelectItem value="pm10">PM10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('groups.alarms.thresholdUnit')}</Label>
                    <Input
                      type="number"
                      value={newAlarm.threshold}
                      onChange={(e) => setNewAlarm(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>{t('groups.alarms.color')}</Label>
                    <Input
                      type="color"
                      value={newAlarm.color}
                      onChange={(e) => setNewAlarm(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newAlarm.sound_enabled}
                      onCheckedChange={(checked) => setNewAlarm(prev => ({ ...prev, sound_enabled: checked }))}
                    />
                    <Label className="flex items-center gap-1">
                      <Volume2 className="h-4 w-4" />
                      {t('groups.alarms.sound')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newAlarm.vibration_enabled}
                      onCheckedChange={(checked) => setNewAlarm(prev => ({ ...prev, vibration_enabled: checked }))}
                    />
                    <Label className="flex items-center gap-1">
                      <Vibrate className="h-4 w-4" />
                      {t('groups.alarms.vibration')}
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateAlarm} disabled={!newAlarm.name.trim()}>
                    {t('groups.alarms.createAlarm')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('groups.alarms.addNewAlarm')}
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
