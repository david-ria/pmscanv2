import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MapPin, Activity } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/hooks/use-toast';

interface GroupLocation {
  id: string;
  name: string;
  activities: string[];
}

interface GroupLocationsDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupLocationsDialog({ groupId, open, onOpenChange }: GroupLocationsDialogProps) {
  const { groups, updateGroup } = useGroups();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    activities: [''],
  });

  const group = groups.find(g => g.id === groupId);
  const locations: GroupLocation[] = group?.custom_locations 
    ? Object.entries(group.custom_locations).map(([id, data]: [string, any]) => ({
        id,
        name: data.name || id,
        activities: data.activities || [],
      }))
    : [];

  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) return;
    
    const filteredActivities = newLocation.activities.filter(a => a.trim());
    if (filteredActivities.length === 0) return;

    const locationId = crypto.randomUUID();
    const currentLocations = group?.custom_locations || {};
    
    const updatedLocations = {
      ...currentLocations,
      [locationId]: {
        name: newLocation.name,
        activities: filteredActivities,
      },
    };

    try {
      await updateGroup(groupId, { custom_locations: updatedLocations });
      setNewLocation({ name: '', activities: [''] });
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Location created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create location",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const currentLocations = group?.custom_locations || {};
    const { [locationId]: removed, ...updatedLocations } = currentLocations;

    try {
      await updateGroup(groupId, { custom_locations: updatedLocations });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLocation = async (locationId: string, updates: Partial<GroupLocation>) => {
    const currentLocations = group?.custom_locations || {};
    const updatedLocations = {
      ...currentLocations,
      [locationId]: {
        ...currentLocations[locationId],
        ...updates,
      },
    };

    try {
      await updateGroup(groupId, { custom_locations: updatedLocations });
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    }
  };

  const addActivity = (activities: string[], setActivities: (activities: string[]) => void) => {
    setActivities([...activities, '']);
  };

  const removeActivity = (index: number, activities: string[], setActivities: (activities: string[]) => void) => {
    const newActivities = activities.filter((_, i) => i !== index);
    setActivities(newActivities);
  };

  const updateActivity = (index: number, value: string, activities: string[], setActivities: (activities: string[]) => void) => {
    const newActivities = [...activities];
    newActivities[index] = value;
    setActivities(newActivities);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Group Locations & Activities</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-6">
          {/* Existing Locations */}
          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {location.name}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Location Name</Label>
                    <Input
                      value={location.name}
                      onChange={(e) => handleUpdateLocation(location.id, { name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      <Activity className="h-4 w-4" />
                      Activities
                    </Label>
                    <div className="space-y-2">
                      {location.activities.map((activity, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={activity}
                            onChange={(e) => {
                              const newActivities = [...location.activities];
                              newActivities[index] = e.target.value;
                              handleUpdateLocation(location.id, { activities: newActivities });
                            }}
                            placeholder="Activity name"
                          />
                          {location.activities.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newActivities = location.activities.filter((_, i) => i !== index);
                                handleUpdateLocation(location.id, { activities: newActivities });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newActivities = [...location.activities, ''];
                          handleUpdateLocation(location.id, { activities: newActivities });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Activity
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {location.activities.filter(a => a.trim()).map((activity, index) => (
                        <Badge key={index} variant="secondary">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {locations.length === 0 && !isCreating && (
              <div className="text-center py-8 text-muted-foreground">
                No locations configured. Create your first location to get started.
              </div>
            )}
          </div>

          {/* Create New Location */}
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Location Name</Label>
                  <Input
                    value={newLocation.name}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Office, Lab, Home, etc."
                  />
                </div>
                
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    <Activity className="h-4 w-4" />
                    Activities
                  </Label>
                  <div className="space-y-2">
                    {newLocation.activities.map((activity, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={activity}
                          onChange={(e) => updateActivity(index, e.target.value, newLocation.activities, (activities) => 
                            setNewLocation(prev => ({ ...prev, activities }))
                          )}
                          placeholder="Activity name"
                        />
                        {newLocation.activities.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeActivity(index, newLocation.activities, (activities) => 
                              setNewLocation(prev => ({ ...prev, activities }))
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addActivity(newLocation.activities, (activities) => 
                        setNewLocation(prev => ({ ...prev, activities }))
                      )}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Activity
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateLocation} 
                    disabled={!newLocation.name.trim() || !newLocation.activities.some(a => a.trim())}
                  >
                    Create Location
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Location
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
