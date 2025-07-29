import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MissionData } from '@/lib/dataStorage';
import { ShareDialog } from './ShareDialog';
import { MissionDetailsDialog } from './MissionDetailsDialog';
import { WeatherInfo } from '@/components/WeatherInfo';
import { AirQualityInfo } from '@/components/AirQualityInfo';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '@/utils/timeFormat';
import { useToast } from '@/hooks/use-toast';
import { dataStorage } from '@/lib/dataStorage';
import { Edit2, Share2, Download, Trash2, Check, X } from 'lucide-react';

interface MissionCardProps {
  mission: MissionData;
  onExport: (mission: MissionData) => void;
  onDelete: (missionId: string) => void;
  onShare: (
    mission: MissionData,
    shareType: 'email' | 'sms' | 'native'
  ) => void;
  onMissionUpdate?: (updatedMission: MissionData) => void;
}

export function MissionCard({
  mission,
  onExport,
  onDelete,
  onShare,
  onMissionUpdate,
}: MissionCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(mission.name);

  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-air-good';
    if (pm25 <= 35) return 'text-air-moderate';
    if (pm25 <= 55) return 'text-air-poor';
    return 'text-air-very-poor';
  };

  // Mission name editing handlers
  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the details dialog
    setEditedName(mission.name);
    setIsEditingName(true);
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) return;
    
    try {
      dataStorage.updateMissionName(mission.id, editedName.trim());
      setIsEditingName(false);
      
      // Update the mission object for immediate UI feedback
      const updatedMission = { ...mission, name: editedName.trim() };
      onMissionUpdate?.(updatedMission);
      
      toast({
        title: t("history.missionNameUpdated"),
        description: t("history.missionNameUpdateSuccess"),
      });
    } catch (error) {
      console.error('Error updating mission name:', error);
      toast({
        title: t("history.errorUpdatingMissionName"),
        description: t("history.failedToUpdateMissionName"),
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedName(mission.name);
    setIsEditingName(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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
        onClick={() => !isEditingName && setDetailsOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-3">
              <div className="flex items-center gap-2 mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="font-semibold w-32 sm:w-40"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-base flex-1">{mission.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEditing}
                      className="h-6 w-6 p-0 hover:bg-muted"
                      title={t("history.editMission")}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
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
              {mission.locationContext && mission.activityContext && (
                <p className="text-xs text-muted-foreground mt-1">
                  {mission.locationContext} • {mission.activityContext}
                </p>
              )}
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
                <Share2 className="h-3 w-3 mr-2" />
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
        onMissionUpdated={onMissionUpdate}
      />
    </>
  );
}