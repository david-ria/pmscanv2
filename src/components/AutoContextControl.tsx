import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AutoContextControl() {
  const { settings, updateSettings, toggleEnabled, isEnabled } =
    useAutoContext(false); // Don't start active scanning from the control component
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  

  useEffect(() => {
    setTempSettings(settings);
  }, [settings, showSettings]);

  const handleSaveSettings = () => {
    updateSettings(tempSettings);
    setShowSettings(false);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Auto Context Detection</CardTitle>
            <CardDescription className="text-sm">
              Automatically detect your activity and location context
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw]">
                <DialogHeader>
                  <DialogTitle>Auto Context Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="homeWifi">Home WiFi Name</Label>
                    <Input
                      id="homeWifi"
                      value={tempSettings.homeWifiSSID || ''}
                      onChange={(e) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          homeWifiSSID: e.target.value,
                        }))
                      }
                      placeholder="Your home WiFi name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="workWifi">Work WiFi Name</Label>
                    <Input
                      id="workWifi"
                      value={tempSettings.workWifiSSID || ''}
                      onChange={(e) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          workWifiSSID: e.target.value,
                        }))
                      }
                      placeholder="Your work WiFi name"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="ml-enabled"
                      checked={tempSettings.mlEnabled ?? false}
                      onCheckedChange={(v) =>
                        setTempSettings((prev) => ({ ...prev, mlEnabled: v }))
                      }
                    />
                    <Label htmlFor="ml-enabled">Use ML model</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="override-context"
                      checked={tempSettings.overrideContext ?? false}
                      onCheckedChange={(v) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          overrideContext: v,
                        }))
                      }
                    />
                    <Label htmlFor="override-context">Override activity</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSettings(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSettings}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Switch
              id="auto-context"
              checked={isEnabled}
              onCheckedChange={toggleEnabled}
            />
          </div>
        </div>
      </CardHeader>
      {isEnabled && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>• Indoor/outdoor detection based on GPS and WiFi</p>
            <p>• Activity recognition (walking, cycling, transport)</p>
            <p>• Work hours and location-based context</p>
            <p>• Optional ML model predictions</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
