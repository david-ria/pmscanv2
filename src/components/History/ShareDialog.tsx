import { Mail, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MissionData } from "@/lib/dataStorage";

interface ShareDialogProps {
  mission: MissionData;
  onShare: (mission: MissionData, shareType: 'email' | 'sms' | 'native') => void;
  children: React.ReactNode;
}

export function ShareDialog({ mission, onShare, children }: ShareDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager la mission</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
