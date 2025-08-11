/**
 * Pure functions for statistical analysis calculations
 * These functions avoid side effects and are easy to test
 */

import { getRespiratoryRate } from '@/lib/respiratoryRates';

export interface AnalysisData {
  totalMissions: number;
  totalExposureMinutes: number;
  averagePM25: number;
  maxPM25: number;
  timeAboveWHO: number;
}

export interface ActivityData {
  activity: string;
  timeSpent: number;
  cumulativeDose: number; // In µg (inhaled dose)
  averageExposure: number;
  measurements: number;
  respiratoryRate: number; // In m³/h
}

export interface EventAnalysisData {
  eventType: string;
  eventCount: number;
  avgPM25DuringEvent: number;
  avgPM10DuringEvent: number;
  avgPM1DuringEvent: number;
  avgPM25AroundEvent: number; // Average PM in 5 minutes before/after
  eventImpact: number; // Percentage increase compared to baseline
}

export interface MissionDataForAnalysis {
  id: string;
  name: string;
  startTime: number | Date;
  durationMinutes: number;
  avgPm1: number;
  avgPm25: number;
  avgPm10: number;
  maxPm25: number;
  measurementsCount: number;
  activityContext?: string;
  locationContext?: string;
  measurements: Array<{
    pm1: number;
    pm25: number;
    pm10: number;
    timestamp: number | Date;
    locationContext?: string;
    activityContext?: string;
    automaticContext?: string;
  }>;
}

export interface EventDataForAnalysis {
  id: string;
  eventType: string;
  timestamp: number | Date;
}

/**
 * Calculate overall PM statistics from missions
 */
export function computePMStatistics(missions: MissionDataForAnalysis[]) {
  const validMissions = missions.filter(
    (m) =>
      m.avgPm25 != null &&
      !isNaN(m.avgPm25) &&
      m.avgPm1 != null &&
      !isNaN(m.avgPm1) &&
      m.avgPm10 != null &&
      !isNaN(m.avgPm10)
  );

  if (validMissions.length === 0) {
    return {
      avgPM1: 0,
      avgPM25: 0,
      avgPM10: 0,
      maxPM1: 0,
      maxPM25: 0,
      maxPM10: 0,
    };
  }

  return {
    avgPM1: validMissions.reduce((sum, m) => sum + m.avgPm1, 0) / validMissions.length,
    avgPM25: validMissions.reduce((sum, m) => sum + m.avgPm25, 0) / validMissions.length,
    avgPM10: validMissions.reduce((sum, m) => sum + m.avgPm10, 0) / validMissions.length,
    maxPM1: Math.max(...validMissions.map((m) => m.avgPm1 || 0)),
    maxPM25: Math.max(...validMissions.map((m) => m.maxPm25 || 0)),
    maxPM10: Math.max(...validMissions.map((m) => m.avgPm10 || 0)),
  };
}

/**
 * Calculate WHO threshold exceedances
 */
export function computeWHOExceedances(missions: MissionDataForAnalysis[]) {
  const timeAboveWHO_PM25 = missions.reduce((total, mission) => {
    if (
      mission.avgPm25 != null &&
      !isNaN(mission.avgPm25) &&
      mission.avgPm25 > 15
    ) {
      return total + (mission.durationMinutes || 0);
    }
    return total;
  }, 0);

  const timeAboveWHO_PM10 = missions.reduce((total, mission) => {
    if (
      mission.avgPm10 != null &&
      !isNaN(mission.avgPm10) &&
      mission.avgPm10 > 45
    ) {
      return total + (mission.durationMinutes || 0);
    }
    return total;
  }, 0);

  return { timeAboveWHO_PM25, timeAboveWHO_PM10 };
}

/**
 * Calculate cumulative inhaled dose
 */
