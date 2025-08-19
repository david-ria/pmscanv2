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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGroupInvitations, useGroups } from '@/hooks/useGroups';
import { BaseDialogProps } from '@/types/shared';
import { generateGroupQRCode, copyGroupUrlToClipboard, downloadGroupQRCode } from '@/utils/qrCode';
import { generateGroupUrl } from '@/lib/groupConfigs';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Mail, Link2, QrCode } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

interface InviteUserDialogProps extends BaseDialogProps {
  groupId: string;
}

export function InviteUserDialog({
  groupId,
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  const { sendInvitation } = useGroupInvitations();
  const { groups } = useGroups();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the current group to get its name for URL generation
  const currentGroup = groups.find(g => g.id === groupId);
  
  const groupUrl = generateGroupUrl(groupId, currentGroup?.name);
  const qrCodeUrl = generateGroupQRCode(groupId, { size: 256 }, currentGroup?.name);

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

  const handleCopyUrl = async () => {
    const success = await copyGroupUrlToClipboard(groupId, currentGroup?.name);
    if (success) {
      toast({
        title: 'Success',
        description: 'Group URL copied to clipboard',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to copy URL to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQR = async () => {
    try {
      const filename = currentGroup?.name 
        ? `${currentGroup.name.toLowerCase().replace(/\s+/g, '-')}-invite.png`
        : `group-${groupId}-invite.png`;
      await downloadGroupQRCode(groupId, filename, { size: 512 }, currentGroup?.name);
      toast({
        title: 'Success',
        description: 'QR code downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Members to Group</DialogTitle>
          <DialogDescription>
            Choose how you want to invite people to join your group.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Send an invitation email with a personalized message.
            </div>
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
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Share this link to let people join your group directly.
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  value={groupUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Let people scan this QR code to join your group.
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <img
                  src={qrCodeUrl}
                  alt="Group invitation QR code"
                  className="w-48 h-48"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadQR}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
