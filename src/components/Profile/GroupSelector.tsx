import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Check, LogOut } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { useNavigate } from 'react-router-dom';

export function GroupSelector() {
  const { groups, loading } = useGroups();
  const { activeGroup, isGroupMode, applyGroupById, clearGroupSettings } = useGroupSettings();
  const navigate = useNavigate();

  const handleSwitchGroup = (groupId: string) => {
    const success = applyGroupById(groupId);
    if (success) {
      console.log('✅ Group switched successfully, navigating to home...');
      
      // Navigate to home while preserving the group parameter
      setTimeout(() => {
        navigate(`/?group=${groupId}`);
      }, 100);
    }
  };

  const handleExitGroupMode = () => {
    clearGroupSettings();
    navigate('/');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Groups
          {isGroupMode && (
            <Badge variant="secondary" className="ml-2">
              Group Mode Active
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/groups')}
        >
          Manage
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">You are not a member of any group yet</p>
            <Button
              variant="link"
              onClick={() => navigate('/groups')}
              className="mt-2"
            >
              Browse Groups
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {groups.map((group) => {
                const isActive = activeGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    } transition-colors`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{group.name}</h4>
                        {isActive && (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          {group.role === 'admin' ? '👑 Admin' : 'Member'}
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {!isActive ? (
                      <Button
                        size="sm"
                        onClick={() => handleSwitchGroup(group.id)}
                      >
                        Switch
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExitGroupMode}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Exit
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {isGroupMode && activeGroup && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Current group settings:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {activeGroup.thresholds?.length || 0} Thresholds
                  </Badge>
                  <Badge variant="secondary">
                    {activeGroup.locations?.length || 0} Locations
                  </Badge>
                  <Badge variant="secondary">
                    {activeGroup.alarms?.length || 0} Alarms
                  </Badge>
                  <Badge variant="secondary">
                    {activeGroup.events?.length || 0} Events
                  </Badge>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
