import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { alarms, loading, createAlarm, updateAlarm, deleteAlarm } = useGroupAlarms(groupId);
  const { features } = useSubscription();
  const [isCreating, setIsCreating] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    name: '',
    pollutant: 'pm25' as const,
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Premium Feature</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Custom alarms are available in Premium and Enterprise plans.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Group Alarms</DialogTitle>
        </DialogHeader>

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
                      <Label>Threshold</Label>
                      <Input
                        type="number"
                        value={alarm.threshold}
                        onChange={(e) => updateAlarm(alarm.id, { threshold: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
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
                        Sound
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={alarm.vibration_enabled}
                        onCheckedChange={(checked) => updateAlarm(alarm.id, { vibration_enabled: checked })}
                      />
                      <Label className="flex items-center gap-1">
                        <Vibrate className="h-4 w-4" />
                        Vibration
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={alarm.enabled}
                      onCheckedChange={(checked) => updateAlarm(alarm.id, { enabled: checked })}
                    />
                    <Label>Enabled</Label>
                  </div>
                </CardContent>
              </Card>
            ))}

            {alarms.length === 0 && !isCreating && (
              <div className="text-center py-8 text-muted-foreground">
                No custom alarms configured. Create your first alarm to get started.
              </div>
            )}
          </div>

          {/* Create New Alarm */}
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Alarm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Alarm Name</Label>
                    <Input
                      value={newAlarm.name}
                      onChange={(e) => setNewAlarm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="High PM2.5 Alert"
                    />
                  </div>
                  <div>
                    <Label>Pollutant</Label>
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
                    <Label>Threshold (μg/m³)</Label>
                    <Input
                      type="number"
                      value={newAlarm.threshold}
                      onChange={(e) => setNewAlarm(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
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
                      Sound
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newAlarm.vibration_enabled}
                      onCheckedChange={(checked) => setNewAlarm(prev => ({ ...prev, vibration_enabled: checked }))}
                    />
                    <Label className="flex items-center gap-1">
                      <Vibrate className="h-4 w-4" />
                      Vibration
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateAlarm} disabled={!newAlarm.name.trim()}>
                    Create Alarm
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Alarm
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
