import { useState } from 'react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGroupInvitations } from '@/hooks/useGroups';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ groupId, open, onOpenChange }: InviteUserDialogProps) {
  const { sendInvitation } = useGroupInvitations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      await sendInvitation(groupId, values.email);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User to Group</DialogTitle>
          <DialogDescription>
            Send an invitation email to someone to join your group.
            They'll receive an email with a link to accept or decline the invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the email address of the person you want to invite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}