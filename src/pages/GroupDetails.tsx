import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Settings, 
  Bell, 
  MapPin, 
  Calendar,
  UserPlus,
  Crown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useGroups, useGroupMembers } from '@/hooks/useGroups';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { useDialog } from '@/hooks/useDialog';
import { GroupSettingsDialog } from '@/components/Groups/GroupSettingsDialog';
import { GroupCustomThresholdsDialog } from '@/components/Groups/GroupCustomThresholdsDialog';
import { GroupAlarmsDialog } from '@/components/Groups/GroupAlarmsDialog';
import { GroupEventsDialog } from '@/components/Groups/GroupEventsDialog';
import { GroupLocationsDialog } from '@/components/Groups/GroupLocationsDialog';
import { InviteUserDialog } from '@/components/Groups/InviteUserDialog';

export default function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, loading } = useGroups();
  const { isSuperAdmin } = useUserRole();
  const { features } = useSubscription();
  const [group, setGroup] = useState(null);

  // Dialog states
  const settingsDialog = useDialog();
  const thresholdsDialog = useDialog();
  const alarmsDialog = useDialog();
  const eventsDialog = useDialog();
  const locationsDialog = useDialog();
  const inviteDialog = useDialog();

  useEffect(() => {
    if (!loading && groups.length > 0 && groupId) {
      const foundGroup = groups.find(g => g.id === groupId);
      setGroup(foundGroup || null);
    }
  }, [groups, loading, groupId]);

  const { members, loading: membersLoading } = useGroupMembers(group?.id);

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

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-primary text-primary-foreground';
      case 'premium': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
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
            <div>
              <h1 className="text-3xl font-bold">{group.name}</h1>
              <p className="text-muted-foreground mt-1">{group.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getPlanColor(group.subscription_tier || 'free')}>
                {(group.subscription_tier || 'free').toUpperCase()} Plan
              </Badge>
              <Button onClick={inviteDialog.openDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Members</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {membersLoading ? '...' : members.length}
                    </span>
                    {group.member_quota && (
                      <span className="text-muted-foreground">/ {group.member_quota}</span>
                    )}
                  </div>
                  {group.member_quota && (
                    <Progress value={memberUsage} className="h-2" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">Locations</span>
                </div>
                <span className="text-2xl font-bold">
                  {group.custom_locations ? Object.keys(group.custom_locations).length : 0}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Created</span>
                </div>
                <span className="text-lg font-medium">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Management Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Group Management</h2>
          
          <div className="grid gap-4">
            <ManagementOption
              icon={Settings}
              title="General Settings"
              description="Configure group preferences and basic settings"
              onClick={settingsDialog.openDialog}
            />
            
            <ManagementOption
              icon={Bell}
              title="Custom Thresholds"
              description="Set pollution level ranges specific to your group"
              onClick={thresholdsDialog.openDialog}
            />
            
            <ManagementOption
              icon={Bell}
              title="Automated Alarms"
              description="Set up alerts when pollution levels exceed limits"
              onClick={alarmsDialog.openDialog}
              isPremium={true}
              disabled={!features.customAlarms}
            />
            
            <ManagementOption
              icon={MapPin}
              title="Locations & Activities"
              description="Manage group-specific locations and activity types"
              onClick={locationsDialog.openDialog}
            />
            
            <ManagementOption
              icon={Calendar}
              title="Event Configuration"
              description="Configure custom event types for data collection"
              onClick={eventsDialog.openDialog}
              isPremium={true}
              disabled={!features.customAlarms}
            />
          </div>
        </div>

        {/* Members Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Members</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          
          <div className="grid gap-3">
            {membersLoading ? (
              <p className="text-muted-foreground">Loading members...</p>
            ) : (
              members.slice(0, 3).map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {member.profiles?.first_name} {member.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Dialogs */}
        <GroupSettingsDialog
          group={group}
          open={settingsDialog.open}
          onOpenChange={settingsDialog.setOpen}
        />
        
        <GroupCustomThresholdsDialog
          group={group}
          open={thresholdsDialog.open}
          onOpenChange={thresholdsDialog.setOpen}
        />

        <GroupAlarmsDialog
          groupId={group.id}
          open={alarmsDialog.open}
          onOpenChange={alarmsDialog.setOpen}
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
          open={inviteDialog.open}
          onOpenChange={inviteDialog.setOpen}
        />
      </div>
    </div>
  );
}