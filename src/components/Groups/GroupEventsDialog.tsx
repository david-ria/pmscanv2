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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useSubscription } from '@/hooks/useSubscription';

interface GroupEventsDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupEventsDialog({ groupId, open, onOpenChange }: GroupEventsDialogProps) {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useGroupEvents(groupId);
  const { features } = useSubscription();
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    icon: 'calendar',
    color: '#3b82f6',
    enabled: true,
  });

  const handleCreateEvent = async () => {
    if (!newEvent.name.trim()) return;
    
    await createEvent(newEvent);
    setNewEvent({
      name: '',
      description: '',
      icon: 'calendar',
      color: '#3b82f6',
      enabled: true,
    });
    setIsCreating(false);
  };

  const commonIcons = [
    'calendar', 'circle', 'square', 'triangle', 'star', 'heart',
    'flag', 'alert-circle', 'info', 'check-circle', 'x-circle'
  ];

  if (!features.customEvents) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Premium Feature</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Custom event types are available in Premium and Enterprise plans.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Group Event Types</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-6">
          {/* Existing Events */}
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" style={{ color: event.color }} />
                      {event.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.enabled ? 'default' : 'secondary'}>
                        {event.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Event Name</Label>
                      <Input
                        value={event.name}
                        onChange={(e) => updateEvent(event.id, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Icon</Label>
                      <Input
                        value={event.icon}
                        onChange={(e) => updateEvent(event.id, { icon: e.target.value })}
                        placeholder="calendar"
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={event.color}
                        onChange={(e) => updateEvent(event.id, { color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={event.description || ''}
                      onChange={(e) => updateEvent(event.id, { description: e.target.value })}
                      placeholder="Optional description of this event type"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={event.enabled}
                      onCheckedChange={(checked) => updateEvent(event.id, { enabled: checked })}
                    />
                    <Label>Enabled</Label>
                  </div>
                </CardContent>
              </Card>
            ))}

            {events.length === 0 && !isCreating && (
              <div className="text-center py-8 text-muted-foreground">
                No custom event types configured. Create your first event type to get started.
              </div>
            )}
          </div>

          {/* Create New Event */}
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Event Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Event Name</Label>
                    <Input
                      value={newEvent.name}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Traffic Incident"
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Input
                      value={newEvent.icon}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="calendar"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {commonIcons.map((icon) => (
                        <Button
                          key={icon}
                          size="sm"
                          variant="outline"
                          onClick={() => setNewEvent(prev => ({ ...prev, icon }))}
                          className="text-xs h-6"
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={newEvent.color}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of this event type"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateEvent} disabled={!newEvent.name.trim()}>
                    Create Event Type
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
              Add New Event Type
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
