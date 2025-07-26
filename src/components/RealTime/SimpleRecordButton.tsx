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
      className={`rounded-full h-16 w-16 bg-green-500 hover:bg-green-600 p-0 ${className}`}
    >
      <div className="w-4 h-4 bg-white rounded-full" />
    </Button>
  );
}