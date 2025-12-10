import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { MissionData, MeasurementData } from '@/lib/dataStorage';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';

export const useGroupMissions = (
  selectedDate: Date,
  selectedPeriod: 'day' | 'week' | 'month' | 'year'
) => {
  const { activeGroup } = useGroupSettings();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGroupMissions = async () => {
      if (!activeGroup?.id) {
        setMissions([]);
        return;
      }

      setLoading(true);

      try {
        // Calculate date range
        let startDate: Date;
        let endDate: Date;

        switch (selectedPeriod) {
          case 'day':
            startDate = startOfDay(selectedDate);
            endDate = endOfDay(selectedDate);
            break;
          case 'week':
            startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
            endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
            break;
          case 'month':
            startDate = startOfMonth(selectedDate);
            endDate = endOfMonth(selectedDate);
            break;
          case 'year':
            startDate = startOfYear(selectedDate);
            endDate = endOfYear(selectedDate);
            break;
        }

        // Fetch shared missions from the group
        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('*')
          .eq('group_id', activeGroup.id)
          .eq('shared', true)
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString());

        if (missionsError) {
          console.error('Error fetching group missions:', missionsError);
          setMissions([]);
          return;
        }

        if (!missionsData || missionsData.length === 0) {
          setMissions([]);
          return;
        }

        // Fetch measurements for all missions
        const missionIds = missionsData.map((m) => m.id);
        const { data: measurementsData, error: measurementsError } = await supabase
          .from('measurements')
          .select('*')
          .in('mission_id', missionIds);

        if (measurementsError) {
          console.error('Error fetching measurements:', measurementsError);
        }

        // Map missions with their measurements
        const missionsWithMeasurements: MissionData[] = missionsData.map((mission) => ({
          id: mission.id,
          userId: mission.user_id ?? undefined,
          name: mission.name,
          startTime: new Date(mission.start_time),
          endTime: new Date(mission.end_time),
          durationMinutes: mission.duration_minutes,
          actualRecordingMinutes: mission.actual_recording_minutes ?? undefined,
          avgPm1: mission.avg_pm1,
          avgPm25: mission.avg_pm25,
          avgPm10: mission.avg_pm10,
          maxPm25: mission.max_pm25,
          measurementsCount: mission.measurements_count,
          deviceName: mission.device_name ?? undefined,
          recordingFrequency: mission.recording_frequency ?? 'normal',
          shared: mission.shared ?? false,
          groupId: mission.group_id ?? undefined,
          synced: true,
          measurements: (measurementsData || [])
            .filter((m) => m.mission_id === mission.id)
            .map((m): MeasurementData => ({
              id: m.id,
              timestamp: new Date(m.timestamp),
              pm1: m.pm1,
              pm25: m.pm25,
              pm10: m.pm10,
              temperature: m.temperature ?? undefined,
              humidity: m.humidity ?? undefined,
              pressure: m.pressure ?? undefined,
              tvoc: m.tvoc ?? undefined,
              latitude: m.latitude ?? undefined,
              longitude: m.longitude ?? undefined,
              accuracy: m.accuracy ?? undefined,
              locationContext: m.location_context ?? undefined,
              activityContext: m.activity_context ?? undefined,
              automaticContext: m.automatic_context ?? undefined,
              geohash: m.geohash ?? undefined,
            })),
        }));

        setMissions(missionsWithMeasurements);
      } catch (error) {
        console.error('Error in useGroupMissions:', error);
        setMissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupMissions();
  }, [activeGroup?.id, selectedDate, selectedPeriod]);

  return { missions, loading };
};