export function computeCumulativeDose(missions: MissionDataForAnalysis[]) {
  const totalCumulativeDosePM25 = missions.reduce((total, mission) => {
    const durationHours = mission.durationMinutes / 60;
    const respiratoryRate = getRespiratoryRate(
      mission.activityContext,
      mission.locationContext,
      undefined
    );
    return total + mission.avgPm25 * durationHours * respiratoryRate;
  }, 0);

  const totalCumulativeDosePM10 = missions.reduce((total, mission) => {
    const durationHours = mission.durationMinutes / 60;
    const respiratoryRate = getRespiratoryRate(
      mission.activityContext,
      mission.locationContext,
      undefined
    );
    return total + mission.avgPm10 * durationHours * respiratoryRate;
  }, 0);

  return { totalCumulativeDosePM25, totalCumulativeDosePM10 };
}

/**
 * Calculate activity-based analysis data
 */
export function computeActivityData(
  missions: MissionDataForAnalysis[],
  unknownActivityLabel: string
): ActivityData[] {
  if (missions.length === 0) {
    return [];
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

  missions.forEach((mission) => {
    const activity = mission.activityContext || unknownActivityLabel;
    const respiratoryRate = getRespiratoryRate(
      mission.activityContext,
      mission.locationContext,
      undefined
    );
    
    const existing = activityMap.get(activity) || {
      totalDuration: 0,
      totalPM25: 0,
      cumulativeDose: 0,
      measurements: 0,
      respiratoryRate: respiratoryRate,
    };

    const durationHours = mission.durationMinutes / 60;
    const dose = mission.avgPm25 * durationHours * respiratoryRate;

    existing.totalDuration += mission.durationMinutes;
    existing.totalPM25 += mission.avgPm25 * mission.durationMinutes;
    existing.cumulativeDose += dose;
    existing.measurements += mission.measurementsCount;
    existing.respiratoryRate = respiratoryRate;

    activityMap.set(activity, existing);
  });

  // Convert to array and calculate averages
  const activities = Array.from(activityMap.entries()).map(
    ([activity, data]) => ({
      activity,
      timeSpent: data.totalDuration,
      cumulativeDose: data.cumulativeDose,
      averageExposure:
        data.totalDuration > 0 ? data.totalPM25 / data.totalDuration : 0,
      measurements: data.measurements,
      respiratoryRate: data.respiratoryRate,
    })
  );

  // Sort by cumulative dose (descending)
  return activities.sort((a, b) => b.cumulativeDose - a.cumulativeDose);
}

/**
 * Calculate event analysis data
 */
export function computeEventAnalysisData(
  missions: MissionDataForAnalysis[],
  eventsByMission: Map<string, EventDataForAnalysis[]>
): EventAnalysisData[] {
  if (missions.length === 0) {
    return [];
  }

  const eventTypeMap = new Map<string, {
    events: EventDataForAnalysis[];
    pmMeasurements: { pm1: number; pm25: number; pm10: number; timestamp: Date }[];
    surroundingPmMeasurements: { pm1: number; pm25: number; pm10: number; timestamp: Date }[];
  }>();

  // Process events for each mission
  missions.forEach(mission => {
    const events = eventsByMission.get(mission.id) || [];
    
    events.forEach(event => {
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
    });
  });

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
  return analysisResults.sort((a, b) => b.eventImpact - a.eventImpact);
}

/**
 * Generate contextual analysis by location, activity, and autocontext
 */
export function generateContextualAnalysis(
  missions: MissionDataForAnalysis[],
  t: (key: string, options?: any) => string
): string {
  const contextMaps = {
    location: new Map<string, { exposure: number; dose: number; avgPM: number }>(),
    activity: new Map<string, { exposure: number; dose: number; avgPM: number }>(),
    autocontext: new Map<string, { exposure: number; dose: number; avgPM: number }>()
  };

  missions.forEach(mission => {
    mission.measurements.forEach(measurement => {
      const measurementDuration = mission.durationMinutes / mission.measurements.length;
      const measurementDurationHours = measurementDuration / 60;
      
      const respiratoryRate = getRespiratoryRate(
        measurement.activityContext,
        measurement.locationContext,
        measurement.automaticContext
      );
      
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
}

/**
 * Determine air quality status based on PM values
 */
export function getAirQualityStatus(avgPM25: number, avgPM10: number, t: (key: string) => string): string {
  const worstPM = Math.max(avgPM25, avgPM10 / 3); // Normalize PM10 for comparison
  if (worstPM <= 12) return `✅ ${t('analysis.airQuality.good')}`;
  if (worstPM <= 35) return `⚠️ ${t('analysis.airQuality.moderate')}`;
  if (worstPM <= 55) return `🔶 ${t('analysis.airQuality.poor')}`;
  return `🔴 ${t('analysis.airQuality.veryPoor')}`;
}

/**
 * Generate comprehensive statistical analysis report
 */
export function generateStatisticalReport(
  missions: MissionDataForAnalysis[],
  timeframeText: string,
  eventAnalysisData: EventAnalysisData[],
  t: (key: string, options?: any) => string
): string {
  const totalExposureMinutes = missions.reduce(
    (sum, m) => sum + (m.durationMinutes || 0),
    0
  );

  const pmStats = computePMStatistics(missions);
  const { timeAboveWHO_PM25, timeAboveWHO_PM10 } = computeWHOExceedances(missions);
  const { totalCumulativeDosePM25, totalCumulativeDosePM10 } = computeCumulativeDose(missions);

  const exposureHours = (totalExposureMinutes / 60).toFixed(1);
  const whoExceedancePercentage_PM25 = totalExposureMinutes > 0
    ? ((timeAboveWHO_PM25 / totalExposureMinutes) * 100).toFixed(1)
    : 0;
  const whoExceedancePercentage_PM10 = totalExposureMinutes > 0
    ? ((timeAboveWHO_PM10 / totalExposureMinutes) * 100).toFixed(1)
    : 0;

  const airQualityStatus = getAirQualityStatus(pmStats.avgPM25, pmStats.avgPM10, t);
  const contextualAnalysis = generateContextualAnalysis(missions, t);

  return `📊 ${t('analysis.report.title')} - ${timeframeText.toUpperCase()}

🔢 ${t('analysis.report.dataSummary')}:
• ${t('analysis.report.missionCount')}: ${missions.length}
• ${t('analysis.report.totalExposureTime')}: ${Math.round(totalExposureMinutes)} ${t('analysis.minutes')} (${exposureHours} ${t('analysis.report.hours')})

🌫️ ${t('analysis.report.particleAverages')}:
• PM1.0: ${pmStats.avgPM1.toFixed(1)} μg/m³ (max: ${pmStats.maxPM1.toFixed(1)} μg/m³)
• PM2.5: ${pmStats.avgPM25.toFixed(1)} μg/m³ (max: ${pmStats.maxPM25.toFixed(1)} μg/m³)
• PM10: ${pmStats.avgPM10.toFixed(1)} μg/m³ (max: ${pmStats.maxPM10.toFixed(1)} μg/m³)

💨 ${t('analysis.report.inhaledDose')}:
• PM2.5: ${totalCumulativeDosePM25.toFixed(1)} μg
• PM10: ${totalCumulativeDosePM10.toFixed(1)} μg
• ${t('analysis.report.doseFormula')}: Dose = ∑(Concentration × ${t('analysis.report.exposureTime')} × ${t('analysis.report.respiratoryRate')})

📍 ${t('analysis.report.contextualAnalysis')}:
${contextualAnalysis}

⚠️ ${t('analysis.report.whoThresholds')}:
• PM2.5 > 15 μg/m³: ${timeAboveWHO_PM25.toFixed(0)} min (${whoExceedancePercentage_PM25}% ${t('analysis.report.ofTime')})
• PM10 > 45 μg/m³: ${timeAboveWHO_PM10.toFixed(0)} min (${whoExceedancePercentage_PM10}% ${t('analysis.report.ofTime')})
• PM1.0: ${t('analysis.report.noWhoThresholdPM1')}

🏆 ${t('analysis.report.highestExposureMissions')} (PM2.5):
${missions
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
${airQualityStatus}

💡 ${t('analysis.report.recommendations')}:
${
  pmStats.avgPM25 > 15 || pmStats.avgPM10 > 45
    ? t('analysis.report.recommendationsHigh')
    : t('analysis.report.recommendationsGood')
}
${eventAnalysisData.some(e => e.eventImpact > 50) 
  ? `\n• ${t('analysis.report.eventImpactWarning')}` 
  : ""}`;
}