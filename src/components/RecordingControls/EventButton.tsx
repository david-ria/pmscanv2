import { MapPin, Type, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { EVENT_TYPES } from '@/utils/eventTypes';
import { createTimestamp, formatTime } from '@/utils/timeFormat';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import React from 'react';
import * as logger from '@/utils/logger';

interface EventButtonProps {}

export function EventButton({}: EventButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createEvent, isLoading } = useEvents();
  const { isRecording } = useUnifiedData();
  const { user } = useAuth();
  const { getCurrentEvents, isGroupMode, activeGroup } = useGroupSettings();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<string>('');
  const [comment, setComment] = useState('');

  // Get effective event types (group or default)
  const groupEvents = getCurrentEvents();
  const availableEventTypes = React.useMemo(() => {
    if (isGroupMode && groupEvents.length > 0) {
      // Convert group events to EVENT_TYPES format
      return groupEvents.map((event, index) => ({
        value: event.name.toLowerCase().replace(/\s+/g, '_'),
        label: event.name,
        icon: '📍', // Default icon since GroupEvent doesn't have icon property
      }));
    }
    return EVENT_TYPES;
  }, [isGroupMode, groupEvents]);

  const handleSaveEvent = async () => {
    if (!eventType) {
      toast({
        title: 'Missing Information',
        description: 'Please select an event type.',
        variant: 'destructive'
      });
      return;
    }

    if (!isRecording) {
      toast({
        title: 'No Active Recording',
        description: 'Please start a recording session first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get current location if available
      let latitude: number | undefined;
      let longitude: number | undefined;
      let accuracy: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60000
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
        } catch (error) {
          console.log('Could not get location:', error);
        }
      }

      const eventData = {
        missionId: 'current-recording', // Temporary ID for events during recording
        eventType: eventType,
        comment: comment.trim() || undefined,
        latitude,
        longitude,
        accuracy,
        timestamp: createTimestamp(), // Use standardized timestamp creation
      };

      await createEvent(eventData);

      const selectedEventType = availableEventTypes.find(et => et.value === eventType);
      
      toast({
        title: 'Event Recorded',
        description: `${selectedEventType?.icon} ${selectedEventType?.label} event saved`,
      });

      // Reset form
      setEventType('');
      setComment('');
      setOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleCancel = () => {
    setEventType('');
    setComment('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200',
            'hover:scale-105 active:scale-95 shadow-xl',
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-2xl',
            'touch-manipulation', // Better mobile touch handling
            !isRecording && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!isRecording || isLoading}
          type="button"
        >
          <MapPin className="h-6 w-6" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Record Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Event Type *
            </Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type..." />
              </SelectTrigger>
              <SelectContent>
                {availableEventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comment (Optional)
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any additional details about this event..."
              rows={3}
            />
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs">
              {formatTime(createTimestamp())} • Recording Session
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveEvent} className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}