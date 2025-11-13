import { Download, Share, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MissionData } from '@/lib/dataStorage';
import { ShareDialog } from './ShareDialog';
import { MissionDetailsDialog } from './MissionDetailsDialog';
import { WeatherInfo } from '@/components/WeatherInfo';
import { AirQualityInfo } from '@/components/AirQualityInfo';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { formatDuration } from '@/utils/timeFormat';

interface MissionCardProps {
  mission: MissionData;
  onExport: (mission: MissionData) => void;
  onDelete: (missionId: string) => void;
  onShare: (
    mission: MissionData,
    shareType: 'email' | 'sms' | 'native'
  ) => void;
}

export function MissionCard({
  mission,
  onExport,
  onDelete,
  onShare,
}: MissionCardProps) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Preload measurements on hover for faster dialog opening
  const handleMouseEnter = async () => {
    if (mission.measurements.length === 0) {
      const { dataStorage } = await import('@/lib/dataStorage');
      await dataStorage.getMissionMeasurements(mission.id);
    }
  };
  
  // Debug: Log weather data info
  console.log('🌤️ MissionCard - Mission:', mission.name, 'weatherDataId:', mission.weatherDataId);
  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-air-good';
    if (pm25 <= 35) return 'text-air-moderate';
    if (pm25 <= 55) return 'text-air-poor';
    return 'text-air-very-poor';
  };


  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const missionDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (missionDate.getTime() === today.getTime()) {
      return t('history.today');
    } else if (missionDate.getTime() === yesterday.getTime()) {
      return t('history.yesterday');
    } else {
      return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  return (
    <>
      <Card
        className="relative cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDetailsOpen(true)}
        onMouseEnter={handleMouseEnter}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{mission.name}</CardTitle>
                {!mission.synced && (
                  <Badge variant="outline" className="text-xs">
                    {t('history.local')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(mission.startTime))} •{' '}
                {formatDuration(mission.durationMinutes)}
              </p>
              {mission.weatherDataId && (
                <div className="mt-1">
                  <WeatherInfo weatherDataId={mission.weatherDataId} compact />
                </div>
              )}
              {mission.airQualityDataId && (
                <div className="mt-1">
                  <AirQualityInfo airQualityDataId={mission.airQualityDataId} compact />
                </div>
              )}
            </div>
            <div className="text-right">
              <div
                className={`text-xl font-bold ${getQualityColor(mission.avgPm25)}`}
              >
                {Math.round(mission.avgPm25)}
              </div>
              <div className="text-xs text-muted-foreground">
                µg/m³ ({t('history.avg')})
              </div>
              <div className="text-xs text-muted-foreground">
                {mission.measurementsCount} {t('history.measurements')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareDialog mission={mission} onShare={onShare}>
              <Button variant="outline" size="sm" className="flex-1">
                <Share className="h-3 w-3 mr-2" />
                {t('history.share')}
              </Button>
            </ShareDialog>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onExport(mission)}
            >
              <Download className="h-3 w-3 mr-2" />
              {t('history.export')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(mission.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <MissionDetailsDialog
        mission={mission}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}
