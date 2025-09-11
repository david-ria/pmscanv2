import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useGroups, useGroupInvitations } from '@/hooks/useGroups';
import { CreateGroupDialog } from '@/components/Groups/CreateGroupDialog';
import { InviteUserDialog } from '@/components/Groups/InviteUserDialog';
import { GroupCard } from '@/components/Groups/GroupCard';
import { InvitationCard } from '@/components/Groups/InvitationCard';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

export default function Groups() {
  const { groups, loading: groupsLoading } = useGroups();
  const { invitations, loading: invitationsLoading } = useGroupInvitations();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showInvitations, setShowInvitations] = useState(false);
  const { t } = useTranslation();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const handleInviteUser = (groupId: string) => {
    setSelectedGroupId(groupId);
    setInviteUserOpen(true);
  };

  // Show loading while checking role
  if (roleLoading || groupsLoading || invitationsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access control: Only super admin can access Groups
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              Groups functionality is only available to super administrators. 
              Contact your system administrator if you need access.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">
              Manage your air quality monitoring groups
            </p>
          </div>
          <div className="flex gap-3">
            {invitations.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowInvitations(!showInvitations)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Invitations ({invitations.length})
              </Button>
            )}
            <Button onClick={() => setCreateGroupOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Invitations Section (when toggled) */}
        {showInvitations && invitations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          </div>
        )}

        {/* Groups Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            My Groups ({groups.length})
          </h2>
          
          {groups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Create your first group to start collaborating with others on air quality monitoring
                </p>
                <Button onClick={() => setCreateGroupOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onInviteUser={() => handleInviteUser(group.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
      />

      <InviteUserDialog
        open={inviteUserOpen}
        onOpenChange={setInviteUserOpen}
        groupId={selectedGroupId}
      />
    </div>
  );
}
