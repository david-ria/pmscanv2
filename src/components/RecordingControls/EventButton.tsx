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
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
  { value: 'smoker', label: 'Smoker', icon: '🚬' },
  { value: 'truck', label: 'Truck', icon: '🚛' },
  { value: 'traffic', label: 'Heavy Traffic', icon: '🚗' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'fire', label: 'Fire/Smoke', icon: '🔥' },
  { value: 'dust', label: 'Dust', icon: '💨' },
  { value: 'industrial', label: 'Industrial Activity', icon: '🏭' },
  { value: 'cooking', label: 'Cooking/BBQ', icon: '🔥' },
  { value: 'other', label: 'Other', icon: '📍' }
];

interface EventButtonProps {}

export function EventButton({}: EventButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createEvent, isLoading } = useEvents();
  const { isRecording, currentMissionId } = useRecordingContext();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<string>('');
  const [comment, setComment] = useState('');

  console.log('🎯 EventButton rendering, isRecording:', isRecording);


  const handleSaveEvent = async () => {
    if (!eventType) {
      toast({
        title: 'Missing Information',
        description: 'Please select an event type.',
        variant: 'destructive'
      });
      return;
    }

    if (!currentMissionId) {
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
        mission_id: currentMissionId,
        event_type: eventType,
        comment: comment.trim() || undefined,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      };

      await createEvent(eventData);

      const selectedEventType = EVENT_TYPES.find(et => et.value === eventType);
      
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
            'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-2xl',
            !isRecording && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!isRecording || isLoading}
          type="button"
        >
          <MapPin className="h-6 w-6" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                {EVENT_TYPES.map((type) => (
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
              {new Date().toLocaleTimeString()} • Recording Session
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