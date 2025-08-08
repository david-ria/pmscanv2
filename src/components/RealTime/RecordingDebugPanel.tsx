import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';

export function RecordingDebugPanel() {
  const { isRecording, recordingData, currentMissionId, recordingStartTime } = useRecordingContext();
  const [tick, setTick] = useState(0);
  const prevLen = useRef<number>(0);
  const [delta, setDelta] = useState<number>(0);

  // Only show when enabled
  const enabled = typeof window !== 'undefined' && localStorage.getItem('debug-rec') === '1';
  
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    const len = recordingData.length;
    setDelta(Math.max(0, len - (prevLen.current || 0)));
    prevLen.current = len;
  }, [recordingData.length]);

  const last = recordingData[recordingData.length - 1];
  const ageSec = useMemo(() => (last?.timestamp ? (Date.now() - new Date(last.timestamp).getTime()) / 1000 : Infinity), [last?.timestamp, tick]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-3 left-3 z-40 pointer-events-none">
      <div className="pointer-events-auto rounded-md border border-border bg-background/80 backdrop-blur px-3 py-2 shadow-md">
        <div className="text-xs text-muted-foreground">
          <div><span className="font-medium">Rec:</span> {isRecording ? 'on' : 'off'} · <span className="font-medium">len:</span> {recordingData.length} (+{delta})</div>
          <div><span className="font-medium">Age:</span> {Number.isFinite(ageSec) ? `${ageSec.toFixed(1)}s` : '—'}</div>
          <div><span className="font-medium">Mission:</span> {currentMissionId ? `${currentMissionId.slice(0, 8)}…` : '—'}</div>
          <div><span className="font-medium">Started:</span> {recordingStartTime ? new Date(recordingStartTime).toLocaleTimeString() : '—'}</div>
        </div>
      </div>
    </div>
  );
}
