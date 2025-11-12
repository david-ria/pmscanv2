import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGroups } from '@/hooks/useGroups';
import { BaseDialogProps } from '@/types/shared';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateGroupDialogProps extends BaseDialogProps {}

export function CreateGroupDialog({
  open,
  onOpenChange,
}: CreateGroupDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createGroup } = useGroups();
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Logo file must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (groupId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}.${fileExt}`;
    const filePath = `${groupId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('group_logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('group_logos')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('groups')
      .update({ logo_url: publicUrl })
      .eq('id', groupId);

    if (updateError) throw updateError;
  };

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      const newGroup = await createGroup(values.name, values.description);
      
      if (!newGroup) {
        throw new Error('Failed to create group');
      }

      if (logoFile) {
        await uploadLogo(newGroup.id, logoFile);
      }

      toast({
        title: t('groups.groupCreatedSuccess'),
        description: t('groups.configureSettingsNext'),
      });

      form.reset();
      setLogoFile(null);
      setLogoPreview(null);
      onOpenChange(false);
      
      navigate(`/groups/${newGroup.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show form for super admins
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('groups.createNewGroup')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('groups.createGroupSimpleDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groups.groupName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('groups.enterGroupName')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('groups.chooseDescriptiveName')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groups.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('groups.describePurpose')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('groups.helpMembersUnderstand')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t('groups.uploadGroupLogo')}</FormLabel>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('groups.logoOptional')}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.creating') : t('groups.createGroup')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
