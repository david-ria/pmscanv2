import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  Users, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  Bell,
  Crown,
  QrCode,
  UserPlus
} from 'lucide-react';
import { useGroups, type Group } from '@/hooks/useGroups';
import { useSubscription } from '@/hooks/useSubscription';
import { useGroupMembers } from '@/hooks/useGroups';

import { GroupCustomThresholdsDialog } from './GroupCustomThresholdsDialog';
import { GroupAlarmsDialog } from './GroupAlarmsDialog';
import { GroupEventsDialog } from './GroupEventsDialog';
import { GroupLocationsDialog } from './GroupLocationsDialog';
import { InviteUserDialog } from './InviteUserDialog';
import { useDialog } from '@/hooks/useDialog';

interface GroupAdminDashboardProps {
  group: Group;
}

export function GroupAdminDashboard({ group }: GroupAdminDashboardProps) {
  const { features } = useSubscription();
  const { members, loading: membersLoading } = useGroupMembers(group.id);
  
  // Dialog states
  const thresholdsDialog = useDialog();
  const alarmsDialog = useDialog();
  const eventsDialog = useDialog();
  const locationsDialog = useDialog();
  const inviteDialog = useDialog();

  const memberUsage = group.member_quota 
    ? Math.round((members.length / group.member_quota) * 100)
    : 0;

  const getSubscriptionBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-primary text-primary-foreground';
      case 'premium': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const FeatureCard = ({ 
    title, 
    description, 
    icon: Icon, 
    onManage, 
    disabled = false,
    isPremium = false 
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onManage: () => void;
    disabled?: boolean;
    isPremium?: boolean;
  }) => (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-primary" />
          {isPremium && !features.customAlarms && (
            <Crown className="h-4 w-4 text-accent" />
          )}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onManage}
          disabled={disabled || (isPremium && !features.customAlarms)}
          className="w-full"
          variant={disabled ? "outline" : "default"}
        >
          {isPremium && !features.customAlarms ? 'Upgrade Required' : 'Manage'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">{group.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getSubscriptionBadgeColor(group.subscription_tier || 'free')}>
            {(group.subscription_tier || 'free').toUpperCase()}
          </Badge>
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Share Group
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Members</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {membersLoading ? '...' : members.length}
              {group.member_quota && (
                <span className="text-lg text-muted-foreground">
                  /{group.member_quota}
                </span>
              )}
            </p>
            {group.member_quota && (
              <Progress value={memberUsage} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Locations</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {group.custom_locations ? Object.keys(group.custom_locations).length : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Created</span>
            </div>
            <p className="text-sm font-medium mt-2">
              {new Date(group.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="alarms">Alarms</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <p className="text-muted-foreground">Basic group settings are managed through the group overview page.</p>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Group Members</h3>
            <Button onClick={inviteDialog.openDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
          
          <div className="grid gap-4">
            {membersLoading ? (
              <p>Loading members...</p>
            ) : (
              members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.profiles?.first_name} {member.profiles?.last_name}</p>
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
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <FeatureCard
            title="Custom Thresholds"
            description="Define pollution level ranges for your group"
            icon={AlertTriangle}
            onManage={thresholdsDialog.openDialog}
          />
        </TabsContent>

        <TabsContent value="alarms" className="space-y-4">
          <FeatureCard
            title="Custom Alarms"
            description="Set up automated alerts for pollution levels"
            icon={Bell}
            onManage={alarmsDialog.openDialog}
            isPremium={true}
          />
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <FeatureCard
            title="Locations & Activities"
            description="Manage group-specific locations and activities"
            icon={MapPin}
            onManage={locationsDialog.openDialog}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <FeatureCard
            title="Event Types"
            description="Configure custom event types for data collection"
            icon={Calendar}
            onManage={eventsDialog.openDialog}
            isPremium={true}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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
        groupName={group.name}
        open={inviteDialog.open}
        onOpenChange={inviteDialog.setOpen}
      />
    </div>
  );
}