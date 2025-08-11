/**
 * Pure functions for mission data analysis and calculations
 * These functions avoid side effects and are easy to test
 */

export interface PMStats {
  avg: number;
  min: number;
  max: number;
}

export interface ContextStats {
  pm1: number;
  pm25: number;
  pm10: number;
  timeSpent: number;
}

export interface OverallStats {
  pm1: PMStats;
  pm25: PMStats;
  pm10: PMStats;
}

export interface MeasurementData {
  pm1: number;
  pm25: number;
  pm10: number;
  temperature?: number;
  humidity?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: number | Date;
  locationContext?: string;
  activityContext?: string;
  automaticContext?: string;
}

export interface MissionAnalysisData {
  id: string;
  name: string;
  startTime: number | Date;
  endTime: number | Date;
  durationMinutes: number;
  avgPm25: number;
  measurementsCount: number;
  measurements: MeasurementData[];
  locationContext?: string;
  activityContext?: string;
  synced?: boolean;
  weatherDataId?: string;
  airQualityDataId?: string;
}

/**
 * Calculate overall statistics for PM values
 */
export function computeOverallStats(measurements: MeasurementData[]): OverallStats {
  if (measurements.length === 0) {
    return {
      pm1: { avg: 0, min: 0, max: 0 },
      pm25: { avg: 0, min: 0, max: 0 },
      pm10: { avg: 0, min: 0, max: 0 },
    };
  }

  const pm1Values = measurements.map(m => m.pm1);
  const pm25Values = measurements.map(m => m.pm25);
  const pm10Values = measurements.map(m => m.pm10);

  return {
    pm1: {
      avg: pm1Values.reduce((sum, val) => sum + val, 0) / pm1Values.length,
      min: Math.min(...pm1Values),
      max: Math.max(...pm1Values),
    },
    pm25: {
      avg: pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length,
      min: Math.min(...pm25Values),
      max: Math.max(...pm25Values),
    },
    pm10: {
      avg: pm10Values.reduce((sum, val) => sum + val, 0) / pm10Values.length,
      min: Math.min(...pm10Values),
      max: Math.max(...pm10Values),
    },
  };
}

/**
 * Compute context-based averages and time spent
 */
export function computeContextPeriods(
  measurements: MeasurementData[],
  missionDurationMinutes: number,
  missionLocationContext?: string,
  missionActivityContext?: string
): {
  location: Record<string, ContextStats>;
  activity: Record<string, ContextStats>;
  autocontext: Record<string, ContextStats>;
} {
  const contextMap = {
    location: new Map<string, { pm1: number[], pm25: number[], pm10: number[], measurementCount: number }>(),
    activity: new Map<string, { pm1: number[], pm25: number[], pm10: number[], measurementCount: number }>(),
    autocontext: new Map<string, { pm1: number[], pm25: number[], pm10: number[], measurementCount: number }>(),
  };

  // Process measurements
  measurements.forEach(measurement => {
    const contexts = {
      location: measurement.locationContext || missionLocationContext,
      activity: measurement.activityContext || missionActivityContext,
      autocontext: measurement.automaticContext,
    };

    Object.entries(contexts).forEach(([contextType, contextValue]) => {
      if (contextValue && contextValue !== 'unknown') {
        const map = contextMap[contextType as keyof typeof contextMap];
        if (!map.has(contextValue)) {
          map.set(contextValue, { pm1: [], pm25: [], pm10: [], measurementCount: 0 });
        }
        const context = map.get(contextValue)!;
        context.pm1.push(measurement.pm1);
        context.pm25.push(measurement.pm25);
        context.pm10.push(measurement.pm10);
        context.measurementCount++;
      }
    });
  });

  // Calculate averages and time spent
  const totalMeasurements = measurements.length;
  const timePerMeasurement = totalMeasurements > 0 ? missionDurationMinutes / totalMeasurements : 0;

  const result = {
    location: {} as Record<string, ContextStats>,
    activity: {} as Record<string, ContextStats>,
    autocontext: {} as Record<string, ContextStats>,
  };

  Object.entries(contextMap).forEach(([contextType, map]) => {
    map.forEach((values, context) => {
      const timeSpent = values.measurementCount * timePerMeasurement;
      result[contextType as keyof typeof result][context] = {
        pm1: values.pm1.length > 0 ? values.pm1.reduce((sum, val) => sum + val, 0) / values.pm1.length : 0,
        pm25: values.pm25.length > 0 ? values.pm25.reduce((sum, val) => sum + val, 0) / values.pm25.length : 0,
        pm10: values.pm10.length > 0 ? values.pm10.reduce((sum, val) => sum + val, 0) / values.pm10.length : 0,
        timeSpent,
      };
    });
  });

  return result;
}

/**
 * Convert mission measurements to graph data format
 */
export function transformToGraphData(measurements: MeasurementData[], missionLocationContext?: string, missionActivityContext?: string) {
  return measurements.map(measurement => ({
    pmData: {
      pm1: measurement.pm1,
      pm25: measurement.pm25,
      pm10: measurement.pm10,
      temp: measurement.temperature || 0,
      humidity: measurement.humidity || 0,
      battery: 100, // Default values since these aren't stored in missions
      charging: false,
      timestamp: measurement.timestamp,
    },
    location:
      measurement.latitude && measurement.longitude
        ? {
            latitude: measurement.latitude,
            longitude: measurement.longitude,
            accuracy: measurement.accuracy || 0,
            timestamp: measurement.timestamp,
          }
        : undefined,
    context: {
      locationContext: measurement.locationContext || missionLocationContext,
      activityContext: measurement.activityContext || missionActivityContext,
      automaticContext: measurement.automaticContext,
    },
  }));
}

/**
 * Extract track points for map visualization
 */
export function extractTrackPoints(measurements: MeasurementData[]) {
  return measurements
    .filter(m => m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0)
    .map(m => ({
      longitude: m.longitude!,
      latitude: m.latitude!,
      pm25: m.pm25,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : m.timestamp.getTime(),
    }));
}

/**
 * Find first location for map centering
 */
export function findFirstLocation(measurements: MeasurementData[]) {
  return measurements.find(
    m => m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0
  );
}

/**
 * Determine air quality color based on PM2.5 value
 */
export function getQualityColor(pm25: number): string {
  if (pm25 <= 12) return 'text-air-good';
  if (pm25 <= 35) return 'text-air-moderate';
  if (pm25 <= 55) return 'text-air-poor';
  return 'text-air-very-poor';
}

/**
 * Auto-select available context type
 */
export function selectContextType(measurements: MeasurementData[], missionLocationContext?: string, missionActivityContext?: string): 'location' | 'activity' | 'autocontext' {
  const hasLocationContext = !!(missionLocationContext || measurements.some(m => m.locationContext));
  const hasActivityContext = !!(missionActivityContext || measurements.some(m => m.activityContext));
  const hasAutoContext = measurements.some(m => m.automaticContext && m.automaticContext !== 'unknown');
  
  if (hasLocationContext) return 'location';
  if (hasActivityContext) return 'activity';
  if (hasAutoContext) return 'autocontext';
  
  return 'location';
}