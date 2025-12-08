import { MapPin, Activity } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useEffect, useMemo } from 'react';

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
  const { getCurrentLocations, getCurrentActivities, isGroupMode, activeGroup } =
    useGroupSettings();

  // Get locations from group settings (already hierarchical) - re-calculate when activeGroup changes
  const locations = useMemo(() => {
    return getCurrentLocations();
  }, [activeGroup]);

  // Get activities based on selected location (from hierarchical structure)
  const activities = useMemo(() => {
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
  }, [selectedLocation, activeGroup, locations, getCurrentActivities]);

  // Get display names for badges
  const selectedLocationName = useMemo(() => {
    if (!selectedLocation) return '';
    
    // Search by name first (since we now store names), then by ID (backwards compatibility)
    const location = locations.find(loc => 
      loc.name === selectedLocation ||
      ('id' in loc && loc.id === selectedLocation)
    );
    
    return location?.name || selectedLocation;
  }, [selectedLocation, locations]);

  const selectedActivityName = useMemo(() => {
    if (!selectedActivity) return '';
    
    // Search by name first (since we now store names), then by ID (backwards compatibility)
    const activity = activities.find(act => 
      act.name === selectedActivity ||
      act.id === selectedActivity
    );
    return activity?.name || selectedActivity;
  }, [selectedActivity, activities]);


  // Guard: Reset location if it doesn't exist in current locations list
  useEffect(() => {
    // 🛡️ Skip validation if locations aren't loaded yet - prevents transient loss
    if (locations.length === 0) {
      console.log('⏸️ [ContextSelectors] Locations not ready yet, skipping validation');
      return;
    }

    if (!selectedLocation) return;

    // Check by name first (since we now store names), then by ID (backwards compatibility)
    const isValid = locations.some(loc =>
      loc.name === selectedLocation ||
      ('id' in loc && loc.id === selectedLocation)
    );
    
    if (!isValid) {
      // Debounce clearing to handle list reshaping during transitions
      const timeoutId = setTimeout(() => {
        console.log(`⚠️ ContextSelectors: Location "${selectedLocation}" not found. Clearing...`);
        onLocationChange('');
      }, 250);
      
      return () => clearTimeout(timeoutId);
    }
  }, [locations, selectedLocation, onLocationChange]);

  // Clear activity selection when location changes and current activity is not available for that location
  useEffect(() => {
    if (selectedLocation && selectedActivity) {
      const availableActivityNames = activities.map(a => a.name);
      const availableActivityIds = activities.map(a => a.id);
      
      // Check if the selected activity is valid for the current location (by name first, then ID)
      if (!availableActivityNames.includes(selectedActivity) && !availableActivityIds.includes(selectedActivity)) {
        onActivityChange('');
      }
    }
  }, [selectedLocation, activities, selectedActivity, onActivityChange, activeGroup]);

  return (
    <div className="context-selector gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{t('realTime.location')}</span>
        </div>
        <Select 
          value={selectedLocation} 
          onValueChange={(locationId) => {
            // Store the human-readable name, not the ID
            const location = locations.find(loc => 
              ('id' in loc && loc.id === locationId) || loc.name === locationId
            );
            onLocationChange(location?.name || locationId);
          }}
        >
          <SelectTrigger className="h-11 bg-background">
            {selectedLocation ? (
              <span>{selectedLocationName}</span>
            ) : (
              <span className="text-muted-foreground">{t('realTime.noLocation')}</span>
            )}
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
        </div>
        <Select 
          value={selectedActivity} 
          onValueChange={(activityId) => {
            // Store the human-readable name, not the ID
            const activity = activities.find(act => 
              act.id === activityId || act.name === activityId
            );
            onActivityChange(activity?.name || activityId);
          }}
          disabled={false}
        >
          <SelectTrigger className="h-11 bg-background">
            {selectedActivity ? (
              <span>{selectedActivityName}</span>
            ) : (
              <span className="text-muted-foreground">{t('realTime.noActivity')}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            {activities
              .filter(activity => activity.id && activity.id.trim().length > 0)
              .map((activity) => (
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
