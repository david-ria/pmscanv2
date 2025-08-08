import { useEffect, useMemo, useState } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';

export function RecordingHeartbeat() {
  const { isRecording } = useRecordingContext();
  const { isConnected, currentData } = usePMScanBluetooth();

  const [lastDataTs, setLastDataTs] = useState<number>(0);
  const [lastSource, setLastSource] = useState<'rt' | 'watchdog' | 'none'>('none');
  const [tick, setTick] = useState(0);

  // Track latest RT data timestamp
  useEffect(() => {
    if (currentData?.timestamp) {
      setLastDataTs(currentData.timestamp.getTime());
      setLastSource('rt');
    }
  }, [currentData?.timestamp]);

  // Heartbeat from global collector (normal + watchdog)
  useEffect(() => {
    const onBeat = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ts?: number; source?: 'rt' | 'watchdog' };
      if (detail?.ts) setLastDataTs(detail.ts);
      if (detail?.source) setLastSource(detail.source);
    };
    window.addEventListener('recording:data-point', onBeat as EventListener);
    return () => window.removeEventListener('recording:data-point', onBeat as EventListener);
  }, []);

  // Lightweight 1s ticker for UI freshness
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = useMemo(() => (lastDataTs ? (Date.now() - lastDataTs) / 1000 : Infinity), [lastDataTs, tick]);

  const { dotClass, label } = useMemo(() => {
    if (!isRecording) return { dotClass: 'bg-muted-foreground', label: 'Idle' };
    if (!isConnected) return { dotClass: 'bg-destructive', label: 'Disconnected' };
    if (ageSec < 3) return { dotClass: 'bg-primary', label: 'Live' };
    if (ageSec < 10) return { dotClass: 'bg-primary/60', label: 'Stale' };
    return { dotClass: 'bg-destructive', label: 'Stalled' };
  }, [isRecording, isConnected, ageSec]);

  if (!isRecording && !isConnected) return null; // keep UI clean when nothing is happening

  return (
    <div className="fixed bottom-3 right-3 z-40 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-3 py-1 shadow-md">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass} ${isRecording ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-muted-foreground">
          {label} · {Number.isFinite(ageSec) ? `${ageSec.toFixed(1)}s` : '—'} · {lastSource}
        </span>
      </div>
    </div>
  );
}
