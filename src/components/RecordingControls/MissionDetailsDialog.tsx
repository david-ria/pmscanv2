import { Save, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';

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
  onDiscard,
}: MissionDetailsDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none translate-y-[-25%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Save className="h-5 w-5" />
            {t('modals.missionDetails.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mission-name" className="text-sm font-medium">
              {t('modals.missionDetails.missionName')}
            </Label>
            <Input
              id="mission-name"
              placeholder={t('modals.missionDetails.placeholder')}
              value={missionName}
              onChange={(e) => onMissionNameChange(e.target.value)}
              className="text-base" // Better mobile input size
            />
            <p className="text-xs text-muted-foreground">
              {t('modals.missionDetails.emptyWillUseDateTime')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <Label htmlFor="share-data" className="text-sm font-medium">
                {t('modals.missionDetails.shareData')}
              </Label>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground pr-4">
                {t('modals.missionDetails.contributeToDatabase')}
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
              {t('modals.missionDetails.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={onDiscard}
              className="h-12 text-sm flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('modals.missionDetails.delete')}
            </Button>
            <Button onClick={onConfirm} className="h-12 text-sm">
              {t('modals.missionDetails.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
