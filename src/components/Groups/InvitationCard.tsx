import { useState } from 'react';
import { Check, X, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGroupInvitations, GroupInvitation } from '@/hooks/useGroups';
import { formatDistanceToNow } from 'date-fns';

interface InvitationCardProps {
  invitation: GroupInvitation;
}

export function InvitationCard({ invitation }: InvitationCardProps) {
  const { acceptInvitation, declineInvitation } = useGroupInvitations();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptInvitation(invitation.token);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await declineInvitation(invitation.token);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsDeclining(false);
    }
  };

  const inviterName = invitation.inviter_profile?.pseudo ||
    `${invitation.inviter_profile?.first_name || ''} ${invitation.inviter_profile?.last_name || ''}`.trim() ||
    'Unknown User';

  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {invitation.group?.name}
            </CardTitle>
            <CardDescription>
              Invited by {inviterName}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expires {expiresIn}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitation.group?.description && (
          <p className="text-sm text-muted-foreground">
            {invitation.group.description}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1 gap-2"
          >
            <Check className="h-4 w-4" />
            {isAccepting ? 'Accepting...' : 'Accept'}
          </Button>
          <Button
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            variant="outline"
            className="flex-1 gap-2"
          >
            <X className="h-4 w-4" />
            {isDeclining ? 'Declining...' : 'Decline'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}