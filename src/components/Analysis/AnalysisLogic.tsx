import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { getRespiratoryRate } from '@/lib/respiratoryRates';
import { calculateMissionStatistics } from '@/utils/missionStatistics';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisData {
  totalMissions: number;
  totalExposureMinutes: number;
  averagePM25: number;
  maxPM25: number;
  timeAboveWHO: number;
}

interface ActivityData {
  activity: string;
  timeSpent: number;
  cumulativeDose: number; // In µg (inhaled dose)
  averageExposure: number;
  measurements: number;
  respiratoryRate: number; // In m³/h
}

interface EventAnalysisData {
  eventType: string;
  eventCount: number;
  avgPM25DuringEvent: number;
  avgPM10DuringEvent: number;
  avgPM1DuringEvent: number;
  avgPM25AroundEvent: number; // Average PM in 5 minutes before/after
  eventImpact: number; // Percentage increase compared to baseline
}

export const useAnalysisLogic = (
  selectedDate: Date,
  selectedPeriod: 'day' | 'week' | 'month' | 'year',
  filterByCurrentUser: boolean = false // NEW: Filter by current user (for Personal tab)
) => {
  const { t } = useTranslation();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [eventAnalysisData, setEventAnalysisData] = useState<EventAnalysisData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { getEventsByMission } = useEvents();
  const loadedMissionIds = useRef<Set<string>>(new Set());

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

    let filtered = missions.filter((mission) => {
      const missionDate = new Date(mission.startTime);
      return isWithinInterval(missionDate, {
        start: startDate,
        end: endDate,
      });
    });

    // NEW: Filter by current user if requested (Personal tab)
    if (filterByCurrentUser && currentUserId) {
      filtered = filtered.filter(m => m.userId === currentUserId);
    }

    logger.rateLimitedDebug(
      'analysis-filter-summary',
      5000,
      `Analysis filter: ${filtered.length} of ${missions.length} missions for ${selectedPeriod}, user filter: ${filterByCurrentUser}`
    );
    return filtered;
  }, [missions, selectedDate, selectedPeriod, filterByCurrentUser, currentUserId]);

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

  // Load current user ID
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setCurrentUserId(data.user.id);
        }
      } catch (error) {
        logger.error('Error loading user ID:', error);
      }
    };
    loadUserId();
  }, []);

  // Bulk load measurements for filtered missions
  useEffect(() => {
    const loadMeasurements = async () => {
      const missingMissions = filteredMissions.filter(
        m => m.measurements.length === 0 && !loadedMissionIds.current.has(m.id)
      );

      if (missingMissions.length === 0) return;

      setLoadingMeasurements(true);
      try {
        const missionIds = missingMissions.map(m => m.id);
        const measurementsByMission = await dataStorage.getMeasurementsForMissions(missionIds);

        // Merge measurements into missions
        setMissions(prev => prev.map(m => {
          if (measurementsByMission[m.id]) {
            loadedMissionIds.current.add(m.id);
            return { ...m, measurements: measurementsByMission[m.id] };
          }
          return m;
        }));
      } catch (error) {
        logger.error('Error loading measurements:', error);
      } finally {
        setLoadingMeasurements(false);
      }
    };

    loadMeasurements();
  }, [filteredMissions]);

  const loadActivityData = useCallback(() => {
    try {
      if (filteredMissions.length === 0) {
        setActivityData([]);
        return;
      }

      // Group missions by activity context
      const activityMap = new Map<
        string,
        {
          totalDuration: number;
          totalPM25: number;
          cumulativeDose: number;
          measurements: number;
          respiratoryRate: number;
        }
      >();

      filteredMissions.forEach((mission) => {
        // Get most common activity from measurements
        const activityCounts = new Map<string, number>();
        mission.measurements.forEach(m => {
          if (m.activityContext) {
            activityCounts.set(m.activityContext, (activityCounts.get(m.activityContext) || 0) + 1);
          }
        });
        const dominantActivity = activityCounts.size > 0 
          ? Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : undefined;
        
        const activity = dominantActivity || t('analysis.unknownActivity');
        const respiratoryRate = getRespiratoryRate(
          dominantActivity,
          undefined, // No mission-level location context
          undefined
        );
        
        const existing = activityMap.get(activity) || {
          totalDuration: 0,
          totalPM25: 0,
          cumulativeDose: 0,
          measurements: 0,
          respiratoryRate: respiratoryRate,
        };

        const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
        const durationHours = recordingTime / 60; // Convert minutes to hours
        // Real inhaled dose: Concentration × Time × Respiratory Rate
        const dose = mission.avgPm25 * durationHours * respiratoryRate; // µg

        existing.totalDuration += recordingTime;
        existing.totalPM25 += mission.avgPm25 * recordingTime; // Weight by actual recording time
        existing.cumulativeDose += dose; // Cumulative dose in µg (inhaled)
        existing.measurements += mission.measurementsCount;
        // Keep the same respiratory rate for consistency within activity
        existing.respiratoryRate = respiratoryRate;

        activityMap.set(activity, existing);
      });

      // Convert to array and calculate averages
      const activities = Array.from(activityMap.entries()).map(
        ([activity, data]) => ({
          activity,
          timeSpent: data.totalDuration,
          cumulativeDose: data.cumulativeDose, // Total cumulative dose for this activity in µg
          averageExposure:
            data.totalDuration > 0 ? data.totalPM25 / data.totalDuration : 0,
          measurements: data.measurements,
          respiratoryRate: data.respiratoryRate,
        })
      );

      // Sort by cumulative dose (descending) - most exposed activities first
      activities.sort((a, b) => b.cumulativeDose - a.cumulativeDose);
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

      const eventTypeMap = new Map<string, {
        events: Array<{ id: string; eventType: string; timestamp: Date; location?: string }>;
        pmMeasurements: { pm1: number; pm25: number; pm10: number; timestamp: Date }[];
        surroundingPmMeasurements: { pm1: number; pm25: number; pm10: number; timestamp: Date }[];
      }>();

      // Load events for each mission and analyze PM levels
      for (const mission of filteredMissions) {
        try {
          const events = await getEventsByMission(mission.id);
          
          for (const event of events) {
            const eventType = event.eventType || 'unknown';
            const eventTime = new Date(event.timestamp);
            
            if (!eventTypeMap.has(eventType)) {
              eventTypeMap.set(eventType, {
                events: [],
                pmMeasurements: [],
                surroundingPmMeasurements: []
              });
            }
            
            const eventData = eventTypeMap.get(eventType)!;
            eventData.events.push(event);
            
            // Find measurements within 2 minutes of the event
            const eventWindowMs = 2 * 60 * 1000; // 2 minutes
            const surroundingWindowMs = 5 * 60 * 1000; // 5 minutes for baseline
            
            const eventMeasurements = mission.measurements.filter(m => {
              const measurementTime = new Date(m.timestamp);
              const timeDiff = Math.abs(measurementTime.getTime() - eventTime.getTime());
              return timeDiff <= eventWindowMs;
            });
            
            const surroundingMeasurements = mission.measurements.filter(m => {
              const measurementTime = new Date(m.timestamp);
              const timeDiff = Math.abs(measurementTime.getTime() - eventTime.getTime());
              return timeDiff > eventWindowMs && timeDiff <= surroundingWindowMs;
            });
            
            eventMeasurements.forEach(m => {
              eventData.pmMeasurements.push({
                pm1: m.pm1,
                pm25: m.pm25,
                pm10: m.pm10,
                timestamp: new Date(m.timestamp)
              });
            });
            
            surroundingMeasurements.forEach(m => {
              eventData.surroundingPmMeasurements.push({
                pm1: m.pm1,
                pm25: m.pm25,
                pm10: m.pm10,
                timestamp: new Date(m.timestamp)
              });
            });
          }
        } catch (error) {
          console.error(`Error loading events for mission ${mission.id}:`, error);
        }
      }

      // Calculate analysis for each event type
      const analysisResults: EventAnalysisData[] = Array.from(eventTypeMap.entries()).map(([eventType, data]) => {
        const avgPM25DuringEvent = data.pmMeasurements.length > 0
          ? data.pmMeasurements.reduce((sum, m) => sum + m.pm25, 0) / data.pmMeasurements.length
          : 0;
        
        const avgPM10DuringEvent = data.pmMeasurements.length > 0
          ? data.pmMeasurements.reduce((sum, m) => sum + m.pm10, 0) / data.pmMeasurements.length
          : 0;
        
        const avgPM1DuringEvent = data.pmMeasurements.length > 0
          ? data.pmMeasurements.reduce((sum, m) => sum + m.pm1, 0) / data.pmMeasurements.length
          : 0;
        
        const avgPM25AroundEvent = data.surroundingPmMeasurements.length > 0
          ? data.surroundingPmMeasurements.reduce((sum, m) => sum + m.pm25, 0) / data.surroundingPmMeasurements.length
          : 0;
        
        const eventImpact = avgPM25AroundEvent > 0
          ? ((avgPM25DuringEvent - avgPM25AroundEvent) / avgPM25AroundEvent) * 100
          : 0;

        return {
          eventType,
          eventCount: data.events.length,
          avgPM25DuringEvent,
          avgPM10DuringEvent,
          avgPM1DuringEvent,
          avgPM25AroundEvent,
          eventImpact
        };
      });

      // Sort by impact (highest first)
      analysisResults.sort((a, b) => b.eventImpact - a.eventImpact);
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

        // Calculate date range for debugging (moved outside to avoid re-render loop)
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

      // Calculate unified statistics using shared utility
      const stats = calculateMissionStatistics(filteredMissions);
      
      const {
        validMissions,
        totalExposureMinutes,
        avgPm1: avgPM1,
        avgPm25: avgPM25,
        avgPm10: avgPM10,
        maxPm1: maxPM1,
        maxPm25: maxPM25,
        maxPm10: maxPM10,
        timeAboveWHO_PM25,
        timeAboveWHO_PM10,
      } = stats;

      // Calculate total cumulative inhaled dose using valid missions only
      const validMissionsArray = filteredMissions.filter(
        (m) =>
          m.avgPm25 != null &&
          !isNaN(m.avgPm25) &&
          m.avgPm1 != null &&
          !isNaN(m.avgPm1) &&
          m.avgPm10 != null &&
          !isNaN(m.avgPm10)
      );
      
      const totalCumulativeDosePM25 = validMissionsArray.reduce((total, mission) => {
        const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
        const durationHours = recordingTime / 60;
        // Get dominant activity from measurements
        const activityCounts = new Map<string, number>();
        mission.measurements.forEach(m => {
          if (m.activityContext) {
            activityCounts.set(m.activityContext, (activityCounts.get(m.activityContext) || 0) + 1);
          }
        });
        const dominantActivity = activityCounts.size > 0 
          ? Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : undefined;
        const respiratoryRate = getRespiratoryRate(dominantActivity, undefined, undefined);
        return total + mission.avgPm25 * durationHours * respiratoryRate;
      }, 0);

      const totalCumulativeDosePM10 = filteredMissions.reduce((total, mission) => {
        const recordingTime = mission.actualRecordingMinutes ?? mission.durationMinutes;
        const durationHours = recordingTime / 60;
        // Get dominant activity from measurements
        const activityCounts = new Map<string, number>();
        mission.measurements.forEach(m => {
          if (m.activityContext) {
            activityCounts.set(m.activityContext, (activityCounts.get(m.activityContext) || 0) + 1);
          }
        });
        const dominantActivity = activityCounts.size > 0 
          ? Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : undefined;
        const respiratoryRate = getRespiratoryRate(dominantActivity, undefined, undefined);
        return total + mission.avgPm10 * durationHours * respiratoryRate;
      }, 0);

      // Create comprehensive statistical summary
      const exposureHours = (totalExposureMinutes / 60).toFixed(1);
      const whoExceedancePercentage_PM25 =
        totalExposureMinutes > 0
          ? ((timeAboveWHO_PM25 / totalExposureMinutes) * 100).toFixed(1)
          : 0;
      const whoExceedancePercentage_PM10 =
        totalExposureMinutes > 0
          ? ((timeAboveWHO_PM10 / totalExposureMinutes) * 100).toFixed(1)
          : 0;

      // Overall air quality assessment based on most restrictive PM value
      const getAirQualityStatus = () => {
        const worstPM = Math.max(avgPM25, avgPM10 / 3); // Normalize PM10 for comparison
        if (worstPM <= 12)
          return `✅ ${t('analysis.airQuality.good')}`;
        if (worstPM <= 35)
          return `⚠️ ${t('analysis.airQuality.moderate')}`;
        if (worstPM <= 55)
          return `🔶 ${t('analysis.airQuality.poor')}`;
        return `🔴 ${t('analysis.airQuality.veryPoor')}`;
      };

      // Generate contextual analysis with cumulative dose per context
      const generateContextualAnalysis = (missions: MissionData[]) => {
        const contextMaps = {
          location: new Map<string, { exposure: number; dose: number; avgPM: number }>(),
          activity: new Map<string, { exposure: number; dose: number; avgPM: number }>(),
          autocontext: new Map<string, { exposure: number; dose: number; avgPM: number }>()
        };

        missions.forEach(mission => {
          mission.measurements.forEach(measurement => {
            const measurementDuration = mission.durationMinutes / mission.measurements.length;
            const measurementDurationHours = measurementDuration / 60;
            
            // Get respiratory rate based on measurement context
            const respiratoryRate = getRespiratoryRate(
              measurement.activityContext,
              measurement.locationContext,
              measurement.automaticContext
            );
            
            // Real inhaled dose: Concentration × Time × Respiratory Rate
            const dose = measurement.pm25 * measurementDurationHours * respiratoryRate;

            // Location context
            const location = measurement.locationContext || 'Inconnue';
            const locationData = contextMaps.location.get(location) || { exposure: 0, dose: 0, avgPM: 0 };
            locationData.exposure += measurementDuration;
            locationData.dose += dose;
            locationData.avgPM += measurement.pm25 * measurementDuration;
            contextMaps.location.set(location, locationData);

            // Activity context
            const activity = measurement.activityContext || 'Inconnue';
            const activityData = contextMaps.activity.get(activity) || { exposure: 0, dose: 0, avgPM: 0 };
            activityData.exposure += measurementDuration;
            activityData.dose += dose;
            activityData.avgPM += measurement.pm25 * measurementDuration;
            contextMaps.activity.set(activity, activityData);

            // Auto context
            if (measurement.automaticContext && measurement.automaticContext !== 'unknown') {
              const autoContext = measurement.automaticContext;
              const autoData = contextMaps.autocontext.get(autoContext) || { exposure: 0, dose: 0, avgPM: 0 };
              autoData.exposure += measurementDuration;
              autoData.dose += dose;
              autoData.avgPM += measurement.pm25 * measurementDuration;
              contextMaps.autocontext.set(autoContext, autoData);
            }
          });
        });

        let analysis = '';

        // Location analysis
        const locationEntries = Array.from(contextMaps.location.entries())
          .map(([name, data]) => ({ 
            name, 
            ...data, 
            avgPM: data.exposure > 0 ? data.avgPM / data.exposure : 0 
          }))
          .filter(entry => entry.exposure > 0)
          .sort((a, b) => b.dose - a.dose);

        if (locationEntries.length > 0) {
          analysis += `🏠 ${t('analysis.report.locationAnalysis')}:\n`;
          locationEntries.slice(0, 3).forEach((entry, i) => {
            const respiratoryRate = getRespiratoryRate(undefined, entry.name, undefined);
            analysis += `${i + 1}. ${entry.name}: ${entry.dose.toFixed(1)} μg (${(entry.exposure / 60).toFixed(1)}h, PM2.5=${entry.avgPM.toFixed(1)} μg/m³, débit=${respiratoryRate} m³/h)\n`;
          });
          analysis += '\n';
        }

        // Activity analysis
        const activityEntries = Array.from(contextMaps.activity.entries())
          .map(([name, data]) => ({ 
            name, 
            ...data, 
            avgPM: data.exposure > 0 ? data.avgPM / data.exposure : 0 
          }))
          .filter(entry => entry.exposure > 0)
          .sort((a, b) => b.dose - a.dose);

        if (activityEntries.length > 0) {
          analysis += `🏃 ${t('analysis.report.activityAnalysis')}:\n`;
          activityEntries.slice(0, 3).forEach((entry, i) => {
            const respiratoryRate = getRespiratoryRate(entry.name, undefined, undefined);
            analysis += `${i + 1}. ${entry.name}: ${entry.dose.toFixed(1)} μg (${(entry.exposure / 60).toFixed(1)}h, PM2.5=${entry.avgPM.toFixed(1)} μg/m³, débit=${respiratoryRate} m³/h)\n`;
          });
          analysis += '\n';
        }

        // Auto context analysis
        const autoEntries = Array.from(contextMaps.autocontext.entries())
          .map(([name, data]) => ({ 
            name, 
            ...data, 
            avgPM: data.exposure > 0 ? data.avgPM / data.exposure : 0 
          }))
          .filter(entry => entry.exposure > 0)
          .sort((a, b) => b.dose - a.dose);

        if (autoEntries.length > 0) {
          analysis += `🤖 ${t('analysis.report.autoContextAnalysis')}:\n`;
          autoEntries.slice(0, 3).forEach((entry, i) => {
            const respiratoryRate = getRespiratoryRate(undefined, undefined, entry.name);
            analysis += `${i + 1}. ${entry.name}: ${entry.dose.toFixed(1)} μg (${(entry.exposure / 60).toFixed(1)}h, PM2.5=${entry.avgPM.toFixed(1)} μg/m³, débit=${respiratoryRate} m³/h)\n`;
          });
        }

        return analysis || `• ${t('analysis.report.noContextData')}`;
      };

      const analysisText = `📊 ${t('analysis.report.title')} - ${timeframeText.toUpperCase()}

🔢 ${t('analysis.report.dataSummary')}:
• ${t('analysis.report.missionCount')}: ${filteredMissions.length}
• ${t('analysis.report.totalExposureTime')}: ${Math.round(totalExposureMinutes)} ${t('analysis.minutes')} (${exposureHours} ${t('analysis.report.hours')})

🌫️ ${t('analysis.report.particleAverages')}:
• PM1.0: ${avgPM1.toFixed(1)} μg/m³ (max: ${maxPM1.toFixed(1)} μg/m³)
• PM2.5: ${avgPM25.toFixed(1)} μg/m³ (max: ${maxPM25.toFixed(1)} μg/m³)
• PM10: ${avgPM10.toFixed(1)} μg/m³ (max: ${maxPM10.toFixed(1)} μg/m³)

💨 ${t('analysis.report.inhaledDose')}:
• PM2.5: ${totalCumulativeDosePM25.toFixed(1)} μg
• PM10: ${totalCumulativeDosePM10.toFixed(1)} μg
• ${t('analysis.report.doseFormula')}: Dose = ∑(Concentration × ${t('analysis.report.exposureTime')} × ${t('analysis.report.respiratoryRate')})

📍 ${t('analysis.report.contextualAnalysis')}:
${generateContextualAnalysis(filteredMissions)}

⚠️ ${t('analysis.report.whoThresholds')}:
• PM2.5 > 15 μg/m³: ${timeAboveWHO_PM25.toFixed(0)} min (${whoExceedancePercentage_PM25}% ${t('analysis.report.ofTime')})
• PM10 > 45 μg/m³: ${timeAboveWHO_PM10.toFixed(0)} min (${whoExceedancePercentage_PM10}% ${t('analysis.report.ofTime')})
• PM1.0: ${t('analysis.report.noWhoThresholdPM1')}

🏆 ${t('analysis.report.highestExposureMissions')} (PM2.5):
${filteredMissions
  .sort((a, b) => (b.avgPm25 || 0) - (a.avgPm25 || 0))
  .slice(0, 3)
  .map(
    (m, i) =>
      `${i + 1}. ${m.name}: PM2.5=${(m.avgPm25 || 0).toFixed(1)}, PM10=${(m.avgPm10 || 0).toFixed(1)} μg/m³`
  )
  .join('\n')}

🎯 ${t('analysis.report.eventAnalysis')}:
${eventAnalysisData.length > 0 
  ? eventAnalysisData.map(event => 
      `• ${event.eventType.toUpperCase()} (${event.eventCount} ${t('analysis.report.events')}):
  - PM2.5 ${t('analysis.report.duringEvent')}: ${event.avgPM25DuringEvent.toFixed(1)} μg/m³
  - PM2.5 ${t('analysis.report.normalConditions')}: ${event.avgPM25AroundEvent.toFixed(1)} μg/m³
  - ${t('analysis.report.impact')}: ${event.eventImpact > 0 ? '+' : ''}${event.eventImpact.toFixed(1)}% ${event.eventImpact > 50 ? '🔴' : event.eventImpact > 20 ? '🟡' : '🟢'}
  - ${t('analysis.report.detail')}: PM1=${event.avgPM1DuringEvent.toFixed(1)}, PM10=${event.avgPM10DuringEvent.toFixed(1)} μg/m³`
    ).join('\n\n')
  : `• ${t('analysis.report.noEventsRecorded')}`}

📈 ${t('analysis.report.globalEvaluation')}:
${getAirQualityStatus()}

💡 ${t('analysis.report.recommendations')}:
${
  avgPM25 > 15 || avgPM10 > 45
    ? t('analysis.report.recommendationsHigh')
    : t('analysis.report.recommendationsGood')
}
${eventAnalysisData.some(e => e.eventImpact > 50) 
  ? `\n• ${t('analysis.report.eventImpactWarning')}` 
  : ""}`;

      setStatisticalAnalysis(analysisText);
      setDataPoints({
        totalMissions: filteredMissions.length,
        totalExposureMinutes,
        averagePM25: avgPM25,
        maxPM25,
        timeAboveWHO: timeAboveWHO_PM25, // Use PM2.5 WHO exceedance for consistency
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
  }, [filteredMissions, selectedDate, selectedPeriod, t, toast, eventAnalysisData]);

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Generate analysis when missions or date filter changes
  useEffect(() => {
    if (missions.length > 0) {
      generateAnalysis();
      loadActivityData();
      loadEventAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions.length, selectedDate, selectedPeriod]);

  const regenerateAnalysis = () => {
    setAnalysisGenerated(false);
    generateAnalysis();
  };

  return {
    missions,
    filteredMissions,
    statisticalAnalysis,
    dataPoints,
    loading,
    loadingMeasurements,
    analysisGenerated,
    activityData,
    eventAnalysisData,
    regenerateAnalysis,
  };
};
