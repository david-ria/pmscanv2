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
import { useEffect, useMemo, useRef } from 'react';
import { DEBUG_GROUP_INHERITANCE, DEBUG_RATE_MS } from '@/config/debug';
import { rateLimitedDebug } from '@/utils/optimizedLogger';
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
    
    console.log('🔍 Looking up location:', {
      selectedLocation,
      locationsCount: locations.length,
      locations: locations.map(loc => ({
        id: 'id' in loc ? loc.id : 'NO_ID',
        name: loc.name
      }))
    });
    
    const location = locations.find(loc => 
      ('id' in loc && loc.id === selectedLocation) || 
      loc.name === selectedLocation
    );
    
    console.log('🔍 Found location:', location);
    
    return location?.name || selectedLocation;
  }, [selectedLocation, locations]);

  const selectedActivityName = useMemo(() => {
    if (!selectedActivity) return '';
    const activity = activities.find(act => 
      act.id === selectedActivity || 
      act.name === selectedActivity
    );
    return activity?.name || selectedActivity;
  }, [selectedActivity, activities]);

  // Debug log to verify group settings inheritance (conditional & rate-limited)
  const prevContextRef = useRef<string>('');
  useEffect(() => {
    if (!DEBUG_GROUP_INHERITANCE) return;
    
    const snapshot = JSON.stringify({
      groupId: activeGroup?.id,
      groupName: activeGroup?.name,
      isGroupMode,
      locationsCount: locations.length,
      activitiesCount: activities.length,
    });
    
    if (snapshot !== prevContextRef.current) {
      prevContextRef.current = snapshot;
      rateLimitedDebug('context_selectors', DEBUG_RATE_MS, '🔄 ContextSelectors updated', JSON.parse(snapshot));
    }
  }, [activeGroup, locations, activities, isGroupMode]);

  // Clear activity selection when location changes and current activity is not available for that location
  useEffect(() => {
    if (selectedLocation && selectedActivity) {
      const availableActivityIds = activities.map(a => a.id);
      const availableActivityNames = activities.map(a => a.name);
      
      // Check if the selected activity is valid for the current location (by name or ID)
      if (!availableActivityIds.includes(selectedActivity) && !availableActivityNames.includes(selectedActivity)) {
        console.log(`🔄 Activity "${selectedActivity}" not available for location "${selectedLocation}". Resetting...`);
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
          {isRecording && selectedLocation && (
            <Badge variant="outline" className="text-xs">
              {selectedLocationName}
            </Badge>
          )}
        </div>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
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
          {isRecording && selectedActivity && (
            <Badge variant="outline" className="text-xs">
              {selectedActivityName}
            </Badge>
          )}
        </div>
        <Select 
          value={selectedActivity} 
          onValueChange={onActivityChange}
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
