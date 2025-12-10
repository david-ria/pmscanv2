import { useMemo } from 'react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from 'date-fns';
import { MissionData } from '@/lib/dataStorage';
import { getColorForKey } from './PollutionBreakdown/utils';
import type { BreakdownData } from './PollutionBreakdown/usePollutionBreakdownData';
import type { ContextType } from './ContextTypeSelector';
import type { PollutantType } from './PollutantSelector';

export const useExposureAnalysisData = (
  missions: MissionData[],
  selectedPeriod: 'day' | 'week' | 'month' | 'year',
  selectedDate: Date,
  contextType: ContextType,
  pollutantType: PollutantType
): BreakdownData[] => {
  return useMemo(() => {
    // Filter missions based on selected date and period
    const getDateRange = () => {
      switch (selectedPeriod) {
        case 'day':
          return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
        case 'week':
          return { 
            start: startOfWeek(selectedDate, { weekStartsOn: 1 }), 
            end: endOfWeek(selectedDate, { weekStartsOn: 1 }) 
          };
        case 'month':
          return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
        case 'year':
          return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
        default:
          return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      }
    };

    const { start, end } = getDateRange();
    
    const filteredMissions = missions.filter((mission) => {
      const missionDate = new Date(mission.startTime);
      return isWithinInterval(missionDate, { start, end });
    });

    if (filteredMissions.length === 0) return [];

    // Aggregate data by context type
    const dataMap = new Map<string, {
      totalExposure: number;
      weightedValue: number;
      cumulativeDose: number;
      color: string;
    }>();

    filteredMissions.forEach((mission) => {
      mission.measurements.forEach((measurement) => {
        // Get context value based on type
        let contextValue = '';
        switch (contextType) {
          case 'location':
            contextValue = measurement.locationContext || 'Inconnue';
            break;
          case 'activity':
            contextValue = measurement.activityContext || 'Inconnue';
            break;
          case 'autocontext':
            contextValue = measurement.automaticContext || 'Inconnu';
            break;
        }

        // Get pollutant value
        let pollutantValue = 0;
        switch (pollutantType) {
          case 'pm1':
            pollutantValue = measurement.pm1;
            break;
          case 'pm25':
            pollutantValue = measurement.pm25;
            break;
          case 'pm10':
            pollutantValue = measurement.pm10;
            break;
          case 'tvoc':
            pollutantValue = measurement.tvoc ?? 0;
            break;
        }

        // Calculate duration per measurement
        const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
        const measurementDuration = recordingTime / mission.measurements.length;
        const measurementDurationHours = measurementDuration / 60;

        const existing = dataMap.get(contextValue) || {
          totalExposure: 0,
          weightedValue: 0,
          cumulativeDose: 0,
          color: getColorForKey(contextValue),
        };

        existing.totalExposure += measurementDuration;
        existing.weightedValue += pollutantValue * measurementDuration;
        existing.cumulativeDose += pollutantValue * measurementDurationHours;
        dataMap.set(contextValue, existing);
      });
    });

    // Convert to array and calculate percentages
    const validEntries = Array.from(dataMap.entries())
      .map(([name, data]) => ({
        name,
        avgPM: data.totalExposure > 0 ? data.weightedValue / data.totalExposure : 0,
        color: data.color,
        exposure: data.totalExposure,
        cumulativeDose: data.cumulativeDose,
        percentage: 0,
      }))
      .filter((item) => item.cumulativeDose > 0)
      .sort((a, b) => b.cumulativeDose - a.cumulativeDose)
      .slice(0, 10); // Show top 10

    const totalCumulativeDose = validEntries.reduce((sum, item) => sum + item.cumulativeDose, 0);

    return validEntries.map((entry) => ({
      ...entry,
      percentage: totalCumulativeDose > 0 ? (entry.cumulativeDose / totalCumulativeDose) * 100 : 0,
    }));
  }, [missions, selectedPeriod, selectedDate, contextType, pollutantType]);
};
