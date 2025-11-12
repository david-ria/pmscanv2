import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { DialogFooter } from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGroupInvitations, useGroups } from '@/hooks/useGroups';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { BaseDialogProps } from '@/types/shared';
import { generateQRCodeDataURL } from '@/utils/qrCode';
import { createGroupJoinLink } from '@/utils/invitations';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Mail, Link2, QrCode, Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

interface InviteUserDialogProps extends BaseDialogProps {
  groupId: string;
  groupName?: string;
}

export function InviteUserDialog({
  groupId,
  groupName: groupNameProp,
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  const { sendInvitation } = useGroupInvitations();
  const { groups } = useGroups();
  const { activeGroup } = useGroupSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [expirationHours, setExpirationHours] = useState<string>('168'); // Default 7 days

  // Resolve group name from multiple sources
  const resolvedGroupName = useMemo(() => {
    // 1. Use prop if provided
    if (groupNameProp) return groupNameProp;
    
    // 2. Try to find in groups list
    const group = groups.find(g => g.id === groupId);
    if (group?.name) return group.name;
    
    // 3. Check if it's the active group
    if (activeGroup?.id === groupId && activeGroup?.name) {
      return activeGroup.name;
    }
    
    return null;
  }, [groupNameProp, groups, groupId, activeGroup]);

  // Generate join link and QR code when dialog opens or expiration changes
  useEffect(() => {
    if (open && !isGeneratingLink) {
      setIsGeneratingLink(true);
      setJoinUrl(''); // Clear previous URL
      setQrCodeDataUrl('');
      createGroupJoinLink(groupId, resolvedGroupName || undefined, parseInt(expirationHours))
        .then(async ({ url }) => {
          setJoinUrl(url);
          const dataUrl = await generateQRCodeDataURL(url, { size: 256 });
          setQrCodeDataUrl(dataUrl);
        })
        .catch((error) => {
          console.error('Failed to generate join link:', error);
          toast({
            title: 'Error',
            description: 'Failed to generate invitation link',
            variant: 'destructive',
          });
        })
        .finally(() => setIsGeneratingLink(false));
    }
  }, [open, expirationHours, groupId, resolvedGroupName, toast]);

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
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast({
        title: 'Success',
        description: 'Group URL copied to clipboard',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy URL to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    const filename = resolvedGroupName 
      ? `${resolvedGroupName.toLowerCase().replace(/\s+/g, '-')}-invite.png`
      : `group-${groupId}-invite.png`;
    link.href = qrCodeDataUrl;
    link.download = filename;
    link.click();
    toast({
      title: 'Success',
      description: 'QR code downloaded successfully',
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Invite Members to Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Choose how you want to invite people to join your group.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
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
              Share this link to let people join your group and start recording data with group settings.
            </div>
            
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Link Expiration</Label>
              <RadioGroup value={expirationHours} onValueChange={setExpirationHours}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="exp-1h" />
                  <Label htmlFor="exp-1h" className="font-normal cursor-pointer">1 hour</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="24" id="exp-24h" />
                  <Label htmlFor="exp-24h" className="font-normal cursor-pointer">24 hours (Conference/Event)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="168" id="exp-7d" />
                  <Label htmlFor="exp-7d" className="font-normal cursor-pointer">7 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="720" id="exp-30d" />
                  <Label htmlFor="exp-30d" className="font-normal cursor-pointer">30 days</Label>
                </div>
              </RadioGroup>
            </div>

            {isGeneratingLink || !joinUrl ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating link...
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Input
                    value={joinUrl}
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
            )}
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
              Let people scan this QR code to join your group and start recording.
            </div>
            
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">QR Code Expiration</Label>
              <RadioGroup value={expirationHours} onValueChange={setExpirationHours}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="qr-exp-1h" />
                  <Label htmlFor="qr-exp-1h" className="font-normal cursor-pointer">1 hour</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="24" id="qr-exp-24h" />
                  <Label htmlFor="qr-exp-24h" className="font-normal cursor-pointer">24 hours (Conference/Event)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="168" id="qr-exp-7d" />
                  <Label htmlFor="qr-exp-7d" className="font-normal cursor-pointer">7 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="720" id="qr-exp-30d" />
                  <Label htmlFor="qr-exp-30d" className="font-normal cursor-pointer">30 days</Label>
                </div>
              </RadioGroup>
            </div>

            {isGeneratingLink || !qrCodeDataUrl ? (
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="w-48 h-48 rounded-lg" />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating QR code...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={qrCodeDataUrl}
                    alt="Group invitation QR code"
                    className="w-48 h-48"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadQR}
                  className="flex items-center gap-2"
                  disabled={!qrCodeDataUrl}
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </Button>
              </div>
            )}
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
