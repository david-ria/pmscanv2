import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, X, Settings, QrCode, Loader2 } from 'lucide-react';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { generateGroupUrl } from '@/lib/groupConfigs';
import { generateGroupQRCodeDataURL } from '@/utils/qrCode';
import { useState, useEffect } from 'react';

export const GroupModeIndicator = () => {
  const { activeGroup, isGroupMode, clearGroupSettings } = useGroupSettings();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  if (!isGroupMode || !activeGroup) {
    return null;
  }

  const groupUrl = generateGroupUrl(activeGroup.id, activeGroup.name);

  // Generate QR code when dialog opens
  const handleQRDialogOpen = async () => {
    if (qrCodeDataUrl) return; // Already generated
    
    setIsGeneratingQR(true);
    try {
      const dataUrl = await generateGroupQRCodeDataURL(activeGroup.id, { size: 300 }, activeGroup.name);
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{activeGroup.name}</CardTitle>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={handleQRDialogOpen}
                >
                  <QrCode className="h-3 w-3" />
                  QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Group QR Code</DialogTitle>
                  <DialogDescription>
                    Share this QR code to apply group settings to other devices
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                  {isGeneratingQR ? (
                    <div className="w-64 h-64 border rounded-lg flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Group Settings QR Code"
                      className="w-64 h-64 border rounded-lg"
                    />
                  ) : (
                    <div className="w-64 h-64 border rounded-lg flex items-center justify-center text-muted-foreground">
                      Click to generate QR code
                    </div>
                  )}
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
          <span>Activities: {activeGroup.locations.reduce((total, loc) => total + loc.activities.length, 0)}</span>
          {activeGroup.events.length > 0 && (
            <>
              <span>•</span>
              <span>Events: {activeGroup.events.length}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
