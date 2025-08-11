// Fallback processing functions for when Web Workers are not available
export async function processOnMainThread(type: string, payload: any): Promise<any> {
  // Use time-sliced processing to avoid blocking the main thread
  return new Promise((resolve, reject) => {
    const processTask = async () => {
      try {
        let result;
        
        switch (type) {
          case 'PARSE_SENSOR_DATA':
            result = await parseDataWithTimeSlicing(payload);
            break;
          
          case 'CALCULATE_STATISTICS':
            result = await calculateStatisticsWithTimeSlicing(payload);
            break;
          
          case 'AGGREGATE_CHART_DATA':
            result = await aggregateDataWithTimeSlicing(payload);
            break;
          
          case 'PROCESS_MISSION_DATA':
            result = await processMissionDataWithTimeSlicing(payload);
            break;
          
          case 'CALCULATE_WHO_COMPLIANCE':
            result = await calculateComplianceWithTimeSlicing(payload);
            break;
          
          default:
            throw new Error(`Unknown task type: ${type}`);
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    // Use scheduler for non-blocking execution
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      (window as any).scheduler.postTask(processTask, { priority: 'background' });
    } else if ('requestIdleCallback' in window) {
      requestIdleCallback(processTask, { timeout: 2000 });
    } else {
      setTimeout(processTask, 0);
    }
  });
}

// Time-sliced processing functions to prevent long tasks
const TIME_SLICE_BUDGET = 5; // 5ms budget per slice

function shouldYield(): boolean {
  return performance.now() % TIME_SLICE_BUDGET === 0;
}

async function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      (window as any).scheduler.postTask(resolve, { priority: 'user-blocking' });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Time-sliced implementations to prevent main thread blocking
async function parseDataWithTimeSlicing(rawData: any) {
  const startTime = performance.now();
  
  const { data, format } = rawData;
  
  if (format === 'pmscan') {
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      // Yield to main thread every few items to prevent blocking
      if (i > 0 && i % 100 === 0) {
        await yieldToMain();
      }
      
      const item = data[i];
      if (typeof item === 'string') {
        const parts = item.split(',');
        result.push({
          timestamp: new Date().toISOString(),
          pm1: parseFloat(parts[0]) || 0,
          pm25: parseFloat(parts[1]) || 0,
          pm10: parseFloat(parts[2]) || 0,
          temperature: parseFloat(parts[3]) || 0,
          humidity: parseFloat(parts[4]) || 0
        });
      } else {
        result.push(item);
      }
    }
    
    console.debug(`[PERF] Parsed ${data.length} items in ${performance.now() - startTime}ms`);
    return result;
  }
  
  return data;
}

function parseSensorData(rawData: any) {
  const { data, format } = rawData;
  
  if (format === 'pmscan') {
    return data.map((item: any) => {
      if (typeof item === 'string') {
        const parts = item.split(',');
        return {
          timestamp: new Date().toISOString(),
          pm1: parseFloat(parts[0]) || 0,
          pm25: parseFloat(parts[1]) || 0,
          pm10: parseFloat(parts[2]) || 0,
          temperature: parseFloat(parts[3]) || 0,
          humidity: parseFloat(parts[4]) || 0
        };
      }
      return item;
    });
  }
  
  return data;
}

async function calculateStatisticsWithTimeSlicing(data: any) {
  const startTime = performance.now();
  const { measurements, field } = data;
  
  if (!measurements || measurements.length === 0) {
    return {
      mean: 0, median: 0, min: 0, max: 0, std: 0,
      percentiles: { p25: 0, p75: 0, p90: 0, p95: 0 }
    };
  }
  
  // Process values in chunks to avoid blocking
  const values = [];
  const chunkSize = 1000;
  
  for (let i = 0; i < measurements.length; i += chunkSize) {
    if (i > 0) await yieldToMain();
    
    const chunk = measurements.slice(i, i + chunkSize);
    const chunkValues = chunk
      .map((m: any) => m[field])
      .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
    
    values.push(...chunkValues);
  }
  
  if (values.length === 0) {
    return {
      mean: 0, median: 0, min: 0, max: 0, std: 0,
      percentiles: { p25: 0, p75: 0, p90: 0, p95: 0 }
    };
  }
  
  // Sort in chunks to avoid blocking
  values.sort((a: number, b: number) => a - b);
  
  const mean = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];
  
  // Calculate variance in chunks
  let variance = 0;
  for (let i = 0; i < values.length; i += chunkSize) {
    if (i > 0) await yieldToMain();
    
    const chunk = values.slice(i, i + chunkSize);
    variance += chunk.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0);
  }
  variance /= values.length;
  
  const std = Math.sqrt(variance);
  
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  };
  
  const result = {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    std: Math.round(std * 100) / 100,
    percentiles: {
      p25: Math.round(getPercentile(25) * 100) / 100,
      p75: Math.round(getPercentile(75) * 100) / 100,
      p90: Math.round(getPercentile(90) * 100) / 100,
      p95: Math.round(getPercentile(95) * 100) / 100
    }
  };
  
  console.debug(`[PERF] Calculated statistics for ${values.length} values in ${performance.now() - startTime}ms`);
  return result;
}

