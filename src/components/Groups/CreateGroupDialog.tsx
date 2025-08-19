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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAdvancedGroupCreation } from '@/hooks/useAdvancedGroupCreation';
import { BaseDialogProps } from '@/types/shared';
import { Plus, Trash2, MapPin, Activity, Target, Bell, Settings } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const thresholdSchema = z.object({
  name: z.string().min(1, 'Threshold name is required'),
  pm1_min: z.number().min(0).max(500).optional(),
  pm1_max: z.number().min(0).max(500).optional(),
  pm25_min: z.number().min(0).max(500).optional(),
  pm25_max: z.number().min(0).max(500).optional(),
  pm10_min: z.number().min(0).max(500).optional(),
  pm10_max: z.number().min(0).max(500).optional(),
  color: z.string(),
  enabled: z.boolean(),
});

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().optional(),
});

const activitySchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const formSchema = z.object({
  // Basic info
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  // Subscription
  subscription_tier: z.enum(['free', 'premium']).default('free'),
  
  // Settings
  pm1_threshold: z.number().min(0).max(500).default(15),
  pm25_threshold: z.number().min(0).max(500).default(25),
  pm10_threshold: z.number().min(0).max(500).default(50),
  alarm_enabled: z.boolean().default(true),
  auto_share_stats: z.boolean().default(true),
  notification_frequency: z.enum(['immediate', 'hourly', 'daily']).default('immediate'),
  location_auto_detect: z.boolean().default(false),
  activity_auto_suggest: z.boolean().default(false),
  event_notifications: z.boolean().default(true),
  weekly_reports: z.boolean().default(false),
  default_location: z.string().optional(),
  default_activity: z.string().optional(),
  
  // Arrays
  thresholds: z.array(thresholdSchema).default([]),
  custom_locations: z.array(locationSchema).default([]),
  custom_activities: z.array(activitySchema).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface CreateGroupDialogProps extends BaseDialogProps {}

export function CreateGroupDialog({
  open,
  onOpenChange,
}: CreateGroupDialogProps) {
  const { createAdvancedGroup, isSubmitting } = useAdvancedGroupCreation();
  const { isSuperAdmin } = useUserRole();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      subscription_tier: 'free',
      pm1_threshold: 15,
      pm25_threshold: 25,
      pm10_threshold: 50,
      alarm_enabled: true,
      auto_share_stats: true,
      notification_frequency: 'immediate',
      location_auto_detect: false,
      activity_auto_suggest: false,
      event_notifications: true,
      weekly_reports: false,
      thresholds: [],
      custom_locations: [],
      custom_activities: [],
    },
  });

  const {
    fields: thresholdFields,
    append: appendThreshold,
    remove: removeThreshold,
  } = useFieldArray({
    control: form.control,
    name: 'thresholds',
  });

  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: 'custom_locations',
  });

  const {
    fields: activityFields,
    append: appendActivity,
    remove: removeActivity,
  } = useFieldArray({
    control: form.control,
    name: 'custom_activities',
  });

  const addDefaultThreshold = () => {
    appendThreshold({
      name: 'Good',
      pm25_max: 25,
      pm10_max: 50,
      pm1_max: 15,
      color: '#22c55e',
      enabled: true,
    });
  };

  const addDefaultLocation = () => {
    appendLocation({
      name: 'Office',
      description: 'Workplace environment',
    });
  };

  const addDefaultActivity = () => {
    appendActivity({
      name: 'Work',
      description: 'Work-related activities',
      icon: 'briefcase',
    });
  };

  const onSubmit = async (values: FormData) => {
    try {
      const groupData = {
        name: values.name,
        description: values.description,
        subscription_tier: values.subscription_tier,
        settings: {
          pm1_threshold: values.pm1_threshold,
          pm25_threshold: values.pm25_threshold,
          pm10_threshold: values.pm10_threshold,
          alarm_enabled: values.alarm_enabled,
          auto_share_stats: values.auto_share_stats,
          notification_frequency: values.notification_frequency,
          location_auto_detect: values.location_auto_detect,
          activity_auto_suggest: values.activity_auto_suggest,
          event_notifications: values.event_notifications,
          weekly_reports: values.weekly_reports,
          default_location: values.default_location,
          default_activity: values.default_activity,
        },
        thresholds: values.thresholds.map(t => ({
          name: t.name,
          pm1_min: t.pm1_min,
          pm1_max: t.pm1_max,
          pm25_min: t.pm25_min,
          pm25_max: t.pm25_max,
          pm10_min: t.pm10_min,
          pm10_max: t.pm10_max,
          color: t.color,
          enabled: t.enabled,
        })),
        custom_locations: values.custom_locations.map(l => ({
          name: l.name,
          description: l.description,
        })),
        custom_activities: values.custom_activities.map(a => ({
          name: a.name,
          description: a.description,
          icon: a.icon,
        })),
      };

      await createAdvancedGroup(groupData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Only show advanced form for super admins
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create Advanced Group Configuration
          </DialogTitle>
          <DialogDescription>
            Configure a comprehensive group with custom thresholds, locations, activities, and settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Choose a descriptive name for your group
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the purpose of this group"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Help members understand the group's purpose
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subscription_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Tier</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Choose the subscription tier for this group
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold">Alarm Settings</h3>
                    </div>
                    
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

                    <div className="grid grid-cols-2 gap-4">
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
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Additional Settings</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="auto_share_stats"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Auto-share Statistics</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Automatically share daily statistics
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

                      <FormField
                        control={form.control}
                        name="event_notifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Event Notifications</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Send notifications for group events
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
                                Generate weekly air quality reports
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Thresholds Tab */}
              <TabsContent value="thresholds" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold">Custom Thresholds</h3>
                    </div>
                    <Button type="button" variant="outline" onClick={addDefaultThreshold}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Threshold
                    </Button>
                  </div>

                  {thresholdFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No custom thresholds defined. Add thresholds to override default WHO standards.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {thresholdFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Threshold {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeThreshold(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`thresholds.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Good, Moderate, Poor..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`thresholds.${index}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <Input type="color" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <FormLabel>PM1 Range (μg/m³)</FormLabel>
                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm1_min`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Min"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm1_max`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Max"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <FormLabel>PM2.5 Range (μg/m³)</FormLabel>
                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm25_min`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Min"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm25_max`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Max"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <FormLabel>PM10 Range (μg/m³)</FormLabel>
                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm10_min`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Min"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`thresholds.${index}.pm10_max`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Max"
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          <FormField
                            control={form.control}
                            name={`thresholds.${index}.enabled`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Enable Threshold</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Use this threshold for display and notifications
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold">Custom Locations</h3>
                    </div>
                    <Button type="button" variant="outline" onClick={addDefaultLocation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>

                  {locationFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No custom locations defined. Add locations specific to your group's context.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {locationFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Location {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLocation(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <FormField
                            control={form.control}
                            name={`custom_locations.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Office, Home, Park..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`custom_locations.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe this location..."
                                    className="resize-none"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold">Custom Activities</h3>
                    </div>
                    <Button type="button" variant="outline" onClick={addDefaultActivity}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>

                  {activityFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No custom activities defined. Add activities specific to your group's context.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activityFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Activity {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeActivity(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <FormField
                            control={form.control}
                            name={`custom_activities.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Activity Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Walking, Work, Sport..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`custom_activities.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe this activity..."
                                    className="resize-none"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`custom_activities.${index}.icon`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Icon</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose an icon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="briefcase">Briefcase</SelectItem>
                                      <SelectItem value="home">Home</SelectItem>
                                      <SelectItem value="car">Car</SelectItem>
                                      <SelectItem value="activity">Activity</SelectItem>
                                      <SelectItem value="coffee">Coffee</SelectItem>
                                      <SelectItem value="users">Users</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

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
                {isSubmitting ? 'Creating Advanced Group...' : 'Create Advanced Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
