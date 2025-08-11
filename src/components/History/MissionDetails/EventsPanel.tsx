import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEventLabel } from '@/utils/eventTypes';
import { 
  Calendar, 
  MapPin, 
  Cigarette, 
  Truck, 
  Car, 
  Hammer, 
  Flame, 
  Wind, 
  Factory, 
  ChefHat,
  AlertCircle
} from 'lucide-react';

interface EventsPanelProps {
  events: any[];
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'smoker': return <Cigarette className="h-4 w-4 text-red-500" />;
    case 'truck': return <Truck className="h-4 w-4 text-blue-500" />;
    case 'traffic': return <Car className="h-4 w-4 text-yellow-500" />;
    case 'construction': return <Hammer className="h-4 w-4 text-orange-500" />;
    case 'fire': return <Flame className="h-4 w-4 text-red-500" />;
    case 'dust': return <Wind className="h-4 w-4 text-gray-500" />;
    case 'industrial': return <Factory className="h-4 w-4 text-purple-500" />;
    case 'cooking': return <ChefHat className="h-4 w-4 text-green-500" />;
    default: return <AlertCircle className="h-4 w-4 text-blue-500" />;
  }
};

export const EventsPanel = memo<EventsPanelProps>(({ events }) => {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recorded Events ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.id || index} className="border rounded-lg p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getEventIcon(event.eventType)}
                  <span className="font-medium">
                    {getEventLabel(event.eventType)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Badge>
              </div>
              {event.comment && (
                <p className="text-sm text-muted-foreground pl-6">{event.comment}</p>
              )}
              {event.latitude && event.longitude && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pl-6">
                  <MapPin className="h-3 w-3" />
                  <span>{event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

EventsPanel.displayName = 'EventsPanel';