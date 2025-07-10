import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUnifiedDeviceConnection } from "@/hooks/useUnifiedDeviceConnection";
import { getDeviceTypeDisplayName } from "@/lib/device/deviceDetection";

interface StatusButtonsProps {
  isConnected: boolean;
  locationEnabled: boolean;
  isRecording: boolean;
  onConnectDevice: () => void;
  onDisconnectDevice: () => void;
  onRequestLocationPermission: () => void;
}

export function StatusButtons({
  isConnected,
  locationEnabled,
  isRecording,
  onConnectDevice,
  onDisconnectDevice,
  onRequestLocationPermission
}: StatusButtonsProps) {
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  
  const { 
    deviceType,
    isConnecting,
    scanForDevices,
    connectToDevice,
    requestDevice
  } = useUnifiedDeviceConnection();

  const handleScanForDevices = async () => {
    try {
      const devices = await scanForDevices();
      if (devices.length > 0) {
        setAvailableDevices(devices);
        setShowDevicePicker(true);
      }
    } catch (error) {
      console.error('Failed to scan for devices:', error);
    }
  };

  const handleDeviceSelection = async (deviceInfo: any) => {
    try {
      await connectToDevice(deviceInfo);
      setShowDevicePicker(false);
      setAvailableDevices([]);
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  };

  const handleConnectAirBeam = async () => {
    try {
      console.log('🔌 Force connecting to AirBeam...');
      await requestDevice('airbeam');
    } catch (error) {
      console.error('Failed to connect to AirBeam:', error);
    }
  };

  const handleConnectPMScan = async () => {
    try {
      console.log('🔌 Force connecting to PMScan...');
      await requestDevice('pmscan');
    } catch (error) {
      console.error('Failed to connect to PMScan:', error);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {/* Device Status Button */}
        {!showDevicePicker ? (
          <button
            onClick={() => isConnected ? onDisconnectDevice() : handleScanForDevices()}
            disabled={isConnecting}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              isConnected 
                ? "bg-green-500/20 text-green-700 border border-green-500/30" 
                : "bg-red-500/20 text-red-700 border border-red-500/30",
              isConnecting && "opacity-50"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            {isConnecting ? "Scanning..." : (deviceType ? getDeviceTypeDisplayName(deviceType) : "Scan Devices")}
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            {availableDevices.map((deviceInfo, index) => (
              <button
                key={index}
                onClick={() => handleDeviceSelection(deviceInfo)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 border border-blue-500/30 hover:bg-blue-500/30"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                {deviceInfo.name} ({getDeviceTypeDisplayName(deviceInfo.type)})
              </button>
            ))}
            <button
              onClick={() => setShowDevicePicker(false)}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Specific Device Type Buttons - for debugging */}
        {!isConnected && !showDevicePicker && (
          <div className="flex gap-1">
            <button
              onClick={handleConnectAirBeam}
              disabled={isConnecting}
              className="px-2 py-1 text-xs bg-purple-500/20 text-purple-700 border border-purple-500/30 rounded hover:bg-purple-500/30 disabled:opacity-50"
            >
              AirBeam
            </button>
            <button
              onClick={handleConnectPMScan}
              disabled={isConnecting}
              className="px-2 py-1 text-xs bg-blue-500/20 text-blue-700 border border-blue-500/30 rounded hover:bg-blue-500/30 disabled:opacity-50"
            >
              PMScan
            </button>
          </div>
        )}

        {/* GPS Status Button */}
        <button
          onClick={onRequestLocationPermission}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            locationEnabled 
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            locationEnabled ? "bg-green-500" : "bg-red-500"
          )} />
          GPS
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-700 border border-red-500/30 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Enregistrement...
        </div>
      )}
    </div>
  );
}