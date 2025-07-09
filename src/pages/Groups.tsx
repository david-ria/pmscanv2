import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Settings, UserPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups, useGroupInvitations } from '@/hooks/useGroups';
import { CreateGroupDialog } from '@/components/Groups/CreateGroupDialog';
import { InviteUserDialog } from '@/components/Groups/InviteUserDialog';
import { GroupCard } from '@/components/Groups/GroupCard';
import { InvitationCard } from '@/components/Groups/InvitationCard';

export default function Groups() {
  const { groups, loading: groupsLoading } = useGroups();
  const { invitations, loading: invitationsLoading } = useGroupInvitations();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const { t } = useTranslation();

  const handleInviteUser = (groupId: string) => {
    setSelectedGroupId(groupId);
    setInviteUserOpen(true);
  };

  if (groupsLoading || invitationsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('groups.title')}</h1>
          <p className="text-muted-foreground">
            {t('groups.subtitle')}
          </p>
        </div>
        <Button onClick={() => setCreateGroupOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('groups.createGroup')}
        </Button>
      </div>

      <Tabs defaultValue="my-groups" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-groups" className="gap-2">
            <Users className="h-4 w-4" />
            {t('groups.myGroups')} ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            {t('groups.invitations')} ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups" className="space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('groups.noGroupsYet')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('groups.createFirstGroup')}
                </p>
                <Button onClick={() => setCreateGroupOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('groups.createYourFirstGroup')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onInviteUser={() => handleInviteUser(group.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('groups.noPendingInvitations')}</h3>
                <p className="text-muted-foreground text-center">
                  {t('groups.invitationsDescription')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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