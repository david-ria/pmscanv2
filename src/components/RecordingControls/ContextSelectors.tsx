import { MapPin, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locationKeys, activityKeys } from "@/lib/recordingConstants";
import { useTranslation } from "react-i18next";

interface ContextSelectorsProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedActivity: string;
  onActivityChange: (activity: string) => void;
  isRecording: boolean;
}

export function ContextSelectors({
  selectedLocation,
  onLocationChange,
  selectedActivity,
  onActivityChange,
  isRecording
}: ContextSelectorsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{t('realTime.location')}</span>
        </div>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={t('realTime.noLocation')} />
          </SelectTrigger>
          <SelectContent>
            {locationKeys.map((locationKey) => (
              <SelectItem key={locationKey} value={t(`locations.${locationKey}`)}>
                {t(`locations.${locationKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{t('realTime.activity')}</span>
          {isRecording && selectedActivity && (
            <Badge variant="outline" className="text-xs">
              {selectedActivity}
            </Badge>
          )}
        </div>
        <Select value={selectedActivity} onValueChange={onActivityChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={t('realTime.noActivity')} />
          </SelectTrigger>
          <SelectContent>
            {activityKeys.map((activityKey) => (
              <SelectItem key={activityKey} value={t(`activities.${activityKey}`)}>
                {t(`activities.${activityKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}