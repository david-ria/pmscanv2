import { MissionData } from '@/lib/dataStorage';

export interface MissionStatistics {
  // Counts
  totalMissions: number;
  validMissions: number;
  
  // Time
  totalExposureMinutes: number;
  
  // PM Averages (weighted by recording time)
  avgPm1: number;
  avgPm25: number;
  avgPm10: number;
  
  // PM Maximums
  maxPm1: number;
  maxPm25: number;
  maxPm10: number;
  
  // WHO Threshold Exceedances (in minutes)
  timeAboveWHO_PM25: number; // PM2.5 > 15 µg/m³
  timeAboveWHO_PM10: number; // PM10 > 45 µg/m³
  
  // Environmental data averages (from measurements)
  avgTemperature: number | null;
  avgHumidity: number | null;
  avgPressure: number | null;
  avgTvoc: number | null;
  maxTvoc: number | null;
}

/**
 * Filter missions with valid PM data (non-null, non-NaN).
 * This ensures we only calculate statistics from missions with real measurements.
 */
export function filterValidMissions(missions: MissionData[]): MissionData[] {
  return missions.filter(
    (m) =>
      m.avgPm25 != null &&
      !isNaN(m.avgPm25) &&
      m.avgPm1 != null &&
      !isNaN(m.avgPm1) &&
      m.avgPm10 != null &&
      !isNaN(m.avgPm10)
  );
}

/**
 * Calculate environmental statistics from mission measurements.
 * Returns null if no valid data available for a given metric.
 */
function calculateEnvironmentalStats(missions: MissionData[]): {
  avgTemperature: number | null;
  avgHumidity: number | null;
  avgPressure: number | null;
  avgTvoc: number | null;
  maxTvoc: number | null;
} {
  let tempSum = 0, tempCount = 0;
  let humSum = 0, humCount = 0;
  let pressureSum = 0, pressureCount = 0;
  let tvocSum = 0, tvocCount = 0;
  let maxTvoc: number | null = null;

  for (const mission of missions) {
    for (const m of mission.measurements) {
      if (m.temperature != null && !isNaN(m.temperature)) {
        tempSum += m.temperature;
        tempCount++;
      }
      if (m.humidity != null && !isNaN(m.humidity)) {
        humSum += m.humidity;
        humCount++;
      }
      if (m.pressure != null && !isNaN(m.pressure)) {
        pressureSum += m.pressure;
        pressureCount++;
      }
      if (m.tvoc != null && !isNaN(m.tvoc)) {
        tvocSum += m.tvoc;
        tvocCount++;
        if (maxTvoc === null || m.tvoc > maxTvoc) {
          maxTvoc = m.tvoc;
        }
      }
    }
  }

  return {
    avgTemperature: tempCount > 0 ? tempSum / tempCount : null,
    avgHumidity: humCount > 0 ? humSum / humCount : null,
    avgPressure: pressureCount > 0 ? pressureSum / pressureCount : null,
    avgTvoc: tvocCount > 0 ? tvocSum / tvocCount : null,
    maxTvoc,
  };
}

/**
 * Calculate comprehensive statistics from a list of missions.
 * Uses actual recording time where available, falls back to duration.
 * Only includes missions with valid PM data for accurate calculations.
 */
export function calculateMissionStatistics(
  missions: MissionData[]
): MissionStatistics {
  const validMissions = filterValidMissions(missions);

  // Handle empty cases
  if (validMissions.length === 0) {
    return {
      totalMissions: missions.length,
      validMissions: 0,
      totalExposureMinutes: 0,
      avgPm1: 0,
      avgPm25: 0,
      avgPm10: 0,
      maxPm1: 0,
      maxPm25: 0,
      maxPm10: 0,
      timeAboveWHO_PM25: 0,
      timeAboveWHO_PM10: 0,
      avgTemperature: null,
      avgHumidity: null,
      avgPressure: null,
      avgTvoc: null,
      maxTvoc: null,
    };
  }

  // Calculate total exposure time (use actual recording time when available)
  const totalExposureMinutes = validMissions.reduce(
    (sum, m) => sum + (m.actualRecordingMinutes ?? m.durationMinutes),
    0
  );

  // Calculate weighted averages for all PM types
  const avgPm1 =
    totalExposureMinutes > 0
      ? validMissions.reduce((sum, m) => {
          const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
          return sum + m.avgPm1 * recordingTime;
        }, 0) / totalExposureMinutes
      : 0;

  const avgPm25 =
    totalExposureMinutes > 0
      ? validMissions.reduce((sum, m) => {
          const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
          return sum + m.avgPm25 * recordingTime;
        }, 0) / totalExposureMinutes
      : 0;

  const avgPm10 =
    totalExposureMinutes > 0
      ? validMissions.reduce((sum, m) => {
          const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
          return sum + m.avgPm10 * recordingTime;
        }, 0) / totalExposureMinutes
      : 0;

  // Calculate maximum values for all PM types
  const maxPm1 = Math.max(...validMissions.map((m) => m.avgPm1 || 0));
  const maxPm25 = Math.max(...validMissions.map((m) => m.maxPm25 || 0));
  const maxPm10 = Math.max(...validMissions.map((m) => m.avgPm10 || 0));

  // Calculate time above WHO thresholds
  const timeAboveWHO_PM25 = validMissions.reduce((sum, m) => {
    if (m.avgPm25 > 15) {
      const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
      return sum + recordingTime;
    }
    return sum;
  }, 0);

  const timeAboveWHO_PM10 = validMissions.reduce((sum, m) => {
    if (m.avgPm10 > 45) {
      const recordingTime = m.actualRecordingMinutes ?? m.durationMinutes;
      return sum + recordingTime;
    }
    return sum;
  }, 0);

  // Calculate environmental statistics from measurements
  const envStats = calculateEnvironmentalStats(validMissions);

  return {
    totalMissions: missions.length,
    validMissions: validMissions.length,
    totalExposureMinutes,
    avgPm1,
    avgPm25,
    avgPm10,
    maxPm1,
    maxPm25,
    maxPm10,
    timeAboveWHO_PM25,
    timeAboveWHO_PM10,
    ...envStats,
  };
}
