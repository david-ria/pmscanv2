import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { frequencyOptionKeys } from "@/lib/recordingConstants";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('modals.recordingFrequency.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>{t('modals.recordingFrequency.chooseMeasureFrequency')}</Label>
          <Select value={recordingFrequency} onValueChange={onFrequencyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptionKeys.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`modals.frequency.${option.key}`)}
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
              {t('modals.recordingFrequency.cancel')}
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1"
            >
              {t('modals.recordingFrequency.start')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}