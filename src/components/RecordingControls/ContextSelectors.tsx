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
// No need to import helpers anymore - using hierarchical structure directly

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

  // Get locations from group settings (already hierarchical)
  const locations = getCurrentLocations();

  // Get activities based on selected location (from hierarchical structure)
  const getAvailableActivities = () => {
    if (!selectedLocation) {
      // Show all activities from all locations if no location is selected
      return getCurrentActivities();
    }

    // Find location by ID or name (backwards compatibility)
    const selectedLocationData = locations.find(loc => 
      ('id' in loc && loc.id === selectedLocation) || 
      loc.name === selectedLocation
    );
    
    if (!selectedLocationData || !('activities' in selectedLocationData)) {
      return [];
    }

    // Return activities directly from the location
    return selectedLocationData.activities;
  };

  const activities = getAvailableActivities();

  // Clear activity selection when location changes and current activity is not available for that location
  useEffect(() => {
    if (selectedLocation && selectedActivity) {
      const availableActivityIds = activities.map(a => a.id);
      const availableActivityNames = activities.map(a => a.name);
      
      // Check if the selected activity is valid for the current location (by name or ID)
      if (!availableActivityIds.includes(selectedActivity) && !availableActivityNames.includes(selectedActivity)) {
        console.log(`🔄 Activity "${selectedActivity}" not available for location "${selectedLocation}". Available activities:`, availableActivityNames);
        onActivityChange('');
      }
    }
  }, [selectedLocation, activities, selectedActivity, onActivityChange]);

  return (
    <div className="context-selector gap-4">
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
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder={t('realTime.noLocation')} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem
                key={'id' in location ? location.id : location.name}
                value={'id' in location ? location.id : location.name}
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
          disabled={false}
        >
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder={t('realTime.noActivity')} />
          </SelectTrigger>
          <SelectContent>
            {activities.map((activity) => (
              <SelectItem
                key={activity.id}
                value={activity.id}
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
