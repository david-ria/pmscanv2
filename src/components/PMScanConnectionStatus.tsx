import { usePMScanBluetooth } from "@/hooks/usePMScanBluetooth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PMScanConnectionStatusProps {
  className?: string;
}

export function PMScanConnectionStatus({ className }: PMScanConnectionStatusProps) {
  const { isConnected, disconnect, requestDevice, isConnecting } = usePMScanBluetooth();

  if (!isConnected) {
    return (
      <div className={cn("flex gap-2 justify-center", className)}>
        <Button 
          onClick={requestDevice} 
          disabled={isConnecting}
          className="px-6"
        >
          {isConnecting ? "Connexion..." : "Connecter PMScan"}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border shadow-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm font-medium">Connected</span>
        <button 
          onClick={disconnect}
          className="ml-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Disconnect
        </button>
      </div>
      <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border shadow-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm font-medium">GPS Active</span>
      </div>
    </div>
  );
}