import { useEffect, useState } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { Button } from '@/components/ui/button';

/**
 * Simple recording debugger component to test the recording flow
 */
export function RecordingDebugger() {
  const unifiedData = useUnifiedData();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      timestamp: new Date().toISOString(),
      isRecording: unifiedData.isRecording,
      hasCurrentData: !!unifiedData.currentData,
      currentDataPM25: unifiedData.currentData?.pm25,
      isConnected: unifiedData.isConnected,
      hasAddDataPoint: !!unifiedData.addDataPoint,
      recordingDataLength: unifiedData.recordingData.length,
      recordingFrequency: unifiedData.recordingFrequency,
      canProceed: unifiedData.isRecording && !!unifiedData.currentData && !!unifiedData.addDataPoint
    };
    
    setDebugInfo(info);
    console.log('🐛 RECORDING DEBUGGER STATE:', info);
  }, [
    unifiedData.isRecording,
    unifiedData.currentData,
    unifiedData.isConnected,
    unifiedData.addDataPoint,
    unifiedData.recordingData.length
  ]);

  const handleStartRecording = () => {
    console.log('🐛 DEBUGGER: Starting recording with 5s frequency');
    unifiedData.startRecording('5s');
  };

  const handleStopRecording = () => {
    console.log('🐛 DEBUGGER: Stopping recording');
    unifiedData.stopRecording();
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">Recording Debug</h3>
      
      <div className="space-y-2 text-xs">
        <div>Recording: {debugInfo.isRecording ? '✅' : '❌'}</div>
        <div>Has Data: {debugInfo.hasCurrentData ? '✅' : '❌'}</div>
        <div>Connected: {debugInfo.isConnected ? '✅' : '❌'}</div>
        <div>Add Function: {debugInfo.hasAddDataPoint ? '✅' : '❌'}</div>
        <div>PM2.5: {debugInfo.currentDataPM25 || 'N/A'}</div>
        <div>Data Count: {debugInfo.recordingDataLength}</div>
        <div>Can Proceed: {debugInfo.canProceed ? '✅' : '❌'}</div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          onClick={handleStartRecording}
          disabled={debugInfo.isRecording}
        >
          Start
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleStopRecording}
          disabled={!debugInfo.isRecording}
        >
          Stop
        </Button>
      </div>
    </div>
  );
}