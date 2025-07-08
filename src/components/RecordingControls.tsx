import { useState } from "react";
import { Play, Square, MapPin, Activity, Clock, Share2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState<string>("30s");
  const [missionName, setMissionName] = useState<string>("");
  const [shareData, setShareData] = useState<boolean>(false);
  const { toast } = useToast();

  const frequencyOptions = [
    { value: "10s", label: "Toutes les 10 secondes" },
    { value: "30s", label: "Toutes les 30 secondes" },
    { value: "1m", label: "Toutes les minutes" },
    { value: "5m", label: "Toutes les 5 minutes" },
    { value: "10m", label: "Toutes les 10 minutes" },
    { value: "continuous", label: "Continu" }
  ];

  const handleStartRecording = () => {
    setShowFrequencyDialog(true);
  };

  const confirmStartRecording = () => {
    setShowFrequencyDialog(false);
    onToggleRecording();
    toast({
      title: "Enregistrement démarré",
      description: `Fréquence: ${frequencyOptions.find(f => f.value === recordingFrequency)?.label}`,
    });
  };

  const handleStopRecording = () => {
    setShowMissionDialog(true);
  };

  const confirmStopRecording = () => {
    let finalMissionName = missionName.trim();
    
    // If no mission name provided, use current date and time
    if (!finalMissionName) {
      const now = new Date();
      finalMissionName = `Mission ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    setShowMissionDialog(false);
    onToggleRecording();
    
    toast({
      title: "Mission sauvegardée",
      description: `"${finalMissionName}" ${shareData ? "sera partagée" : "stockée localement"}`,
    });

    // Reset form
    setMissionName("");
    setShareData(false);
  };

  const handleRecordingClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Recording Control */}
      <div className="flex items-center justify-center">
        <Button
          onClick={handleRecordingClick}
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

      {/* Context Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Localisation (optionnel)</span>
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Aucune localisation" />
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
            <span>Activité (optionnel)</span>
            {isRecording && selectedActivity && (
              <Badge variant="outline" className="text-xs">
                {selectedActivity}
              </Badge>
            )}
          </div>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger>
              <SelectValue placeholder="Aucune activité" />
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

      {/* Frequency Selection Dialog */}
      <Dialog open={showFrequencyDialog} onOpenChange={setShowFrequencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Fréquence d'enregistrement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Choisissez la fréquence de mesure :</Label>
            <Select value={recordingFrequency} onValueChange={setRecordingFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowFrequencyDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmStartRecording}
                className="flex-1"
              >
                Démarrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mission Details Dialog */}
      <Dialog open={showMissionDialog} onOpenChange={setShowMissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Finaliser la mission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mission-name">Nom de la mission</Label>
              <Input
                id="mission-name"
                placeholder="Ex: Mesure qualité air bureau"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Si vide, utilisera la date et l'heure actuelles
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="share-data" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Partager les données
                </Label>
                <p className="text-sm text-muted-foreground">
                  Contribuer à la base de données communautaire
                </p>
              </div>
              <Switch
                id="share-data"
                checked={shareData}
                onCheckedChange={setShareData}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowMissionDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmStopRecording}
                className="flex-1"
              >
                {shareData ? "Sauvegarder et partager" : "Sauvegarder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}