import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PMLineGraph } from '@/components/PMLineGraph';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useEvents } from '@/hooks/useEvents';
import { X, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * Persistent chart component that stays mounted across page navigation
 * Shows/hides based on recording state and user preferences
 */
export function PersistentChart() {
  const location = useLocation();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  const persistentChartRef = useRef<HTMLDivElement>(null);
  
  const { 
    isRecording, 
    recordingData, 
    currentMissionId 
  } = useRecordingContext();
  
  const { getEventsByMission } = useEvents();

  // Show chart overlay when recording and not on real-time page
  useEffect(() => {
    const isRealTimePage = location.pathname === '/';
    const shouldShow = isRecording && !isRealTimePage && recordingData.length > 0;
    setIsVisible(shouldShow);
    
    // Store chart visibility state
    if (shouldShow) {
      localStorage.setItem('persistentChart-visible', 'true');
    } else if (!isRecording) {
      localStorage.removeItem('persistentChart-visible');
      setIsExpanded(false);
    }
  }, [isRecording, location.pathname, recordingData.length]);

  // Restore chart state on mount
  useEffect(() => {
    const wasVisible = localStorage.getItem('persistentChart-visible') === 'true';
    const wasExpanded = localStorage.getItem('persistentChart-expanded') === 'true';
    
    if (wasVisible && isRecording) {
      setIsVisible(true);
    }
    if (wasExpanded) {
      setIsExpanded(true);
    }
  }, [isRecording]);

  // Fetch events for current mission
  useEffect(() => {
    if (currentMissionId && isVisible) {
      getEventsByMission(currentMissionId).then(setCurrentEvents);
    } else {
      setCurrentEvents([]);
    }
  }, [currentMissionId, getEventsByMission, isVisible]);

  // Handle expand/collapse
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem('persistentChart-expanded', String(newExpanded));
  };

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    localStorage.removeItem('persistentChart-visible');
    localStorage.removeItem('persistentChart-expanded');
  };

  if (!isVisible || !isRecording) {
    return null;
  }

  return (
    <div
      ref={persistentChartRef}
      className={cn(
        "fixed z-50 bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl transition-all duration-300",
        isExpanded 
          ? "top-4 left-4 right-4 bottom-20 md:bottom-4" // Full screen on mobile, with padding on desktop
          : "bottom-20 right-4 w-80 h-48 md:bottom-4" // Small overlay
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {t('realTime.liveChart')}
          </span>
          <span className="text-xs text-muted-foreground">
            ({recordingData.length} {t('common.points')})
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 p-2 h-[calc(100%-3.5rem)]">
        {recordingData.length > 0 ? (
          <PMLineGraph 
            data={recordingData} 
            events={currentEvents} 
            className="h-full w-full"
            highlightContextType="location"
            hideTitle={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('realTime.waitingForData')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-2 left-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}