import { Play, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { frequencyOptions } from "@/lib/recordingConstants";

interface RecordingButtonProps {
  isRecording: boolean;
  onClick: () => void;
  recordingFrequency: string;
}

export function RecordingButton({ isRecording, onClick, recordingFrequency }: RecordingButtonProps) {
  return (
    <div className="space-y-4">
      {/* Recording Control */}
      <div className="flex items-center justify-center">
        <Button
          onClick={onClick}
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className={cn(
            "h-16 w-16 rounded-full",
            isRecording && "animate-pulse"
          )}
        >
          {isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Status */}
      <div className="text-center">
        <Badge variant={isRecording ? "destructive" : "secondary"} className="text-sm">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span>Enregistrement en cours</span>
              <Clock className="h-3 w-3" />
              <span>{frequencyOptions.find(f => f.value === recordingFrequency)?.label}</span>
            </div>
          ) : (
            "Prêt à enregistrer"
          )}
        </Badge>
      </div>
    </div>
  );
}