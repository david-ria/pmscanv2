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
      className={`rounded-full h-16 w-16 shadow-lg ${className}`}
    >
      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
    </Button>
  );
}