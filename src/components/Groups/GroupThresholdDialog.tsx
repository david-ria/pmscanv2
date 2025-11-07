import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGroupCustomThresholds,
  GroupCustomThreshold,
} from '@/hooks/useGroupCustomThresholds';
import { Group } from '@/hooks/useGroups';

const thresholdSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  pm1_min: z.number().min(0).max(500).optional(),
  pm1_max: z.number().min(0).max(500).optional(),
  pm25_min: z.number().min(0).max(500).optional(),
  pm25_max: z.number().min(0).max(500).optional(),
  pm10_min: z.number().min(0).max(500).optional(),
  pm10_max: z.number().min(0).max(500).optional(),
  color: z.string(),
  enabled: z.boolean(),
});

type ThresholdFormData = z.infer<typeof thresholdSchema>;

interface GroupThresholdDialogProps {
  group: Group;
  threshold?: GroupCustomThreshold;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupThresholdDialog({
  group,
  threshold,
  open,
  onOpenChange,
}: GroupThresholdDialogProps) {
  const { createThreshold, updateThreshold } = useGroupCustomThresholds(
    group.id
  );
  const [loading, setLoading] = useState(false);

  const form = useForm<ThresholdFormData>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      name: '',
      pm1_min: undefined,
      pm1_max: undefined,
      pm25_min: undefined,
      pm25_max: undefined,
      pm10_min: undefined,
      pm10_max: undefined,
      color: '#3b82f6',
      enabled: true,
    },
  });

  useEffect(() => {
    if (threshold) {
      form.reset({
        name: threshold.name,
        pm1_min: threshold.pm1_min || undefined,
        pm1_max: threshold.pm1_max || undefined,
        pm25_min: threshold.pm25_min || undefined,
        pm25_max: threshold.pm25_max || undefined,
        pm10_min: threshold.pm10_min || undefined,
        pm10_max: threshold.pm10_max || undefined,
        color: threshold.color,
        enabled: threshold.enabled,
      });
    } else {
      form.reset({
        name: '',
        pm1_min: undefined,
        pm1_max: undefined,
        pm25_min: undefined,
        pm25_max: undefined,
        pm10_min: undefined,
        pm10_max: undefined,
        color: '#3b82f6',
        enabled: true,
      });
    }
  }, [threshold, form]);

  const onSubmit = async (data: ThresholdFormData) => {
    setLoading(true);
    try {
      const cleanData = {
        group_id: group.id,
        name: data.name,
        pm1_min: data.pm1_min || undefined,
        pm1_max: data.pm1_max || undefined,
        pm25_min: data.pm25_min || undefined,
        pm25_max: data.pm25_max || undefined,
        pm10_min: data.pm10_min || undefined,
        pm10_max: data.pm10_max || undefined,
        color: data.color,
        enabled: data.enabled,
      };

      if (threshold) {
        await updateThreshold(threshold.id, cleanData);
      } else {
        await createThreshold(cleanData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {threshold ? 'Modifier le seuil' : 'Ajouter un seuil'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {threshold
              ? 'Modifiez les paramètres du seuil'
              : 'Créez un nouveau seuil personnalisé pour le groupe'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du seuil</FormLabel>
                  <FormControl>
                    <Input placeholder="Bon, Modéré, Mauvais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Seuils PM1 (μg/m³)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pm1_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pm1_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="∞"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Seuils PM2.5 (μg/m³)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pm25_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pm25_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="∞"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Seuils PM10 (μg/m³)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pm10_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pm10_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="∞"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Activer le seuil</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Utiliser ce seuil pour l'affichage et les notifications
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? 'Enregistrement...'
                  : threshold
                    ? 'Modifier'
                    : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
