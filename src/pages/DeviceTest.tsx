import { useState } from 'react';
import { DeviceSelector } from '@/components/DeviceSelector';
import { BluetoothConnection } from '@/components/BluetoothConnection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeviceType } from '@/lib/device/types';
import { useUnifiedDeviceConnection } from '@/hooks/useUnifiedDeviceConnection';
import { toPMScanData } from '@/lib/device/dataAdapter';

export default function DeviceTest() {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const { isConnected, currentData, deviceType } = useUnifiedDeviceConnection();

  const handleDeviceTypeSelected = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Device Integration Test</h1>
        <p className="text-muted-foreground">
          Test connection to PMScan and AirBeam devices
        </p>
      </div>

      {!isConnected ? (
        <DeviceSelector onDeviceTypeSelected={handleDeviceTypeSelected} />
      ) : (
        <BluetoothConnection preferredDeviceType={selectedDeviceType || undefined} />
      )}

      {isConnected && currentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Real-time Data
              {deviceType && (
                <Badge variant="outline">{deviceType.toUpperCase()}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {currentData.pm1.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">PM1.0 µg/m³</div>
              </div>
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {currentData.pm25.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">PM2.5 µg/m³</div>
              </div>
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {currentData.pm10.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">PM10 µg/m³</div>
              </div>
            </div>
            
            {'temperature' in currentData && currentData.temperature && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-secondary/20 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {currentData.temperature.toFixed(1)}°C
                  </div>
                  <div className="text-sm text-muted-foreground">Temperature</div>
                </div>
                {currentData.humidity && (
                  <div className="text-center p-4 bg-secondary/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {currentData.humidity.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Humidity</div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground text-center">
              Last updated: {currentData.timestamp.toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}