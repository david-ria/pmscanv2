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
  const handleClick = () => {
    console.log("🚨 BUTTON CLICKED - RecordingButton");
    console.log("Current isRecording state:", isRecording);
    onClick();
  };

  return (
    <div className="space-y-4">
      {/* Recording Control */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleClick}
          className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200",
            "hover:scale-105 active:scale-95",
            isRecording 
              ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg" 
              : "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
          )}
          type="button"
        >
          {isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </button>
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