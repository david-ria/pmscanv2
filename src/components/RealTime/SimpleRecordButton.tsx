import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleRecordButtonProps {
  onStartRecording: () => void;
  className?: string;
}

export function SimpleRecordButton({ onStartRecording, className }: SimpleRecordButtonProps) {
  return (
    <div className="relative">
      <Button
        onClick={onStartRecording}
        size="lg"
        className={`rounded-full h-16 w-16 shadow-lg ${className}`}
      >
        <Play className="h-6 w-6" />
      </Button>
      {/* Simple arrow pointer */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-primary">
        <div className="w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-primary"></div>
      </div>
    </div>
  );
}