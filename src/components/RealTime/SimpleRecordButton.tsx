import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleRecordButtonProps {
  onStartRecording: () => void;
  className?: string;
}

export function SimpleRecordButton({ onStartRecording, className }: SimpleRecordButtonProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Start text */}
      <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border shadow-sm">
        <span className="text-sm font-medium text-muted-foreground">
          Start
        </span>
      </div>
      
      {/* Record Button with white circle */}
      <Button
        onClick={onStartRecording}
        size="lg"
        className={`rounded-full h-16 w-16 shadow-lg ${className}`}
      >
        <div className="w-3 h-3 bg-white rounded-full" />
      </Button>
    </div>
  );
}