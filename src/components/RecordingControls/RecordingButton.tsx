import { Play, Square, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { frequencyOptionKeys } from '@/lib/recordingConstants';
import { useTranslation } from 'react-i18next';
import * as logger from '@/utils/logger';
import { EventButton } from './EventButton';

interface RecordingButtonProps {
  isRecording: boolean;
  onClick: () => void;
  recordingFrequency: string;
}

export function RecordingButton({
  isRecording,
  onClick,
  recordingFrequency,
}: RecordingButtonProps) {
  const { t } = useTranslation();

  const getFrequencyLabel = (frequency: string) => {
    const option = frequencyOptionKeys.find((f) => f.value === frequency);
    return option ? t(`modals.frequency.${option.key}`) : frequency;
  };

  const handleClick = () => {
    logger.debug('🚨 BUTTON CLICKED - RecordingButton');
    logger.debug('Current isRecording state:', isRecording);
    onClick();
  };

  return (
    <div className="space-y-4">
      {/* Recording Control */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleClick}
          className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200 relative',
            'hover:scale-105 active:scale-95',
            isRecording
              ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg'
              : 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'
          )}
          type="button"
        >
          {/* Record icon overlay */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <Circle 
              className={cn(
                "h-8 w-8",
                isRecording ? "text-destructive-foreground/30" : "text-primary-foreground/30"
              )} 
              fill="currentColor" 
            />
            <div 
              className={cn(
                "absolute h-3 w-3 rounded-full",
                isRecording ? "bg-destructive-foreground" : "bg-primary-foreground"
              )}
            />
          </div>
          
          {/* Play/Stop icon */}
          <div className="relative z-10">
            {isRecording ? (
              <Square className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </div>
        </button>
        
        {/* Event Button */}
        <EventButton />
      </div>

      {/* Status */}
      <div className="text-center">
        <Badge
          variant={isRecording ? 'destructive' : 'secondary'}
          className="text-sm"
        >
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span>{t('realTime.recording')}</span>
              <Clock className="h-3 w-3" />
              <span>{getFrequencyLabel(recordingFrequency)}</span>
            </div>
          ) : (
            t('realTime.stopped')
          )}
        </Badge>
      </div>
    </div>
  );
}
