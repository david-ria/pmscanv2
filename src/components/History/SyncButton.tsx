import { RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncButtonProps {
  unsyncedCount: number;
  syncing: boolean;
  onSync: () => void;
}

export function SyncButton({ unsyncedCount, syncing, onSync }: SyncButtonProps) {
  if (unsyncedCount === 0) return null;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onSync}
      disabled={syncing || !navigator.onLine}
      className="flex items-center gap-2"
    >
      {syncing ? (
        <RotateCcw className="h-4 w-4 animate-spin" />
      ) : navigator.onLine ? (
        <RotateCcw className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      Sync ({unsyncedCount})
    </Button>
  );
}