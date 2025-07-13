import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
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
import { useUserLocations, UserLocation } from '@/hooks/useUserSettings';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: UserLocation;
}

export function LocationDialog({ open, onOpenChange, location }: LocationDialogProps) {
  const { createLocation, updateLocation } = useUserLocations();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      description: '',
      latitude: undefined,
      longitude: undefined,
    }
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        description: location.description || '',
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        latitude: undefined,
        longitude: undefined,
      });
    }
  }, [location, form]);

  const onSubmit = async (data: LocationFormData) => {
    setLoading(true);
    try {
      const cleanData = {
        name: data.name,
        description: data.description || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
      };
      
      if (location) {
        await updateLocation(location.id, cleanData);
      } else {
        await createLocation(cleanData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location ? 'Edit Location' : 'Add Location'}
          </DialogTitle>
          <DialogDescription>
            {location ? 'Update your location details' : 'Create a new custom location'}
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
                    <Input placeholder="Home, Office, Gym..." {...field} />
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
                    <Textarea placeholder="Additional details about this location..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="40.7128"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-74.0060"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              className="w-full"
            >
              Use Current Location
            </Button>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : location ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
