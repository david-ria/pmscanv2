import { Map, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleRecordButton } from './SimpleRecordButton';
import { OptimizedMapPlaceholder } from './OptimizedMapPlaceholder';
import { useTranslation } from 'react-i18next';
import { PMScanDevice } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

interface MapPlaceholderProps {
  showGraph: boolean;
  onToggleView: (showGraph: boolean) => void;
  isOnline: boolean;
  device: PMScanDevice | null;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  locationEnabled: boolean;
  latestLocation: LocationData | null;
}

export function MapPlaceholder({ 
  showGraph, 
  onToggleView, 
  isOnline,
  device,
  isConnected,
  onConnect,
  onDisconnect,
  onStartRecording,
  locationEnabled,
  latestLocation
}: MapPlaceholderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      {/* Toggle Controls */}
      <div className="flex items-center justify-center mb-3">
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={!showGraph ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToggleView(false)}
            className="flex items-center gap-2"
          >
            <Map className="h-4 w-4" />
            {t('realTime.map')}
          </Button>
          <Button
            variant={showGraph ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToggleView(true)}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {t('realTime.graph')}
          </Button>
        </div>
      </div>

      {/* Optimized placeholder with CSS-based visuals instead of images */}
      <div className="h-[45vh] relative">
        <OptimizedMapPlaceholder 
          className="h-full"
          message={t('realTime.mapWillLoadWhenRecording')}
        />

        {/* Simple Record Button */}
        <SimpleRecordButton
          onStartRecording={onStartRecording}
          className="absolute bottom-4 right-4 z-10"
        />
      </div>
    </div>
  );
}