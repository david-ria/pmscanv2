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
import { getColorForKey } from './utils';
import { getRespiratoryRate } from '@/lib/respiratoryRates';

type BreakdownType = 'location' | 'activity' | 'autocontext';
type PMType = 'pm1' | 'pm25' | 'pm10';

export interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
  cumulativeDose: number;
}

export const usePollutionBreakdownData = (
  missions: MissionData[],
  selectedPeriod: 'day' | 'week' | 'month' | 'year',
  selectedDate: Date,
  breakdownType: BreakdownType,
  pmType: PMType
): BreakdownData[] => {
  return useMemo(() => {
    // Filter missions based on selected date and period
    const filteredMissions = () => {
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
        default:
          return missions;
      }

      return missions.filter((mission) => {
        const missionDate = new Date(mission.startTime);
        return isWithinInterval(missionDate, {
          start: startDate,
          end: endDate,
        });
      });
    };

    // Calculate breakdown data based on type and PM selection
    const getBreakdownData = () => {
      const filtered = filteredMissions();
      if (filtered.length === 0) return [];

      const dataMap = new Map<
        string,
        {
          totalExposure: number;
          weightedPM: number;
          cumulativeDose: number;
          color: string;
        }
      >();

      filtered.forEach((mission) => {
        // For autocontext, we need to aggregate data from all measurements
        if (breakdownType === 'autocontext') {
          const contextMap = new Map<
            string,
            { totalExposure: number; weightedPM: number; cumulativeDose: number }
          >();

          mission.measurements.forEach((measurement) => {
            const autoContext = measurement.automaticContext || 'Inconnu';
            const pmValue =
              pmType === 'pm1'
                ? measurement.pm1
                : pmType === 'pm25'
                  ? measurement.pm25
                  : measurement.pm10;

            const existing = contextMap.get(autoContext) || {
              totalExposure: 0,
              weightedPM: 0,
              cumulativeDose: 0,
            };
            // Use actual recording time and account for recording frequency
            const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
            const measurementDuration = recordingTime / mission.measurements.length;
            const measurementDurationHours = measurementDuration / 60;
            
            // Get respiratory rate for this measurement
            const respiratoryRate = getRespiratoryRate(
              measurement.activityContext,
              measurement.locationContext,
              measurement.automaticContext
            );
            
            existing.totalExposure += measurementDuration;
            existing.weightedPM += pmValue * measurementDuration;
            existing.cumulativeDose += pmValue * measurementDurationHours * respiratoryRate; // Real inhaled dose in µg
            contextMap.set(autoContext, existing);
          });

          // Add each context from this mission to the main dataMap
          contextMap.forEach((data, context) => {
            const existing = dataMap.get(context) || {
              totalExposure: 0,
              weightedPM: 0,
              cumulativeDose: 0,
              color: getColorForKey(context),
            };
            existing.totalExposure += data.totalExposure;
            existing.weightedPM += data.weightedPM;
            existing.cumulativeDose += data.cumulativeDose;
            dataMap.set(context, existing);
          });
        } else {
          // For location and activity, aggregate from measurements like autocontext
          const contextMap = new Map<
            string,
            { totalExposure: number; weightedPM: number; cumulativeDose: number }
          >();

          mission.measurements.forEach((measurement) => {
            let contextValue = '';
            
            switch (breakdownType) {
              case 'location':
                contextValue = measurement.locationContext || 'Inconnue';
                break;
              case 'activity':
                contextValue = measurement.activityContext || 'Inconnue';
                break;
            }

            const pmValue =
              pmType === 'pm1'
                ? measurement.pm1
                : pmType === 'pm25'
                  ? measurement.pm25
                  : measurement.pm10;

            const existing = contextMap.get(contextValue) || {
              totalExposure: 0,
              weightedPM: 0,
              cumulativeDose: 0,
            };
            // Use actual recording time and account for recording frequency
            const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
            const measurementDuration = recordingTime / mission.measurements.length;
            const measurementDurationHours = measurementDuration / 60;
            
            // Get respiratory rate for this measurement
            const respiratoryRate = getRespiratoryRate(
              measurement.activityContext,
              measurement.locationContext,
              measurement.automaticContext
            );
            
            existing.totalExposure += measurementDuration;
            existing.weightedPM += pmValue * measurementDuration;
            existing.cumulativeDose += pmValue * measurementDurationHours * respiratoryRate; // Real inhaled dose in µg
            contextMap.set(contextValue, existing);
          });

          // Add each context from this mission to the main dataMap
          contextMap.forEach((data, context) => {
            const existing = dataMap.get(context) || {
              totalExposure: 0,
              weightedPM: 0,
              cumulativeDose: 0,
              color: getColorForKey(context),
            };
            existing.totalExposure += data.totalExposure;
            existing.weightedPM += data.weightedPM;
            existing.cumulativeDose += data.cumulativeDose;
            dataMap.set(context, existing);
          });
        }
      });

      // First, get entries with PM data and sort them
      const validEntries = Array.from(dataMap.entries())
        .map(([key, data]) => {
          const avgPM =
            data.totalExposure > 0 ? data.weightedPM / data.totalExposure : 0;
          return {
            name: key,
            avgPM: avgPM,
            color: data.color,
            exposure: data.totalExposure,
            cumulativeDose: data.cumulativeDose,
          };
        })
        .filter((item) => item.avgPM > 0) // Only show categories with PM data
        .sort((a, b) => b.avgPM - a.avgPM) // Sort by PM concentration
        .slice(0, 5); // Show top 5

      // Calculate total average PM for percentage calculation
      const totalAvgPM = validEntries.reduce(
        (sum, item) => sum + item.avgPM,
        0
      );

      return validEntries.map((entry) => ({
        ...entry,
        percentage:
          totalAvgPM > 0
            ? (entry.avgPM / totalAvgPM) * 100
            : 0,
      }));
    };

    return getBreakdownData();
  }, [missions, selectedPeriod, selectedDate, breakdownType, pmType]);
};
