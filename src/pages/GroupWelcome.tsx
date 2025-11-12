import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Activity, Play, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { joinGroupByToken } from '@/utils/invitations';

export default function GroupWelcome() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, loading: groupsLoading, refetch } = useGroups();
  const { applyGroupById, isGroupMode, activeGroup } = useGroupSettings();
  const [isApplying, setIsApplying] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [fallbackGroupName, setFallbackGroupName] = useState<string | null>(null);
  
  const joinToken = searchParams.get('join');

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
  const isMember = group && groups.some(g => g.id === group.id);

  // Helper function to extract group name from URL slug
  const extractGroupNameFromSlug = (slug: string): string => {
    // Slug format: "citiobs-e1057479" or just "e1057479-4f30-4d27-8686-9704c2558a70"
    // Extract the part before the last dash-8chars pattern
    const parts = slug.split('-');
    
    // If it's just a UUID, return a generic name
    if (parts.length <= 5 && slug.match(/^[a-f0-9-]+$/i)) {
      return 'Group';
    }
    
    // Otherwise, take all parts except the last UUID part (8 chars)
    const nameParts = parts.slice(0, -1);
    const nameSlug = nameParts.join('-');
    
    // Convert slug to readable name (capitalize each word)
    return nameSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle join token flow
  useEffect(() => {
    const handleJoinFlow = async () => {
      // If no user and we have a join token, redirect to auth with return path
      if (!user && joinToken) {
        console.debug('🔐 [GroupWelcome] Redirecting to auth with join token');
        // Extract group name from URL if available, or use fallbackGroupName
        const groupNameForAuth = fallbackGroupName || group?.name || (groupId ? extractGroupNameFromSlug(groupId) : undefined);
        const returnPath = `/groups/${groupId}/welcome?join=${joinToken}`;
        const authUrl = groupNameForAuth 
          ? `/auth?redirect=${encodeURIComponent(returnPath)}&groupName=${encodeURIComponent(groupNameForAuth)}`
          : `/auth?redirect=${encodeURIComponent(returnPath)}`;
        navigate(authUrl);
        return;
      }

      // If user is authenticated and we have a join token, process it
      if (user && joinToken && !isJoining && !groupsLoading) {
        setIsJoining(true);
        try {
          console.debug('🚀 [GroupWelcome] Invoking joinGroupByToken with token:', joinToken);
          const result = await joinGroupByToken(joinToken);
          console.debug('✅ [GroupWelcome] Join successful:', result);
          
          // Store group name as fallback in case group isn't in list yet
          if (result.groupName) {
            setFallbackGroupName(result.groupName);
          }
          
          if (result.alreadyMember) {
            toast.success(`Already a member of ${result.groupName || 'the group'}`);
          } else {
            toast.success(`Successfully joined ${result.groupName || 'the group'}!`);
          }
          
          console.debug('🔄 [GroupWelcome] Refetching groups...');
          await refetch();
          console.debug('✅ [GroupWelcome] Groups refetched');
          
          // Poll for the group to appear in the list (up to 10 attempts, ~300ms each)
          console.debug('🔍 [GroupWelcome] Polling for group in list...');
          let foundInList = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            await refetch(); // Refetch on each attempt
            const currentGroups = groups; // This will be stale, but applyGroupById will check fresh
            if (currentGroups.some(g => g.id === result.groupId)) {
              console.debug(`✅ [GroupWelcome] Group found in list after ${attempt + 1} attempts`);
              foundInList = true;
              break;
            }
            console.debug(`⏳ [GroupWelcome] Attempt ${attempt + 1}/10: Group not in list yet`);
          }
          
          if (!foundInList) {
            console.debug('⚠️ [GroupWelcome] Group not found after polling, will use fallback');
          }
          
          // Apply group settings (with fallback if needed)
          console.debug('🎯 [GroupWelcome] Applying group settings for:', result.groupId);
          const applySuccess = await applyGroupById(result.groupId);
          
          if (!applySuccess) {
            console.error('❌ [GroupWelcome] Failed to apply group settings');
            toast.error('Failed to activate group settings. Please try refreshing the page.');
            setIsJoining(false);
            return;
          }
          
          console.debug('✅ [GroupWelcome] Group settings applied, navigating to home');
          // Clear the join token from URL and navigate
          navigate('/', { replace: true });
        } catch (error) {
          console.error('❌ [GroupWelcome] Failed to join group:', error);
          const errorMessage = (error as Error).message;
          
          // Provide user-friendly error messages
          if (errorMessage.includes('expired')) {
            toast.error('This invite link has expired. Ask an admin for a new one.');
          } else if (errorMessage.includes('Invalid')) {
            toast.error('This invite link is invalid or has been revoked.');
          } else {
            toast.error('Failed to join group. Please try again or contact the group admin.');
          }
        } finally {
          setIsJoining(false);
        }
      }
    };

    handleJoinFlow();
  }, [user, joinToken, groupId, navigate, isJoining, groupsLoading, applyGroupById, refetch, groups]);

  useEffect(() => {
    // If group is not found and groups have loaded, show error
    // But only if we don't have a join token or fallback name (which means we're in the process of joining)
    if (!groupsLoading && !group && groupId && !joinToken && !fallbackGroupName) {
      toast.error('Group not found or you do not have access');
    }
  }, [group, groupsLoading, groupId, joinToken, fallbackGroupName]);

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

  if (groupsLoading || isJoining) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isJoining ? 'Joining group...' : 'Loading...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    // If we have a fallback name (from a successful join), show that while waiting for refetch
    if (fallbackGroupName) {
      return (
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                Welcome to {fallbackGroupName}
              </CardTitle>
              <CardDescription>
                Setting up your group...
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading group details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Otherwise, show error
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
