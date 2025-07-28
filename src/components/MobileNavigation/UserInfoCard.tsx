import { User, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useDialog } from '@/hooks/useDialog';

/**
 * User information card component for mobile navigation
 * 
 * Displays current user information, connection status, and active group
 * when in group mode. Optimized for mobile touch interfaces.
 */
export function UserInfoCard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isGroupMode, activeGroup, clearGroupSettings } = useGroupSettings();
  const leaveGroupDialog = useDialog();

  return (
    <div className="p-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              {isGroupMode ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm">
                {user?.email || t('account.user')}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
              <div className="flex gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {t('account.connected')}
                </Badge>
                {isGroupMode && activeGroup && (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => {
                      console.log('Group badge clicked, opening dialog');
                      leaveGroupDialog.openDialog();
                    }}
                  >
                    {activeGroup.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={leaveGroupDialog.open} onOpenChange={leaveGroupDialog.onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave the group "{activeGroup?.name}" and return to your default settings. 
              This will revert all thresholds, alarms, locations, activities, and events to your personal configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              clearGroupSettings();
              leaveGroupDialog.closeDialog();
            }}>
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
