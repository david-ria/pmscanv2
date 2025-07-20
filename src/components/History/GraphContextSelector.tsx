import React from 'react';
import { MapPin, Activity, Brain } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { MissionData } from '@/lib/dataStorage';

interface GraphContextSelectorProps {
  mission: MissionData;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedActivity: string;
  onActivityChange: (activity: string) => void;
  selectedAutoContext: string;
  onAutoContextChange: (autoContext: string) => void;
}

export function GraphContextSelector({
  mission,
  selectedLocation,
  onLocationChange,
  selectedActivity,
  onActivityChange,
  selectedAutoContext,
  onAutoContextChange,
}: GraphContextSelectorProps) {
  const { t } = useTranslation();

  // Extract unique contexts from mission measurements
  const availableLocations = React.useMemo(() => {
    const locations = new Set<string>();
    mission.measurements.forEach(m => {
      if (m.locationContext) {
        locations.add(m.locationContext);
      }
    });
    return Array.from(locations).sort();
  }, [mission.measurements]);

  const availableActivities = React.useMemo(() => {
    const activities = new Set<string>();
    mission.measurements.forEach(m => {
      if (m.activityContext) {
        activities.add(m.activityContext);
      }
    });
    return Array.from(activities).sort();
  }, [mission.measurements]);

  const availableAutoContexts = React.useMemo(() => {
    const autoContexts = new Set<string>();
    mission.measurements.forEach(m => {
      if (m.automaticContext && m.automaticContext !== 'unknown') {
        autoContexts.add(m.automaticContext);
      }
    });
    return Array.from(autoContexts).sort();
  }, [mission.measurements]);

  // Count periods for each context type
  const getContextPeriods = (contextType: 'location' | 'activity' | 'auto', value: string) => {
    let periods = 0;
    let inPeriod = false;
    
    mission.measurements.forEach(m => {
      const contextValue = contextType === 'location' ? m.locationContext :
                          contextType === 'activity' ? m.activityContext :
                          m.automaticContext;
      
      if (contextValue === value) {
        if (!inPeriod) {
          periods++;
          inPeriod = true;
        }
      } else {
        inPeriod = false;
      }
    });
    
    return periods;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-lg border">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{t('realTime.location')}</span>
          {selectedLocation && selectedLocation !== 'all' && (
            <Badge variant="outline" className="text-xs">
              {getContextPeriods('location', selectedLocation)} période(s)
            </Badge>
          )}
        </div>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Toutes les localisations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les localisations</SelectItem>
            {availableLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{t('realTime.activity')}</span>
          {selectedActivity && selectedActivity !== 'all' && (
            <Badge variant="outline" className="text-xs">
              {getContextPeriods('activity', selectedActivity)} période(s)
            </Badge>
          )}
        </div>
        <Select value={selectedActivity} onValueChange={onActivityChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Toutes les activités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            {availableActivities.map((activity) => (
              <SelectItem key={activity} value={activity}>
                {activity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>Auto-contexte</span>
          {selectedAutoContext && selectedAutoContext !== 'all' && (
            <Badge variant="outline" className="text-xs">
              {getContextPeriods('auto', selectedAutoContext)} période(s)
            </Badge>
          )}
        </div>
        <Select value={selectedAutoContext} onValueChange={onAutoContextChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Tous les auto-contextes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les auto-contextes</SelectItem>
            {availableAutoContexts.map((autoContext) => (
              <SelectItem key={autoContext} value={autoContext}>
                {autoContext}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}