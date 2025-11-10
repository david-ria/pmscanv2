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
  const [editingLocation, setEditingLocation] = useState<{
    id: string;
    name: string;
    activities: string[];
  } | null>(null);

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
      <ResponsiveDialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <ResponsiveDialogTitle>Group Locations & Activities</ResponsiveDialogTitle>
            {!isCreating && (
              <Button 
                onClick={() => setIsCreating(true)} 
                size="sm"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            )}
          </div>
        </ResponsiveDialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Existing Locations */}
          <div className="space-y-3">
            {locations.map((location) => (
              <Card key={location.id} className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">{location.name}</span>
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs sm:text-sm">Location Name</Label>
                    <Input
                      value={editingLocation?.id === location.id ? editingLocation.name : location.name}
                      onChange={(e) => setEditingLocation({ ...location, name: e.target.value })}
                      onBlur={() => {
                        if (editingLocation?.id === location.id && editingLocation.name !== location.name) {
                          handleUpdateLocation(location.id, { name: editingLocation.name });
                          setEditingLocation(null);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-1 mb-2 text-xs sm:text-sm">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                      Activities
                    </Label>
                    <div className="space-y-2">
                      {(editingLocation?.id === location.id ? editingLocation.activities : location.activities).map((activity, index) => (
                        <div key={index} className="flex gap-2 w-full">
                          <Input
                            value={activity}
                            onChange={(e) => {
                              const currentActivities = editingLocation?.id === location.id 
                                ? editingLocation.activities 
                                : location.activities;
                              const newActivities = [...currentActivities];
                              newActivities[index] = e.target.value;
                              setEditingLocation({ ...location, activities: newActivities });
                            }}
                            onBlur={() => {
                              if (editingLocation?.id === location.id) {
                                const hasChanged = JSON.stringify(editingLocation.activities) !== JSON.stringify(location.activities);
                                if (hasChanged) {
                                  handleUpdateLocation(location.id, { activities: editingLocation.activities });
                                }
                                setEditingLocation(null);
                              }
                            }}
                            placeholder="Activity name"
                            className="flex-1 min-w-0"
                          />
                          {location.activities.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-shrink-0"
                              onClick={() => {
                                const newActivities = location.activities.filter((_, i) => i !== index);
                                handleUpdateLocation(location.id, { activities: newActivities });
                              }}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          const newActivities = [...location.activities, ''];
                          handleUpdateLocation(location.id, { activities: newActivities });
                        }}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Add Activity
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {location.activities.filter(a => a.trim()).map((activity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
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
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Create New Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs sm:text-sm">Location Name</Label>
                  <Input
                    value={newLocation.name}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Office, Lab, Home, etc."
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Label className="flex items-center gap-1 mb-2 text-xs sm:text-sm">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                    Activities
                  </Label>
                  <div className="space-y-2">
                    {newLocation.activities.map((activity, index) => (
                      <div key={index} className="flex gap-2 w-full">
                        <Input
                          value={activity}
                          onChange={(e) => updateActivity(index, e.target.value, newLocation.activities, (activities) => 
                            setNewLocation(prev => ({ ...prev, activities }))
                          )}
                          placeholder="Activity name"
                          className="flex-1 min-w-0"
                        />
                        {newLocation.activities.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0"
                            onClick={() => removeActivity(index, newLocation.activities, (activities) => 
                              setNewLocation(prev => ({ ...prev, activities }))
                            )}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => addActivity(newLocation.activities, (activities) => 
                        setNewLocation(prev => ({ ...prev, activities }))
                      )}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Add Activity
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleCreateLocation} 
                    disabled={!newLocation.name.trim() || !newLocation.activities.some(a => a.trim())}
                    className="w-full sm:w-auto"
                  >
                    Create Location
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Add New Location
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
