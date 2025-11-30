import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
                {group.description || t('groups.card.noDescription')}
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
                    {t('groups.card.deleteGroup')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setLeaveOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('groups.card.leaveGroup')}
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
                <span>
                  {group.member_count === 1 
                    ? t('groups.card.members', { count: group.member_count })
                    : t('groups.card.membersPlural', { count: group.member_count })
                  }
                </span>
              </div>
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="font-medium">
                {isAdmin ? t('common.admin') : t('common.member')}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              {t('groups.card.createdAgo', { time: formatDistanceToNow(new Date(group.created_at), { addSuffix: true }) })}
            </div>

            {/* Primary Actions */}
            <div className="flex pt-2">
              <Button asChild variant="default" size="sm" className="w-full">
                <Link to={`/groups/${group.id}`} className="flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {isAdmin ? t('groups.card.manage') : t('groups.card.viewDetails')}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups.card.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups.card.deleteConfirmDescription', { name: group.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('groups.card.deleteGroup')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups.card.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups.card.leaveConfirmDescription', { name: group.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('groups.card.leaveGroup')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
