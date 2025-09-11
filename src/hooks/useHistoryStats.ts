import { useMemo } from 'react';
import { MissionData } from '@/lib/dataStorage';
import { useTranslation } from 'react-i18next';

export function useHistoryStats(filteredMissions: MissionData[]) {
  const { t } = useTranslation();
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const periodStats = useMemo(() => {
    if (filteredMissions.length === 0) {
      return [
        {
          label: t('history.stats.totalExposure'),
          value: '0 min',
          color: 'default' as const,
        },
        {
          label: t('history.stats.averagePM25'),
          value: 0,
          unit: 'µg/m³',
          color: 'default' as const,
        },
        {
          label: t('history.stats.pm25AboveWHO'),
          value: '0 min',
          color: 'default' as const,
        },
        {
          label: t('history.stats.pm10AboveWHO'),
          value: '0 min',
          color: 'default' as const,
        },
      ];
    }

    // Calculate total actual recording time (accounting for gaps)
    const totalActualDuration = filteredMissions.reduce(
      (sum, m) => sum + (m.actualRecordingMinutes || m.durationMinutes),
      0
    );

    // Calculate weighted average PM2.5 based on actual recording time
    const totalWeightedPM25 = filteredMissions.reduce((sum, m) => {
      const weight = m.actualRecordingMinutes || m.durationMinutes;
      return sum + (m.avgPm25 * weight);
    }, 0);
    
    const totalWeight = filteredMissions.reduce((sum, m) => {
      return sum + (m.actualRecordingMinutes || m.durationMinutes);
    }, 0);
    
    const weightedAvgPm25 = totalWeight > 0 ? totalWeightedPM25 / totalWeight : 0;

    // Calculate time above WHO thresholds based on individual measurements
    const timeAboveWHO_PM25 = filteredMissions.reduce((total, mission) => {
      if (!mission.measurements || mission.measurements.length === 0) {
        // Fallback to mission average if measurements not available
        return mission.avgPm25 > 15 
          ? total + (mission.actualRecordingMinutes || mission.durationMinutes)
          : total;
      }
      
      const actualDuration = mission.actualRecordingMinutes || mission.durationMinutes;
      const timePerMeasurement = actualDuration / mission.measurements.length;
      
      const measurementsAboveThreshold = mission.measurements.filter(m => m.pm25 > 15).length;
      return total + (measurementsAboveThreshold * timePerMeasurement);
    }, 0);

    const timeAboveWHO_PM10 = filteredMissions.reduce((total, mission) => {
      if (!mission.measurements || mission.measurements.length === 0) {
        // Fallback to mission average if measurements not available
        return mission.avgPm10 > 45 
          ? total + (mission.actualRecordingMinutes || mission.durationMinutes)
          : total;
      }
      
      const actualDuration = mission.actualRecordingMinutes || mission.durationMinutes;
      const timePerMeasurement = actualDuration / mission.measurements.length;
      
      const measurementsAboveThreshold = mission.measurements.filter(m => m.pm10 > 45).length;
      return total + (measurementsAboveThreshold * timePerMeasurement);
    }, 0);

    const getColorFromPm25 = (pm25: number) => {
      if (pm25 <= 12) return 'good' as const;
      if (pm25 <= 35) return 'moderate' as const;
      if (pm25 <= 55) return 'poor' as const;
      return 'poor' as const;
    };

    const getColorFromTime = (timeAbove: number, totalTime: number) => {
      const percentage = totalTime > 0 ? (timeAbove / totalTime) * 100 : 0;
      if (percentage <= 10) return 'good' as const;
      if (percentage <= 30) return 'moderate' as const;
      return 'poor' as const;
    };

    return [
      {
        label: t('history.stats.totalExposure'),
        value: formatDuration(Math.round(totalActualDuration)),
        color: 'default' as const,
      },
      {
        label: t('history.stats.averagePM25'),
        value: Math.round(weightedAvgPm25),
        unit: 'µg/m³',
        color: getColorFromPm25(weightedAvgPm25),
      },
      {
        label: t('history.stats.pm25AboveWHO'),
        value: formatDuration(Math.round(timeAboveWHO_PM25)),
        color: getColorFromTime(timeAboveWHO_PM25, totalActualDuration),
      },
      {
        label: t('history.stats.pm10AboveWHO'),
        value: formatDuration(Math.round(timeAboveWHO_PM10)),
        color: getColorFromTime(timeAboveWHO_PM10, totalActualDuration),
      },
    ];
  }, [filteredMissions, t]);

  return periodStats;
}
