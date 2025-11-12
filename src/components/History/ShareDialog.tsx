import React from 'react';
import { Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { MissionData } from '@/lib/dataStorage';

interface ShareDialogProps {
  mission: MissionData;
  onShare: (
    mission: MissionData,
    shareType: 'email' | 'sms' | 'native'
  ) => void;
  children: React.ReactNode;
}

export function ShareDialog({ mission, onShare, children }: ShareDialogProps) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Partager la mission</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onShare(mission, 'email')}
            className="justify-start"
          >
            <Mail className="h-4 w-4 mr-2" />
            Partager par email
          </Button>
          <Button
            variant="outline"
            onClick={() => onShare(mission, 'sms')}
            className="justify-start"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Partager par SMS
          </Button>
          {navigator.share && (
            <Button
              variant="outline"
              onClick={() => onShare(mission, 'native')}
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Partager (options du téléphone)
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
