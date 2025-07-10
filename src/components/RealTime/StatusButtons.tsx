import { cn } from "@/lib/utils";

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
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {/* PMScan Status Button */}
        <button
          onClick={() => isConnected ? onDisconnectDevice() : onConnectDevice()}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            isConnected 
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          PMScan
        </button>

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