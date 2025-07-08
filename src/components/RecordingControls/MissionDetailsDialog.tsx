import { Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MissionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionName: string;
  onMissionNameChange: (name: string) => void;
  shareData: boolean;
  onShareDataChange: (share: boolean) => void;
  onConfirm: () => void;
}

export function MissionDetailsDialog({
  open,
  onOpenChange,
  missionName,
  onMissionNameChange,
  shareData,
  onShareDataChange,
  onConfirm
}: MissionDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onMissionNameChange(e.target.value)}
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
              onCheckedChange={onShareDataChange}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1"
            >
              {shareData ? "Sauvegarder et partager" : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}