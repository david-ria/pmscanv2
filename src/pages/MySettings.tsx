import { useState } from 'react';
import { Plus, MapPin, Activity, Bell, Calendar, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  useUserLocations, 
  useUserActivities, 
  useUserAlarms, 
  useUserEvents,
  UserLocation,
  UserActivity,
  UserAlarm,
  UserEvent
} from '@/hooks/useUserSettings';
import { LocationDialog } from '@/components/Settings/LocationDialog';
import { ActivityDialog } from '@/components/Settings/ActivityDialog';
import { AlarmDialog } from '@/components/Settings/AlarmDialog';
import { EventDialog } from '@/components/Settings/EventDialog';
import { MenuPageHeader } from '@/components/MenuPageHeader';
import { useTranslation } from 'react-i18next';

export default function MySettings() {
  const { t } = useTranslation();
  const { locations, loading: locationsLoading, deleteLocation } = useUserLocations();
  const { activities, loading: activitiesLoading, deleteActivity } = useUserActivities();
  const { alarms, loading: alarmsLoading, deleteAlarm } = useUserAlarms();
  const { events, loading: eventsLoading, deleteEvent } = useUserEvents();

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [alarmDialogOpen, setAlarmDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const [editingLocation, setEditingLocation] = useState<UserLocation | undefined>();
  const [editingActivity, setEditingActivity] = useState<UserActivity | undefined>();
  const [editingAlarm, setEditingAlarm] = useState<UserAlarm | undefined>();
  const [editingEvent, setEditingEvent] = useState<UserEvent | undefined>();

  const handleEditLocation = (location: UserLocation) => {
    setEditingLocation(location);
    setLocationDialogOpen(true);
  };

  const handleEditActivity = (activity: UserActivity) => {
    setEditingActivity(activity);
    setActivityDialogOpen(true);
  };

  const handleEditAlarm = (alarm: UserAlarm) => {
    setEditingAlarm(alarm);
    setAlarmDialogOpen(true);
  };

  const handleEditEvent = (event: UserEvent) => {
    setEditingEvent(event);
    setEventDialogOpen(true);
  };

  const handleCloseLocationDialog = () => {
    setLocationDialogOpen(false);
    setEditingLocation(undefined);
  };

  const handleCloseActivityDialog = () => {
    setActivityDialogOpen(false);
    setEditingActivity(undefined);
  };

  const handleCloseAlarmDialog = () => {
    setAlarmDialogOpen(false);
    setEditingAlarm(undefined);
  };

  const handleCloseEventDialog = () => {
    setEventDialogOpen(false);
    setEditingEvent(undefined);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <MenuPageHeader 
          title={t('settingsMenu.mySettings')}
          subtitle={t('mySettings.subtitle')}
        />

      <Tabs defaultValue="locations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="locations" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('mySettings.tabs.locations')}</span>
              <span className="sm:hidden">Lieux</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('mySettings.tabs.activities')}</span>
              <span className="sm:hidden">Act.</span>
            </TabsTrigger>
            <TabsTrigger value="alarms" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('mySettings.tabs.alarms')}</span>
              <span className="sm:hidden">Alarm.</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('mySettings.tabs.events')}</span>
              <span className="sm:hidden">Évén.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">{t('mySettings.sections.locations')}</h2>
              <Button onClick={() => setLocationDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('mySettings.actions.addLocation')}</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>

            {locationsLoading ? (
              <div>{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Card key={location.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocation(location.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {location.description && (
                      <p className="text-sm text-muted-foreground mb-2">{location.description}</p>
                    )}
                    {location.latitude && location.longitude && (
                      <p className="text-xs text-muted-foreground">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">{t('mySettings.sections.activities')}</h2>
              <Button onClick={() => setActivityDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('mySettings.actions.addActivity')}</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>

            {activitiesLoading ? (
              <div>{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {activity.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditActivity(activity)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteActivity(activity.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    )}
                    {activity.icon && (
                      <Badge variant="outline" className="mt-2">{activity.icon}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

          <TabsContent value="alarms" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">{t('mySettings.sections.alarms')}</h2>
              <Button onClick={() => setAlarmDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('mySettings.actions.addAlarm')}</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>

            {alarmsLoading ? (
              <div>{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alarms.map((alarm) => (
                <Card key={alarm.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {alarm.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAlarm(alarm)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlarm(alarm.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alarm.pm1_threshold && (
                        <div className="text-sm">PM1: {alarm.pm1_threshold} μg/m³</div>
                      )}
                      {alarm.pm25_threshold && (
                        <div className="text-sm">PM2.5: {alarm.pm25_threshold} μg/m³</div>
                      )}
                      {alarm.pm10_threshold && (
                        <div className="text-sm">PM10: {alarm.pm10_threshold} μg/m³</div>
                      )}
                      <div className="flex gap-2">
                        <Badge variant={alarm.enabled ? "default" : "secondary"}>
                          {alarm.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="outline">{alarm.notification_frequency}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">My Events</h2>
            <Button onClick={() => setEventDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Event</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>

          {eventsLoading ? (
            <div>Loading events...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {event.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    )}
                    <div className="space-y-1">
                      <Badge variant="outline">{event.event_type}</Badge>
                        {event.start_date && (
                          <div className="text-xs text-muted-foreground">
                            {t('mySettings.startDate')}: {new Date(event.start_date).toLocaleDateString()}
                          </div>
                        )}
                        {event.end_date && (
                          <div className="text-xs text-muted-foreground">
                            {t('mySettings.endDate')}: {new Date(event.end_date).toLocaleDateString()}
                          </div>
                        )}
                        <Badge variant={event.enabled ? "default" : "secondary"}>
                          {event.enabled ? t('common.enabled') : t('common.disabled')}
                        </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={handleCloseLocationDialog}
        location={editingLocation}
      />

      <ActivityDialog
        open={activityDialogOpen}
        onOpenChange={handleCloseActivityDialog}
        activity={editingActivity}
      />

      <AlarmDialog
        open={alarmDialogOpen}
        onOpenChange={handleCloseAlarmDialog}
        alarm={editingAlarm}
      />

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={handleCloseEventDialog}
        event={editingEvent}
      />
      </div>
    </div>
  );
}