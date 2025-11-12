import { useState } from 'react';
import { Bell, BarChart3, Share2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Group } from '@/hooks/useGroups';
import { GroupCustomThresholdsDialog } from './GroupCustomThresholdsDialog';
import { GroupAlarmsDialog } from './GroupAlarmsDialog';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupMonitoringDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupMonitoringDialog({
  group,
  open,
  onOpenChange,
}: GroupMonitoringDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [alarmsOpen, setAlarmsOpen] = useState(false);
  const [autoShare, setAutoShare] = useState(group.group_settings?.[0]?.auto_share_stats ?? false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleThresholdsClick = () => {
    setThresholdsOpen(true);
  };

  const handleAlarmsClick = () => {
    setAlarmsOpen(true);
  };

  const handleCloseThresholds = () => {
    setThresholdsOpen(false);
  };

  const handleCloseAlarms = () => {
    setAlarmsOpen(false);
  };

  const handleAutoShareToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('group_settings')
        .update({ auto_share_stats: checked })
        .eq('group_id', group.id);

      if (error) throw error;

      setAutoShare(checked);
      toast({
        title: t('groupManagement.monitoring.autoShareUpdated'),
        description: checked 
          ? t('groupManagement.monitoring.autoShareEnabled') 
          : t('groupManagement.monitoring.autoShareDisabled'),
      });
    } catch (error) {
      console.error('Error updating auto-share setting:', error);
      toast({
        title: t('common.error'),
        description: t('groupManagement.monitoring.autoShareError'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('groupManagement.monitoring.title')} - {group.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t('groupManagement.monitoring.description')}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            {/* Auto-share setting */}
            <div className="p-6 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="auto-share" className="font-semibold cursor-pointer">
                      {t('groupManagement.monitoring.autoShareWithGroup')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('groupManagement.monitoring.autoShareDescription')}
                    </p>
                  </div>
                </div>
                <Switch
                  id="auto-share"
                  checked={autoShare}
                  onCheckedChange={handleAutoShareToggle}
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div 
              className="p-6 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleThresholdsClick}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('groupManagement.monitoring.customThresholds')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('groupManagement.monitoring.customThresholdsDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="p-6 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleAlarmsClick}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('groupManagement.monitoring.automatedAlarms')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('groupManagement.monitoring.automatedAlarmsDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <GroupCustomThresholdsDialog
        group={group}
        open={thresholdsOpen}
        onOpenChange={setThresholdsOpen}
      />

      <GroupAlarmsDialog
        groupId={group.id}
        open={alarmsOpen}
        onOpenChange={setAlarmsOpen}
      />
    </>
  );
}