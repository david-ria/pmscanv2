import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Wifi } from 'lucide-react';
import { DeviceType } from '@/lib/device/types';
import { getDeviceTypeDisplayName, getDeviceCapabilities } from '@/lib/device/deviceDetection';
import { cn } from '@/lib/utils';

interface DeviceSelectorProps {
  onDeviceTypeSelected: (deviceType: DeviceType) => void;
  className?: string;
}

export function DeviceSelector({ onDeviceTypeSelected, className }: DeviceSelectorProps) {
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);

  const handleConnect = () => {
    if (selectedType) {
      onDeviceTypeSelected(selectedType);
    }
  };

  const deviceTypes: { type: DeviceType; description: string; features: string[] }[] = [
    {
      type: 'pmscan',
      description: 'High-precision air quality monitor with real-time data logging',
      features: ['Temperature & Humidity', 'Battery Status', 'Data Logging', 'Bluetooth LE']
    },
    {
      type: 'airbeam',
      description: 'Community air quality sensor with GPS tracking',
      features: ['Temperature & Humidity', 'GPS Integration', 'Community Platform', 'Bluetooth Classic']
    }
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          Select Your Air Quality Device
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {deviceTypes.map((deviceInfo) => {
            const capabilities = getDeviceCapabilities(deviceInfo.type);
            const isSelected = selectedType === deviceInfo.type;
            
            return (
              <div
                key={deviceInfo.type}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedType(deviceInfo.type)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {getDeviceTypeDisplayName(deviceInfo.type)}
                    </h3>
                    {deviceInfo.type === 'pmscan' ? (
                      <Bluetooth className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {deviceInfo.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {deviceInfo.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleConnect}
            disabled={!selectedType}
            className="flex-1"
          >
            <Bluetooth className="h-4 w-4 mr-2" />
            Connect to {selectedType ? getDeviceTypeDisplayName(selectedType) : 'Device'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}