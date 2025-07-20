import { MapPin, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useEffect } from 'react';
import { 
  DEFAULT_LOCATIONS, 
  DEFAULT_ACTIVITIES, 
  getActivitiesForLocation,
  getLocationName,
  getActivityName 
} from '@/lib/locationsActivities';

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
  isRecording,
}: ContextSelectorsProps) {
  const { t } = useTranslation();
  const { getCurrentLocations, getCurrentActivities, isGroupMode } =
    useGroupSettings();

  // Use group locations if in group mode, otherwise use static DEFAULT_LOCATIONS as fallback
  const locations = isGroupMode
    ? getCurrentLocations()
    : DEFAULT_LOCATIONS.map((loc) => ({ 
        name: loc.name, // Use direct name instead of translation
        key: loc.id 
      }));

  // Get activities based on selected location
  const getAvailableActivities = () => {
    if (isGroupMode) {
      return getCurrentActivities();
    }
    
    if (!selectedLocation) {
      return []; // No activities until location is selected
    }

    // Find location by name 
    const selectedLocationData = DEFAULT_LOCATIONS.find(loc => 
      loc.name === selectedLocation
    );
    
    if (!selectedLocationData) {
      return [];
    }

    // Get activities for this location from static data
    const locationActivities = getActivitiesForLocation(selectedLocationData.id);
    
    return locationActivities.map(activity => ({
      key: activity.id,
      name: activity.name, // Use direct name instead of translation
    }));
  };

  const activities = getAvailableActivities();

  // Clear activity selection when location changes and current activity is not available
  useEffect(() => {
    if (!isGroupMode && selectedLocation && selectedActivity) {
      const availableActivityLabels = activities.map(a => a.name);
      if (!availableActivityLabels.includes(selectedActivity)) {
        onActivityChange('');
      }
    }
  }, [selectedLocation, activities, selectedActivity, onActivityChange, isGroupMode]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{t('realTime.location')}</span>
          {isRecording && selectedLocation && (
            <Badge variant="outline" className="text-xs">
              {selectedLocation}
            </Badge>
          )}
        </div>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={t('realTime.noLocation')} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem
                key={isGroupMode ? location.name : location.key}
                value={location.name}
              >
                {location.name}
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
        <Select 
          value={selectedActivity} 
          onValueChange={onActivityChange}
          disabled={!isGroupMode && !selectedLocation}
        >
          <SelectTrigger className="h-11">
            <SelectValue 
              placeholder={
                !isGroupMode && !selectedLocation 
                  ? "Select location first" 
                  : t('realTime.noActivity')
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {activities.map((activity) => (
              <SelectItem
                key={isGroupMode ? activity.name : activity.key}
                value={activity.name}
              >
                {activity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
