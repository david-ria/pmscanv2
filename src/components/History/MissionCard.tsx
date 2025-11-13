import { Download, Share, Trash2, RotateCcw } from 'lucide-react';
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
  onSync: (missionId: string) => void;
  syncing: boolean;
}

export function MissionCard({
  mission,
  onExport,
  onDelete,
  onShare,
  onSync,
  syncing,
}: MissionCardProps) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Preload measurements on hover for faster dialog opening
  const handleMouseEnter = async () => {
    if (mission.measurements.length === 0) {
      const { dataStorage } = await import('@/lib/dataStorage');
      await dataStorage.getMissionMeasurements(mission.id);
    }
  };
  
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
            className="grid grid-cols-4 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareDialog mission={mission} onShare={onShare}>
              <Button variant="outline" size="sm" className="w-full">
                <Share className="h-3 w-3 sm:mr-2" />
                <span className="hidden sm:inline">{t('history.share')}</span>
              </Button>
            </ShareDialog>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onSync(mission.id)}
              disabled={mission.synced || !navigator.onLine || syncing}
            >
              <RotateCcw className={`h-3 w-3 sm:mr-2 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('history.sync')}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onExport(mission)}
            >
              <Download className="h-3 w-3 sm:mr-2" />
              <span className="hidden sm:inline">{t('history.export')}</span>
            </Button>
            
            <Button
              variant={confirmDelete ? "destructive" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => {
                if (confirmDelete) {
                  onDelete(mission.id);
                  setConfirmDelete(false);
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
            >
              <Trash2 className="h-3 w-3 sm:mr-2" />
              <span className="hidden sm:inline">
                {confirmDelete ? t('history.confirmDelete') : ''}
              </span>
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
