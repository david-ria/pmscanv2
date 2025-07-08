import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { frequencyOptions } from "@/lib/recordingConstants";

interface RecordingFrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  onConfirm: () => void;
}

export function RecordingFrequencyDialog({
  open,
  onOpenChange,
  recordingFrequency,
  onFrequencyChange,
  onConfirm
}: RecordingFrequencyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fréquence d'enregistrement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Choisissez la fréquence de mesure :</Label>
          <Select value={recordingFrequency} onValueChange={onFrequencyChange}>
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
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1"
            >
              Démarrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}