import React, { ReactNode } from 'react';
import { Map, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  overlay?: ReactNode;
}

export function MapPlaceholder({ 
  showGraph, 
  onToggleView, 
  isOnline,
  device,
  isConnected,
  onConnect,
  onDisconnect,
  
  locationEnabled,
  latestLocation,
  overlay
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

      {/* Simple placeholder content */}
      <div className="h-[45vh] relative">
        <div className="h-full flex items-center justify-center bg-muted/20 border border-border rounded-lg">
          <div className="text-center">
            <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('realTime.mapWillLoadWhenRecording')}
            </p>
          </div>
        </div>
        {overlay ? (
          <div className="absolute bottom-4 right-4 z-50">{overlay}</div>
        ) : null}
      </div>
    </div>
  );
}