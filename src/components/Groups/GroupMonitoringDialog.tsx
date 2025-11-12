import { useState } from 'react';
import { Bell, BarChart3 } from 'lucide-react';
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
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [alarmsOpen, setAlarmsOpen] = useState(false);

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