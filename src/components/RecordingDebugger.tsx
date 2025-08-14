import { useEffect, useState } from 'react';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useMissionSaver } from '@/hooks/useMissionSaver';
import { Button } from '@/components/ui/button';

/**
 * Simple recording debugger component to test the recording flow
 */
export function RecordingDebugger() {
  const unifiedData = useUnifiedData();
  const { saveMission } = useMissionSaver();
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

  const handleStopRecording = async () => {
    console.log('🚨🐛 === DEBUGGER STOP RECORDING CALLED ===');
    console.log('🐛 DEBUGGER: Stopping recording and saving mission');
    console.log('🐛 DEBUGGER: Pre-save state:', {
      recordingDataLength: unifiedData.recordingData.length,
      hasRecordingStartTime: !!unifiedData.recordingStartTime,
      recordingStartTime: unifiedData.recordingStartTime,
      isRecording: unifiedData.isRecording
    });
    
    // Save mission first (like the normal UI flow)
    if (unifiedData.recordingData.length > 0 && unifiedData.recordingStartTime) {
      try {
        console.log('🐛 DEBUGGER: Calling saveMission...');
        const missionName = `Debug Mission ${new Date().toLocaleString()}`;
        const savedMission = await saveMission(
          unifiedData.recordingData,
          unifiedData.recordingStartTime,
          missionName,
          'Debug Location',
          'Debug Activity',
          unifiedData.recordingFrequency,
          false
        );
        console.log('🐛 DEBUGGER: Mission saved successfully:', savedMission.id);
        console.log('🐛 DEBUGGER: Saved mission details:', {
          id: savedMission.id,
          name: savedMission.name,
          measurementsCount: savedMission.measurementsCount,
          startTime: savedMission.startTime,
          endTime: savedMission.endTime
        });
      } catch (error) {
        console.error('🚨🐛 === DEBUGGER MISSION SAVE ERROR ===', error);
        console.error('🐛 DEBUGGER: Mission save failed:', error);
      }
    } else {
      console.error('🚨🐛 === DEBUGGER MISSING DATA ===');
      console.error('🐛 DEBUGGER: Cannot save mission - missing data or start time');
    }
    
    // Then stop recording
    console.log('🚨🐛 === DEBUGGER STOPPING RECORDING ===');
    console.log('🐛 DEBUGGER: Stopping recording and clearing data...');
    unifiedData.stopRecording();
    unifiedData.clearRecordingData();
    console.log('🚨🐛 === DEBUGGER RECORDING STOPPED ===');
    console.log('🐛 DEBUGGER: Recording stopped and data cleared');
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