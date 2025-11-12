import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Bell, 
  MapPin, 
  Calendar,
  UserPlus,
  Crown,
  ChevronRight,
  Edit3,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { useGroups, useGroupMembers } from '@/hooks/useGroups';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { useDialog } from '@/hooks/useDialog';
import { useAuth } from '@/contexts/AuthContext';

import { GroupMonitoringDialog } from '@/components/Groups/GroupMonitoringDialog';
import { GroupEventsDialog } from '@/components/Groups/GroupEventsDialog';
import { GroupLocationsDialog } from '@/components/Groups/GroupLocationsDialog';
import { EditGroupDialog } from '@/components/Groups/EditGroupDialog';
import { InviteUserDialog } from '@/components/Groups/InviteUserDialog';
import { GroupSubscriptionDialog } from '@/components/Groups/GroupSubscriptionDialog';
import { GroupLogoUpload } from '@/components/Groups/GroupLogoUpload';

export default function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, loading } = useGroups();
  const { isSuperAdmin } = useUserRole();
  const { features } = useSubscription();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Dialog states
  const monitoringDialog = useDialog();
  const eventsDialog = useDialog();
  const locationsDialog = useDialog();
  const editDialog = useDialog();
  const inviteDialog = useDialog();
  const subscriptionDialog = useDialog();

  useEffect(() => {
    if (!loading && groups.length > 0 && groupId) {
      // Try to find group by exact ID match first
      let foundGroup = groups.find(g => g.id === groupId);
      
      // If not found and it's a slug format, try to match by name or partial UUID
      if (!foundGroup && groupId) {
        // Check if it's a name-based slug
        if (!groupId.includes('-') || groupId.split('-').length < 5) {
          // Try to find by name (convert back from slug)
          const nameFromSlug = groupId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          foundGroup = groups.find(g => 
            g.name.toLowerCase() === nameFromSlug.toLowerCase() ||
            g.name.toLowerCase().replace(/\s+/g, '-') === groupId.toLowerCase()
          );
          
          // If still not found, try partial UUID match
          if (!foundGroup) {
            const parts = groupId.split('-');
            const lastPart = parts[parts.length - 1];
            if (/^[0-9a-f]{8}$/i.test(lastPart)) {
              foundGroup = groups.find(g => g.id.startsWith(lastPart));
            }
          }
        }
      }
      
      setGroup(foundGroup || null);
    }
  }, [groups, loading, groupId]);

  const { members, loading: membersLoading, removeMember } = useGroupMembers(group?.id);

  // Show loading state
  if (loading || (!group && !loading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/groups')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </div>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  // Group not found
  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/groups')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </div>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
            <p className="text-muted-foreground">
              The group you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check permissions
  const isGroupAdmin = group.role === 'admin';
  const hasAccess = isGroupAdmin || isSuperAdmin;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/groups')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </div>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to manage this group.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const memberUsage = group.member_quota 
    ? Math.round((members.length / group.member_quota) * 100)
    : 0;

  const handleLogoUpdate = (logoUrl: string) => {
    setGroup({ ...group, logo_url: logoUrl });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      await removeMember(memberToRemove);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const ManagementOption = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick, 
    isPremium = false,
    disabled = false 
  }: {
    icon: any;
    title: string;
    description: string;
    onClick: () => void;
    isPremium?: boolean;
    disabled?: boolean;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{title}</h3>
                {isPremium && !features.customAlarms && (
                  <Crown className="h-4 w-4 text-accent" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {!disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>

        {/* Group Overview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={editDialog.openDialog}
                  className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground">{group.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{membersLoading ? '...' : members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                </div>
                {group.custom_locations && Object.keys(group.custom_locations).length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{Object.keys(group.custom_locations).length} location{Object.keys(group.custom_locations).length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GroupLogoUpload
                groupId={group.id}
                currentLogoUrl={group.logo_url}
                onLogoUpdate={handleLogoUpdate}
              />
              <Button onClick={inviteDialog.openDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Management Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Group Management</h2>
          
          <div className="grid gap-4">            
            <ManagementOption
              icon={Bell}
              title="Monitoring Settings"
              description="Manage pollution thresholds and automated alerts"
              onClick={monitoringDialog.openDialog}
            />
            
            <ManagementOption
              icon={MapPin}
              title="Locations & Activities"
              description="Configure custom locations and activity types for your group"
              onClick={locationsDialog.openDialog}
            />
            
            <ManagementOption
              icon={Calendar}
              title="Event Types"
              description="Create custom event types for enhanced data collection"
              onClick={eventsDialog.openDialog}
              isPremium={true}
              disabled={!features.customAlarms}
            />
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Members</h2>
          
          <div className="grid gap-3">
            {membersLoading ? (
              <p className="text-muted-foreground">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground">No members yet</p>
            ) : (
              members.map((member) => {
                const displayName = member.profiles?.pseudo || 
                  `${member.profiles?.first_name || ''} ${member.profiles?.last_name || ''}`.trim() ||
                  'Unknown User';
                
                const canRemove = hasAccess && member.user_id !== user?.id && member.user_id !== group.created_by;
                
                return (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{displayName}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                            {member.last_active && (
                              <>
                                <span>•</span>
                                <span>Last active {new Date(member.last_active).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToRemove(member.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <EditGroupDialog
          group={group}
          open={editDialog.open}
          onOpenChange={editDialog.setOpen}
        />

        <GroupMonitoringDialog
          group={group}
          open={monitoringDialog.open}
          onOpenChange={monitoringDialog.setOpen}
        />

        <GroupEventsDialog
          groupId={group.id}
          open={eventsDialog.open}
          onOpenChange={eventsDialog.setOpen}
        />

        <GroupLocationsDialog
          groupId={group.id}
          open={locationsDialog.open}
          onOpenChange={locationsDialog.setOpen}
        />

        <InviteUserDialog
          groupId={group.id}
          groupName={group.name}
          open={inviteDialog.open}
          onOpenChange={inviteDialog.setOpen}
        />

        <GroupSubscriptionDialog
          group={group}
          open={subscriptionDialog.open}
          onOpenChange={subscriptionDialog.setOpen}
        />

        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this member from the group? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}