function calculateStatistics(data: any) {
  const { measurements, field } = data;
  
  if (!measurements || measurements.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      std: 0,
      percentiles: { p25: 0, p75: 0, p90: 0, p95: 0 }
    };
  }
  
  const values = measurements
    .map((m: any) => m[field])
    .filter((v: any) => v !== null && v !== undefined && !isNaN(v))
    .sort((a: number, b: number) => a - b);
  
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      std: 0,
      percentiles: { p25: 0, p75: 0, p90: 0, p95: 0 }
    };
  }
  
  const mean = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];
  
  const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  };
  
  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    std: Math.round(std * 100) / 100,
    percentiles: {
      p25: Math.round(getPercentile(25) * 100) / 100,
      p75: Math.round(getPercentile(75) * 100) / 100,
      p90: Math.round(getPercentile(90) * 100) / 100,
      p95: Math.round(getPercentile(95) * 100) / 100
    }
  };
}

async function aggregateDataWithTimeSlicing(data: any) {
  const startTime = performance.now();
  const { measurements, timeInterval, fields } = data;
  
  if (!measurements || measurements.length === 0) return [];
  
  const groups = new Map();
  const intervalMs = getIntervalMs(timeInterval);
  
  // Process measurements in chunks
  const chunkSize = 500;
  for (let i = 0; i < measurements.length; i += chunkSize) {
    if (i > 0) await yieldToMain();
    
    const chunk = measurements.slice(i, i + chunkSize);
    chunk.forEach((measurement: any) => {
      const timestamp = new Date(measurement.timestamp);
      const intervalStart = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
      
      // Use epoch ms for stable numeric key instead of ISO string
      const bucketStartMs = intervalStart.getTime();
      const key = String(bucketStartMs);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(measurement);
    });
  }
  
  const result = Array.from(groups.entries()).map(([timestamp, groupMeasurements]: [string, any[]]) => {
    const resultItem: any = { timestamp };
    
    fields.forEach((field: string) => {
      const values = groupMeasurements
        .map((m: any) => m[field])
        .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
      
      resultItem[field] = values.length > 0
        ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 100) / 100
        : null;
    });
    
    return resultItem;
  }).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  console.debug(`[PERF] Aggregated ${measurements.length} measurements in ${performance.now() - startTime}ms`);
  return result;
}

function aggregateChartData(data: any) {
  const { measurements, timeInterval, fields } = data;
  
  if (!measurements || measurements.length === 0) return [];
  
  const groups = new Map();
  const intervalMs = getIntervalMs(timeInterval);
  
  measurements.forEach((measurement: any) => {
    const timestamp = new Date(measurement.timestamp);
    const intervalStart = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
    const key = intervalStart.toISOString();
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(measurement);
  });
  
  return Array.from(groups.entries()).map(([timestamp, groupMeasurements]: [string, any[]]) => {
    const result: any = { timestamp };
    
    fields.forEach((field: string) => {
      const values = groupMeasurements
        .map((m: any) => m[field])
        .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
      
      result[field] = values.length > 0
        ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 100) / 100
        : null;
    });
    
    return result;
  }).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case '1min': return 60 * 1000;
    case '5min': return 5 * 60 * 1000;
    case '15min': return 15 * 60 * 1000;
    case '1hour': return 60 * 60 * 1000;
    case '1day': return 24 * 60 * 60 * 1000;
    default: return 5 * 60 * 1000;
  }
}

