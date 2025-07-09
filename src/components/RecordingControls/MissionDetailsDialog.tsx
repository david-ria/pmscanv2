import { Save, Share2, Trash2 } from "lucide-react";
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
  onDiscard: () => void;
}

export function MissionDetailsDialog({
  open,
  onOpenChange,
  missionName,
  onMissionNameChange,
  shareData,
  onShareDataChange,
  onConfirm,
  onDiscard
}: MissionDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Save className="h-5 w-5" />
            Finaliser la mission
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mission-name" className="text-sm font-medium">
              Nom de la mission
            </Label>
            <Input
              id="mission-name"
              placeholder="Ex: Mesure qualité air bureau"
              value={missionName}
              onChange={(e) => onMissionNameChange(e.target.value)}
              className="text-base" // Better mobile input size
            />
            <p className="text-xs text-muted-foreground">
              Si vide, utilisera la date et l'heure actuelles
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <Label htmlFor="share-data" className="text-sm font-medium">
                Partager les données
              </Label>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground pr-4">
                Contribuer à la base de données communautaire
              </p>
              <Switch
                id="share-data"
                checked={shareData}
                onCheckedChange={onShareDataChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-12 text-sm"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDiscard}
              className="h-12 text-sm flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
            <Button 
              onClick={onConfirm}
              className="h-12 text-sm"
            >
              Sauver
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}