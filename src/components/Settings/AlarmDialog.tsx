import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserAlarms, UserAlarm } from '@/hooks/useUserSettings';

const alarmSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  pm1_threshold: z.number().min(0).max(500).optional(),
  pm25_threshold: z.number().min(0).max(500).optional(),
  pm10_threshold: z.number().min(0).max(500).optional(),
  notification_frequency: z.string(),
  enabled: z.boolean(),
});

type AlarmFormData = z.infer<typeof alarmSchema>;

interface AlarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alarm?: UserAlarm;
}

export function AlarmDialog({ open, onOpenChange, alarm }: AlarmDialogProps) {
  const { createAlarm, updateAlarm } = useUserAlarms();
  const [loading, setLoading] = useState(false);

  const form = useForm<AlarmFormData>({
    resolver: zodResolver(alarmSchema),
    defaultValues: {
      name: '',
      pm1_threshold: undefined,
      pm25_threshold: undefined,
      pm10_threshold: undefined,
      notification_frequency: 'immediate',
      enabled: true,
    },
  });

  useEffect(() => {
    if (alarm) {
      form.reset({
        name: alarm.name,
        pm1_threshold: alarm.pm1_threshold || undefined,
        pm25_threshold: alarm.pm25_threshold || undefined,
        pm10_threshold: alarm.pm10_threshold || undefined,
        notification_frequency: alarm.notification_frequency,
        enabled: alarm.enabled,
      });
    } else {
      form.reset({
        name: '',
        pm1_threshold: undefined,
        pm25_threshold: undefined,
        pm10_threshold: undefined,
        notification_frequency: 'immediate',
        enabled: true,
      });
    }
  }, [alarm, form]);

  const onSubmit = async (data: AlarmFormData) => {
    setLoading(true);
    try {
      const cleanData = {
        name: data.name,
        pm1_threshold: data.pm1_threshold || undefined,
        pm25_threshold: data.pm25_threshold || undefined,
        pm10_threshold: data.pm10_threshold || undefined,
        notification_frequency: data.notification_frequency,
        enabled: data.enabled,
      };

      if (alarm) {
        await updateAlarm(alarm.id, cleanData);
      } else {
        await createAlarm(cleanData);
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
            <Bell className="h-5 w-5" />
            {alarm ? 'Edit Alarm' : 'Add Alarm'}
          </DialogTitle>
          <DialogDescription>
            {alarm ? 'Update your alarm settings' : 'Create a new custom alarm'}
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
                    <Input
                      placeholder="High PM2.5 Alert, Outdoor Warning..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pm1_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PM1 (μg/m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="15"
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
                name="pm25_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PM2.5 (μg/m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25"
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
                name="pm10_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PM10 (μg/m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
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

            <FormField
              control={form.control}
              name="notification_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Frequency</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Alarm</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Send notifications when thresholds are exceeded
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
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : alarm ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
