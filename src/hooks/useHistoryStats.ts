import { useMemo } from 'react';
import { MissionData } from '@/lib/dataStorage';
import { useTranslation } from 'react-i18next';
import { calculateMissionStatistics } from '@/utils/missionStatistics';

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
    const stats = calculateMissionStatistics(filteredMissions);

    if (stats.validMissions === 0) {
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
        value: formatDuration(stats.totalExposureMinutes),
        color: 'default' as const,
      },
      {
        label: t('history.stats.averagePM25'),
        value: Math.round(stats.avgPm25),
        unit: 'µg/m³',
        color: getColorFromPm25(stats.avgPm25),
      },
      {
        label: t('history.stats.pm25AboveWHO'),
        value: formatDuration(stats.timeAboveWHO_PM25),
        color: getColorFromTime(stats.timeAboveWHO_PM25, stats.totalExposureMinutes),
      },
      {
        label: t('history.stats.pm10AboveWHO'),
        value: formatDuration(stats.timeAboveWHO_PM10),
        color: getColorFromTime(stats.timeAboveWHO_PM10, stats.totalExposureMinutes),
      },
    ];
  }, [filteredMissions, t]);

  return periodStats;
}
