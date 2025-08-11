import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dataStorage, MissionData } from '@/lib/dataStorage';
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
import { useTranslation } from 'react-i18next';
import * as logger from '@/utils/logger';
import { useEvents } from '@/hooks/useEvents';
import {
  AnalysisData,
  ActivityData,
  EventAnalysisData,
  computeActivityData,
  computeEventAnalysisData,
  computePMStatistics,
  generateStatisticalReport,
} from '@/lib/analysis/summary';

export const useAnalysisLogic = (
  selectedDate: Date,
  selectedPeriod: 'day' | 'week' | 'month' | 'year'
) => {
  const { t } = useTranslation();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [eventAnalysisData, setEventAnalysisData] = useState<EventAnalysisData[]>([]);
  const { toast } = useToast();
  const { getEventsByMission } = useEvents();

  // Filter missions based on selected date and period
  const filteredMissions = useMemo(() => {
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

    const filtered = missions.filter((mission) => {
      const missionDate = new Date(mission.startTime);
      const isInRange = isWithinInterval(missionDate, {
        start: startDate,
        end: endDate,
      });

      // Debug each mission filtering
      logger.debug(
        `Mission "${mission.name}": start=${mission.startTime}, parsed=${missionDate.toISOString()}, inRange=${isInRange}, duration=${mission.durationMinutes}`
      );

      return isInRange;
    });

    logger.debug(
      `Filtered ${filtered.length} out of ${missions.length} missions for period ${selectedPeriod}`
    );
    return filtered;
  }, [missions, selectedDate, selectedPeriod]);

  const loadMissions = useCallback(async () => {
    try {
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: t('analysis.error'),
        description: t('analysis.errorLoadingMissions'),
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  const loadActivityData = useCallback(() => {
    try {
      if (filteredMissions.length === 0) {
        setActivityData([]);
        return;
      }

      const activities = computeActivityData(filteredMissions, t('analysis.unknownActivity'));
      setActivityData(activities);
    } catch (error) {
      console.error('Error loading activity data:', error);
      setActivityData([]);
    }
  }, [filteredMissions, t]);

  const loadEventAnalysis = useCallback(async () => {
    try {
      if (filteredMissions.length === 0) {
        setEventAnalysisData([]);
        return;
      }

      // Load events for all missions
      const eventsByMission = new Map();
      for (const mission of filteredMissions) {
        try {
          const events = await getEventsByMission(mission.id);
          eventsByMission.set(mission.id, events);
        } catch (error) {
          console.error(`Error loading events for mission ${mission.id}:`, error);
          eventsByMission.set(mission.id, []);
        }
      }

      const analysisResults = computeEventAnalysisData(filteredMissions, eventsByMission);
      setEventAnalysisData(analysisResults);
    } catch (error) {
      console.error('Error loading event analysis:', error);
      setEventAnalysisData([]);
    }
  }, [filteredMissions, getEventsByMission]);

  const generateAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      logger.debug('Total missions available:', missions.length);
      logger.debug('Filtered missions for analysis:', filteredMissions.length);
      logger.debug('Selected period:', selectedPeriod);
      logger.debug('Selected date:', selectedDate);

      // Debug mission dates to understand filtering
      if (missions.length > 0) {
        logger.debug(
          'All mission dates:',
          missions.map((m) => ({
            name: m.name,
            startTime: m.startTime,
            dateString: new Date(m.startTime).toLocaleDateString(),
          }))
        );

        // Calculate date range for debugging
        const now = new Date();
        const startDate =
          selectedPeriod === 'day'
            ? startOfDay(selectedDate)
            : selectedPeriod === 'week'
              ? startOfWeek(selectedDate, { weekStartsOn: 1 })
              : selectedPeriod === 'month'
                ? startOfMonth(selectedDate)
                : startOfYear(selectedDate);
        const endDate =
          selectedPeriod === 'day'
            ? endOfDay(selectedDate)
            : selectedPeriod === 'week'
              ? endOfWeek(selectedDate, { weekStartsOn: 1 })
              : selectedPeriod === 'month'
                ? endOfMonth(selectedDate)
                : endOfYear(selectedDate);

        logger.debug('Date range for filtering:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          todayForReference: now.toISOString(),
        });
      }

      if (filteredMissions.length === 0) {
        const hasAnyMissions = missions.length > 0;
        if (hasAnyMissions) {
          setStatisticalAnalysis(
            `${t(`analysis.noDataForPeriod.${selectedPeriod}`)}\n\n${t('analysis.youHaveMissions', { count: missions.length })}\n\n${t('analysis.tryTo')}\n${t('analysis.changePeriod')}\n${t('analysis.selectDifferentDate')}\n${t('analysis.goToHistory')}`
          );
        } else {
          setStatisticalAnalysis(
            `${t('analysis.noDataAvailable')}\n\n${t('analysis.forPersonalizedAnalysis')}\n${t('analysis.goToRealTime')}\n${t('analysis.connectSensor')}\n${t('analysis.startRecording')}\n${t('analysis.comeBackHere')}`
          );
        }
        setDataPoints({
          totalMissions: missions.length,
          totalExposureMinutes: 0,
          averagePM25: 0,
          maxPM25: 0,
          timeAboveWHO: 0,
        });
        setAnalysisGenerated(true);
        return;
      }

      const timeframeText =
        selectedPeriod === 'day'
          ? t('history.periods.day')
          : selectedPeriod === 'week'
            ? t('history.periods.week')
            : selectedPeriod === 'month'
              ? t('history.periods.month')
              : t('history.periods.year');

      // Generate comprehensive statistical analysis report
      const analysisText = generateStatisticalReport(
        filteredMissions,
        timeframeText,
        eventAnalysisData,
        t
      );

      // Calculate data points for UI display
      const totalExposureMinutes = filteredMissions.reduce(
        (sum, m) => sum + (m.durationMinutes || 0),
        0
      );

      const pmStats = computePMStatistics(filteredMissions);

      setStatisticalAnalysis(analysisText);
      setDataPoints({
        totalMissions: filteredMissions.length,
        totalExposureMinutes,
        averagePM25: pmStats.avgPM25,
        maxPM25: pmStats.maxPM25,
        timeAboveWHO: filteredMissions.reduce((total, mission) => {
          if (
            mission.avgPm25 != null &&
            !isNaN(mission.avgPm25) &&
            mission.avgPm25 > 15
          ) {
            return total + (mission.durationMinutes || 0);
          }
          return total;
        }, 0),
      });
      setAnalysisGenerated(true);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setStatisticalAnalysis(
        `${t('analysis.unableToGenerate')}\n\n${t('analysis.forPersonalizedReport')}\n${t('analysis.checkRecordedData')}\n${t('analysis.goToRealTimeForMeasures')}\n${t('analysis.comeBackInMoments')}\n\n${t('analysis.changePeriodIfPersists')}`
      );
      toast({
        title: t('analysis.analysisUnavailable'),
        description: t('analysis.checkDataAndRetry'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filteredMissions, missions, selectedDate, selectedPeriod, eventAnalysisData, t, toast]);

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Generate analysis when missions or date filter changes
  useEffect(() => {
    if (missions.length > 0 && !loading) {
      generateAnalysis();
      loadActivityData();
      loadEventAnalysis();
    }
  }, [missions, selectedDate, selectedPeriod, loading, generateAnalysis, loadActivityData, loadEventAnalysis]);

  const regenerateAnalysis = () => {
    setAnalysisGenerated(false);
    generateAnalysis();
  };

  return {
    missions,
    statisticalAnalysis,
    dataPoints,
    loading,
    analysisGenerated,
    activityData,
    eventAnalysisData,
    regenerateAnalysis,
  };
};