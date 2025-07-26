import { Play, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleRecordButtonProps {
  onStartRecording: () => void;
  className?: string;
}

export function SimpleRecordButton({ onStartRecording, className }: SimpleRecordButtonProps) {
  return (
    <Button
      onClick={onStartRecording}
      size="lg"
      className={`rounded-full h-16 w-16 shadow-lg relative ${className}`}
    >
      {/* Record icon overlay */}
      <div className="absolute inset-0 rounded-full flex items-center justify-center">
        <Circle 
          className="h-8 w-8 text-primary-foreground/30" 
          fill="currentColor" 
        />
        <div className="absolute h-3 w-3 rounded-full bg-primary-foreground" />
      </div>
      
      {/* Play icon */}
      <div className="relative z-10">
        <Play className="h-6 w-6" />
      </div>
    </Button>
  );
}