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

    // Use actual recording time where available, fall back to duration
    const totalDuration = filteredMissions.reduce(
      (sum, m) => sum + (m.actualRecordingMinutes ?? m.durationMinutes),
      0
    );
    
    // Calculate weighted average PM2.5 using actual recording time
    const weightedPm25Sum = filteredMissions.reduce((sum, m) => {
      const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
      return sum + (m.avgPm25 * recordingTime);
    }, 0);
    const avgPm25 = totalDuration > 0 ? weightedPm25Sum / totalDuration : 0;

    // Calculate time above WHO thresholds using actual recording time
    const timeAboveWHO_PM25 = filteredMissions.reduce((sum, m) => {
      const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
      return m.avgPm25 > 15 ? sum + recordingTime : sum;
    }, 0);

    const timeAboveWHO_PM10 = filteredMissions.reduce((sum, m) => {
      const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
      return m.avgPm10 > 45 ? sum + recordingTime : sum;
    }, 0);

    const getColorFromPm25 = (pm25: number) => {
      if (pm25 <= 12) return 'good' as const;
      if (pm25 <= 35) return 'moderate' as const;
      if (pm25 <= 55) return 'poor' as const;
      return 'poor' as const;
    };

    const getColorFromTime = (timeAbove: number, totalTime: number) => {
      const percentage = (timeAbove / totalTime) * 100;
      if (percentage <= 10) return 'good' as const;
      if (percentage <= 30) return 'moderate' as const;
      return 'poor' as const;
    };

    return [
      {
        label: t('history.stats.totalExposure'),
        value: formatDuration(totalDuration),
        color: 'default' as const,
      },
      {
        label: t('history.stats.averagePM25'),
        value: Math.round(avgPm25),
        unit: 'µg/m³',
        color: getColorFromPm25(avgPm25),
      },
      {
        label: t('history.stats.pm25AboveWHO'),
        value: formatDuration(timeAboveWHO_PM25),
        color: getColorFromTime(timeAboveWHO_PM25, totalDuration),
      },
      {
        label: t('history.stats.pm10AboveWHO'),
        value: formatDuration(timeAboveWHO_PM10),
        color: getColorFromTime(timeAboveWHO_PM10, totalDuration),
      },
    ];
  }, [filteredMissions, t]);

  return periodStats;
}
