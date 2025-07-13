import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserActivities, UserActivity } from '@/hooks/useUserSettings';

const activitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: UserActivity;
}

export function ActivityDialog({ open, onOpenChange, activity }: ActivityDialogProps) {
  const { createActivity, updateActivity } = useUserActivities();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '',
    }
  });

  useEffect(() => {
    if (activity) {
      form.reset({
        name: activity.name,
        description: activity.description || '',
        icon: activity.icon || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        icon: '',
      });
    }
  }, [activity, form]);

  const onSubmit = async (data: ActivityFormData) => {
    setLoading(true);
    try {
      const cleanData = {
        name: data.name,
        description: data.description || undefined,
        icon: data.icon || undefined,
      };
      
      if (activity) {
        await updateActivity(activity.id, cleanData);
      } else {
        await createActivity(cleanData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {activity ? 'Edit Activity' : 'Add Activity'}
          </DialogTitle>
          <DialogDescription>
            {activity ? 'Update your activity details' : 'Create a new custom activity'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Running, Reading, Meeting..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details about this activity..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="🏃, 📚, 💼..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : activity ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
