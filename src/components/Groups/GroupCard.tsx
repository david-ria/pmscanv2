import { useState } from 'react';
import { Users, Settings, UserPlus, MoreVertical, Trash2, Edit, LogOut, Cog, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useGroups, Group } from '@/hooks/useGroups';
import { EditGroupDialog } from './EditGroupDialog';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { GroupCustomThresholdsDialog } from './GroupCustomThresholdsDialog';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface GroupCardProps {
  group: Group;
  onInviteUser: () => void;
  isAdminView?: boolean;
}

export function GroupCard({ group, onInviteUser, isAdminView = false }: GroupCardProps) {
  const { deleteGroup, leaveGroup } = useGroups();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);

  const isAdmin = group.role === 'admin';
  // In admin view, super admins can manage any group
  const canManageGroup = isAdminView || isAdmin;

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      setDeleteOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGroup(group.id);
      setLeaveOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{group.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {group.description || 'No description provided'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* View Details - Always available */}
              <DropdownMenuItem asChild>
                <Link to={`/groups/${group.id}`} className="flex items-center w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              
              {/* Admin functions - Show in admin view OR if user is group admin */}
              {canManageGroup && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Cog className="h-4 w-4 mr-2" />
                    Group Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setThresholdsOpen(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Seuils Personnalisés
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onInviteUser}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Leave option - Only for non-admins in regular view */}
              {!isAdminView && !isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLeaveOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Group
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </span>
            </div>
            <Badge variant={isAdmin ? 'default' : 'secondary'}>
              {isAdmin ? 'Admin' : 'Member'}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
          </div>

          {/* Action buttons - Show admin buttons when user can manage the group */}
          <div className="flex gap-2">
            {canManageGroup ? (
              <>
                <Button onClick={onInviteUser} size="sm" className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
                <Button variant="outline" onClick={() => setSettingsOpen(true)} size="sm">
                  <Cog className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setEditOpen(true)} size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            ) : (
              // In regular view, just show view details button
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to={`/groups/${group.id}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <GroupSettingsDialog
        group={group}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <GroupCustomThresholdsDialog
        group={group}
        open={thresholdsOpen}
        onOpenChange={setThresholdsOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone.
              All group data, settings, and shared statistics will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{group.name}"? You'll lose access to group
              settings and shared statistics. You can only rejoin if invited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}