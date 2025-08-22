import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, MapPin, Activity } from 'lucide-react';

import { UseFormReturn } from 'react-hook-form';

interface LocationWithActivitiesProps {
  locationIndex: number;
  onRemoveLocation: () => void;
  form: UseFormReturn<any>;
}

export function LocationWithActivities({
  locationIndex,
  onRemoveLocation,
  form,
}: LocationWithActivitiesProps) {
  const {
    fields: activityFields,
    append: appendActivity,
    remove: removeActivity,
  } = useFieldArray({
    control: form.control,
    name: `custom_locations.${locationIndex}.activities` as const,
  });

  const addActivity = () => {
    appendActivity({
      name: 'Walking',
      description: 'Walking around the location',
      icon: 'activity',
    });
  };

  return (
    <div className="border rounded-lg p-6 space-y-6 bg-card">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h4 className="text-lg font-medium">Location {locationIndex + 1}</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemoveLocation}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Location Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`custom_locations.${locationIndex}.name`}
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
          name={`custom_locations.${locationIndex}.description`}
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

      <Separator />

      {/* Activities Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h5 className="font-medium">Activities at this location</h5>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addActivity}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {activityFields.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No activities defined for this location yet.
          </div>
        ) : (
          <div className="space-y-4">
            {activityFields.map((activityField, activityIndex) => (
              <div
                key={activityField.id}
                className="border rounded-lg p-4 space-y-4 bg-muted/50"
              >
                <div className="flex justify-between items-center">
                  <h6 className="text-sm font-medium">
                    Activity {activityIndex + 1}
                  </h6>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActivity(activityIndex)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`custom_locations.${locationIndex}.activities.${activityIndex}.name`}
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
                    name={`custom_locations.${locationIndex}.activities.${activityIndex}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`custom_locations.${locationIndex}.activities.${activityIndex}.icon`}
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
                              <SelectItem value="walk">Walk</SelectItem>
                              <SelectItem value="bike">Bike</SelectItem>
                              <SelectItem value="utensils">Dining</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}