async function processMissionDataWithTimeSlicing(data: any) {
  const startTime = performance.now();
  const { missions, groupBy } = data;
  
  if (!missions || missions.length === 0) return [];
  
  const groups = new Map();
  
  // Process missions in chunks
  const chunkSize = 100;
  for (let i = 0; i < missions.length; i += chunkSize) {
    if (i > 0) await yieldToMain();
    
    const chunk = missions.slice(i, i + chunkSize);
    chunk.forEach((mission: any) => {
      const key = mission[groupBy] || 'Unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(mission);
    });
  }
  
  const result = Array.from(groups.entries()).map(([key, groupMissions]: [string, any[]]) => {
    const measurements = groupMissions.flatMap((m: any) => m.measurements || []);
    
    return {
      group: key,
      missionCount: groupMissions.length,
      measurementCount: measurements.length,
      avgPM25: calculateAverage(measurements, 'pm25'),
      avgPM10: calculateAverage(measurements, 'pm10'),
      duration: calculateTotalDuration(groupMissions)
    };
  });
  
  console.debug(`[PERF] Processed ${missions.length} missions in ${performance.now() - startTime}ms`);
  return result;
}

function processMissionData(data: any) {
  const { missions, groupBy } = data;
  
  if (!missions || missions.length === 0) return [];
  
  const groups = new Map();
  
  missions.forEach((mission: any) => {
    const key = mission[groupBy] || 'Unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(mission);
  });
  
  return Array.from(groups.entries()).map(([key, groupMissions]: [string, any[]]) => {
    const measurements = groupMissions.flatMap((m: any) => m.measurements || []);
    
    return {
      group: key,
      missionCount: groupMissions.length,
      measurementCount: measurements.length,
      avgPM25: calculateAverage(measurements, 'pm25'),
      avgPM10: calculateAverage(measurements, 'pm10'),
      duration: calculateTotalDuration(groupMissions)
    };
  });
}

async function calculateComplianceWithTimeSlicing(data: any) {
  const startTime = performance.now();
  const { measurements } = data;
  
  const WHO_LIMITS = {
    pm25: { daily: 15, annual: 5 },
    pm10: { daily: 45, annual: 15 }
  };
  
  if (!measurements || measurements.length === 0) {
    return {
      pm25: { compliance: 100, exceedances: 0 },
      pm10: { compliance: 100, exceedances: 0 }
    };
  }
  
  const result: any = {};
  
  for (const pollutant of ['pm25', 'pm10']) {
    const values = [];
    const chunkSize = 1000;
    
    // Process measurements in chunks
    for (let i = 0; i < measurements.length; i += chunkSize) {
      if (i > 0) await yieldToMain();
      
      const chunk = measurements.slice(i, i + chunkSize);
      const chunkValues = chunk
        .map((m: any) => m[pollutant])
        .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
      
      values.push(...chunkValues);
    }
    
    if (values.length === 0) {
      result[pollutant] = { compliance: 100, exceedances: 0 };
      continue;
    }
    
    const dailyLimit = WHO_LIMITS[pollutant as keyof typeof WHO_LIMITS].daily;
    const exceedances = values.filter((v: number) => v > dailyLimit).length;
    const compliance = Math.max(0, Math.round(((values.length - exceedances) / values.length) * 100));
    
    result[pollutant] = { compliance, exceedances };
  }
  
  console.debug(`[PERF] Calculated WHO compliance for ${measurements.length} measurements in ${performance.now() - startTime}ms`);
  return result;
}

function calculateWHOCompliance(data: any) {
  const { measurements } = data;
  
  const WHO_LIMITS = {
    pm25: { daily: 15, annual: 5 },
    pm10: { daily: 45, annual: 15 }
  };
  
  if (!measurements || measurements.length === 0) {
    return {
      pm25: { compliance: 100, exceedances: 0 },
      pm10: { compliance: 100, exceedances: 0 }
    };
  }
  
  const result: any = {};
  
  ['pm25', 'pm10'].forEach((pollutant: string) => {
    const values = measurements
      .map((m: any) => m[pollutant])
      .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length === 0) {
      result[pollutant] = { compliance: 100, exceedances: 0 };
      return;
    }
    
    const dailyLimit = WHO_LIMITS[pollutant as keyof typeof WHO_LIMITS].daily;
    const exceedances = values.filter((v: number) => v > dailyLimit).length;
    const compliance = Math.max(0, Math.round(((values.length - exceedances) / values.length) * 100));
    
    result[pollutant] = { compliance, exceedances };
  });
  
  return result;
}

function calculateAverage(measurements: any[], field: string): number {
  const values = measurements
    .map((m: any) => m[field])
    .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
  
  return values.length > 0
    ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 100) / 100
    : 0;
}

function calculateTotalDuration(missions: any[]): number {
  return missions.reduce((total: number, mission: any) => {
    if (mission.start_time && mission.end_time) {
      const duration = new Date(mission.end_time).getTime() - new Date(mission.start_time).getTime();
      return total + Math.max(0, duration);
    }
    return total;
  }, 0);
}