import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  MoreVertical,
  Trash2,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { formatDistanceToNow } from 'date-fns';

interface GroupCardProps {
  group: Group;
  onInviteUser: () => void;
}

export function GroupCard({ group, onInviteUser }: GroupCardProps) {
  const { deleteGroup, leaveGroup } = useGroups();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const isAdmin = group.role === 'admin';

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
      <Card className="group hover:shadow-lg transition-all duration-200 border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl mb-2 truncate">{group.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {group.description || 'No description provided'}
              </p>
            </div>
            
            {/* Only show menu for destructive actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {isAdmin ? (
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setLeaveOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Group Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
              </div>
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="font-medium">
                {isAdmin ? 'Admin' : 'Member'}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
            </div>

            {/* Primary Actions */}
            <div className="flex pt-2">
              <Button asChild variant="default" size="sm" className="w-full">
                <Link to={`/groups/${group.id}`} className="flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {isAdmin ? 'Manage' : 'View Details'}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot
              be undone. All group data, settings, and shared statistics will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              Are you sure you want to leave "{group.name}"? You'll lose access
              to group settings and shared statistics. You can only rejoin if
              invited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
