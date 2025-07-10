import { useEffect } from "react";
import { dataStorage } from "@/lib/dataStorage";

export function useAutoSync() {
  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      dataStorage.syncPendingMissions().catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Sync on app load if online
  useEffect(() => {
    if (navigator.onLine) {
      dataStorage.syncPendingMissions().catch(console.error);
    }
  }, []);
}