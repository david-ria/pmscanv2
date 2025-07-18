import { MapPin, Camera, Type, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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

interface EventButtonProps {
  isRecording: boolean;
}

export function EventButton({ isRecording }: EventButtonProps) {
  console.log('🎯 EventButton rendering, isRecording:', isRecording);
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<string>('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please use file upload instead.',
        variant: 'destructive'
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'event-photo.jpg', { type: 'image/jpeg' });
            setPhoto(file);
            setPhotoPreview(canvas.toDataURL());
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEvent = () => {
    if (!eventType) {
      toast({
        title: 'Missing Information',
        description: 'Please select an event type.',
        variant: 'destructive'
      });
      return;
    }

    const eventData = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: eventType,
      comment: comment.trim(),
      photo: photo,
      location: null, // Could be enhanced with GPS coordinates
    };

    // Store the event (this could be enhanced to save to local storage or database)
    const events = JSON.parse(localStorage.getItem('recorded-events') || '[]');
    events.push(eventData);
    localStorage.setItem('recorded-events', JSON.stringify(events));

    const selectedEventType = EVENT_TYPES.find(et => et.value === eventType);
    
    toast({
      title: 'Event Recorded',
      description: `${selectedEventType?.icon} ${selectedEventType?.label} event saved`,
    });

    // Reset form
    setEventType('');
    setComment('');
    setPhoto(null);
    setPhotoPreview('');
    setOpen(false);
    stopCamera();
  };

  const handleCancel = () => {
    setEventType('');
    setComment('');
    setPhoto(null);
    setPhotoPreview('');
    setOpen(false);
    stopCamera();
  };

  return (
    <div>
      <div>DEBUG: EventButton rendered, isRecording: {isRecording.toString()}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2"
            disabled={!isRecording}
          >
            <MapPin className="h-5 w-5" />
          </Button>
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
              <Button onClick={handleSaveEvent} className="flex-1">
                Save Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}