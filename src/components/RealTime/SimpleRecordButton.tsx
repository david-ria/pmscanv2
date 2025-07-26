import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleRecordButtonProps {
  onStartRecording: () => void;
  className?: string;
}

export function SimpleRecordButton({ onStartRecording, className }: SimpleRecordButtonProps) {
  return (
    <button
      onClick={onStartRecording}
      className={`rounded-full h-16 w-16 shadow-lg bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors ${className}`}
    >
      <div className="w-4 h-4 bg-white dark:bg-black rounded-full" />
    </button>
  );
}