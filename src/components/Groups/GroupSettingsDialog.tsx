import { useState, useEffect } from 'react';
import { Settings, MapPin, Activity, Bell, Calendar } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Group } from '@/hooks/useGroups';

const settingsSchema = z.object({
  // Location settings
  default_location: z.string().optional(),
  location_auto_detect: z.boolean().default(false),
  
  // Activity settings  
  default_activity: z.string().optional(),
  activity_auto_suggest: z.boolean().default(false),
  
  // Alarm settings
  alarm_enabled: z.boolean().default(true),
  pm1_threshold: z.number().min(0).max(500).default(15),
  pm25_threshold: z.number().min(0).max(500).default(25), 
  pm10_threshold: z.number().min(0).max(500).default(50),
  notification_frequency: z.string().default('immediate'),
  
  // Events settings
  auto_share_stats: z.boolean().default(true),
  event_notifications: z.boolean().default(true),
  weekly_reports: z.boolean().default(false),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface GroupSettingsDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSettingsDialog({ group, open, onOpenChange }: GroupSettingsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_location: '',
      location_auto_detect: false,
      default_activity: '',
      activity_auto_suggest: false,
      alarm_enabled: true,
      pm1_threshold: 15,
      pm25_threshold: 25,
      pm10_threshold: 50,
      notification_frequency: 'immediate',
      auto_share_stats: true,
      event_notifications: true,
      weekly_reports: false,
    }
  });

  // Load existing settings
  useEffect(() => {
    if (open && group.id) {
      loadGroupSettings();
    }
  }, [open, group.id]);

  const loadGroupSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', group.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        form.reset({
          default_location: data.default_location || '',
          location_auto_detect: data.location_auto_detect || false,
          default_activity: data.default_activity || '',
          activity_auto_suggest: data.activity_auto_suggest || false,
          alarm_enabled: data.alarm_enabled ?? true,
          pm1_threshold: data.pm1_threshold || 15,
          pm25_threshold: data.pm25_threshold || 25,
          pm10_threshold: data.pm10_threshold || 50,
          notification_frequency: data.notification_frequency || 'immediate',
          auto_share_stats: data.auto_share_stats ?? true,
          event_notifications: data.event_notifications ?? true,
          weekly_reports: data.weekly_reports || false,
        });
      }
    } catch (error) {
      console.error('Error loading group settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group settings',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('group_settings')
        .upsert({
          group_id: group.id,
          ...data,
        }, {
          onConflict: 'group_id'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group settings updated successfully',
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Settings - {group.name}
          </DialogTitle>
          <DialogDescription>
            Configure location, activity, alarm, and event settings for this group
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Location Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Location Settings</h3>
              </div>
              
              <FormField
                control={form.control}
                name="default_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Location</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="park">Park</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_auto_detect"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-detect Location</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically suggest location based on GPS
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Activity Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Activity Settings</h3>
              </div>
              
              <FormField
                control={form.control}
                name="default_activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Activity</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default activity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walking">Walking</SelectItem>
                          <SelectItem value="cycling">Cycling</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="sport">Sport</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="rest">Rest</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_auto_suggest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-suggest Activity</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Suggest activity based on movement patterns
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Alarm Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Alarm Settings</h3>
              </div>

              <FormField
                control={form.control}
                name="alarm_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Alarms</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Send notifications when thresholds are exceeded
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pm1_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PM1 Threshold (μg/m³)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel>PM2.5 Threshold (μg/m³)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel>PM10 Threshold (μg/m³)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
            </div>

            <Separator />

            {/* Events Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">Events Settings</h3>
              </div>

              <FormField
                control={form.control}
                name="auto_share_stats"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-share Statistics</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically share daily statistics with group members
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Event Notifications</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Send notifications for group events and activities
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weekly_reports"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Weekly Reports</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Generate and send weekly air quality reports
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
