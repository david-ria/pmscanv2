import { Play } from 'lucide-react';
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
      className={`rounded-full h-16 w-16 bg-primary text-primary-foreground hover:bg-primary/90 p-0 shadow-xl hover:shadow-2xl transition-all duration-200 ${className}`}
    >
      <div className="w-4 h-4 bg-background rounded-full" />
    </Button>
  );
}