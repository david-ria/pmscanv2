import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Users, X, Settings, QrCode } from 'lucide-react';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useDialog } from '@/hooks/useDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { generateGroupUrl } from '@/lib/groupConfigs';

export const GroupModeIndicator = () => {
  const { activeGroup, isGroupMode, clearGroupSettings } = useGroupSettings();
  const leaveGroupDialog = useDialog();

  if (!isGroupMode || !activeGroup) {
    return null;
  }

  const groupUrl = generateGroupUrl(activeGroup.id);

  const generateQRCode = () => {
    // Simple QR code generation using qr-server.com API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(groupUrl)}`;
    return qrUrl;
  };

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle 
                className="text-base cursor-pointer hover:text-primary transition-colors"
                onClick={leaveGroupDialog.openDialog}
              >
                {activeGroup.name}
              </CardTitle>
              {activeGroup.description && (
                <CardDescription className="text-sm">
                  {activeGroup.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Settings className="h-3 w-3" />
              Group Mode
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <QrCode className="h-3 w-3" />
                  QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" hideTitle={false} hideDescription={false}>
                <DialogHeader>
                  <DialogTitle>Group QR Code</DialogTitle>
                  <DialogDescription>
                    Share this QR code to apply group settings to other devices
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                  <img
                    src={generateQRCode()}
                    alt="Group Settings QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">{activeGroup.name}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {groupUrl}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={clearGroupSettings}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Exit
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Thresholds: {activeGroup.thresholds.length}</span>
          <span>•</span>
          <span>Alarms: {activeGroup.alarms.length}</span>
          <span>•</span>
          <span>Locations: {activeGroup.locations.length}</span>
          <span>•</span>
          <span>Activities: {activeGroup.activities.length}</span>
          {activeGroup.events.length > 0 && (
            <>
              <span>•</span>
              <span>Events: {activeGroup.events.length}</span>
            </>
          )}
        </div>
      </CardContent>

      <AlertDialog open={leaveGroupDialog.open} onOpenChange={leaveGroupDialog.onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave the group "{activeGroup.name}" and return to your default settings. 
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
    </Card>
  );
};
