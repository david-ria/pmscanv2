import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Activity, Play, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function GroupWelcome() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();
  const { applyGroupById, isGroupMode, activeGroup } = useGroupSettings();
  const [isApplying, setIsApplying] = useState(false);

  // Find the group by resolving the groupId parameter
  const group = groups.find(g => {
    if (!groupId) return false;
    
    // Try exact UUID match
    if (g.id === groupId) return true;
    
    // Try slug match (name-8chars)
    const slug = `${g.name.toLowerCase().replace(/\s+/g, '-')}-${g.id.substring(0, 8)}`;
    if (slug === groupId) return true;
    
    // Try partial UUID match (first 8 chars)
    if (g.id.startsWith(groupId) && groupId.length >= 8) return true;
    
    return false;
  });

  // Check if user is already a member
  const isMember = group && activeGroup?.id === group.id;

  useEffect(() => {
    // If group is not found and groups have loaded, show error
    if (!groupsLoading && !group && groupId) {
      toast.error('Group not found or you do not have access');
    }
  }, [group, groupsLoading, groupId]);

  const handleStartRecording = async () => {
    if (!group) return;
    
    setIsApplying(true);
    try {
      // Apply the group settings
      await applyGroupById(group.id);
      
      toast.success(`Switched to ${group.name} group`);
      
      // Navigate to the RealTime page to start recording
      navigate('/');
    } catch (error) {
      console.error('Failed to apply group settings:', error);
      toast.error('Failed to activate group. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleViewGroupSettings = () => {
    if (!group) return;
    navigate(`/groups/${group.id}`);
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to join this group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please log in or create an account to access this group and start recording data.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Log In / Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (groupsLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Group Not Found
            </CardTitle>
            <CardDescription>
              This group doesn't exist or you don't have access to it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The group you're trying to access may have been deleted, or you may not have permission to view it.
            </p>
            <Button onClick={() => navigate('/groups')} className="w-full">
              View My Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Welcome to {group.name}
          </CardTitle>
          {group.description && (
            <CardDescription className="text-base">
              {group.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h3 className="font-medium">Locations</h3>
                <p className="text-sm text-muted-foreground">
                  {group.custom_locations ? 
                    `${Object.keys(group.custom_locations).length} custom locations configured` : 
                    'Use your personal locations'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Activity className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h3 className="font-medium">Activities</h3>
                <p className="text-sm text-muted-foreground">
                  {group.custom_activities ? 
                    `${Object.keys(group.custom_activities).length} custom activities configured` : 
                    'Use your personal activities'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {isMember && isGroupMode ? (
              <>
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue Recording
                </Button>
                <Button 
                  onClick={handleViewGroupSettings}
                  variant="outline"
                  className="w-full"
                >
                  View Group Settings
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleStartRecording}
                  disabled={isApplying}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isApplying ? 'Activating Group...' : 'Start Recording with This Group'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  This will activate the group's locations, activities, and settings for your recording session
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
