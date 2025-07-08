import { useState } from "react";
import { Play, Square, MapPin, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RecordingControlsProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  className?: string;
}

const locations = [
  "Maison",
  "École",
  "Bureau", 
  "Parc",
  "Rue principale",
  "Transport"
];

const activities = [
  "Marche",
  "Vélo",
  "Transport",
  "Sport",
  "Repos",
  "Travail"
];

export function RecordingControls({ isRecording, onToggleRecording, className }: RecordingControlsProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Recording Control */}
      <div className="flex items-center justify-center">
        <Button
          onClick={onToggleRecording}
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
          {isRecording ? "Enregistrement en cours..." : "Prêt à enregistrer"}
        </Badge>
      </div>

      {/* Context Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Localisation</span>
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un lieu" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Activité</span>
          </div>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir activité" />
            </SelectTrigger>
            <SelectContent>
              {activities.map((activity) => (
                <SelectItem key={activity} value={activity}>
                  {activity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}