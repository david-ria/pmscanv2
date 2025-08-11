// Web Worker for CPU-intensive data processing operations
self.onmessage = function({ data }) {
  const { type, payload, id } = data;
  
  try {
    let result;
    
    switch (type) {
      case 'PARSE_SENSOR_DATA':
        result = parseSensorData(payload);
        break;
      
      case 'CALCULATE_STATISTICS':
        result = calculateStatistics(payload);
        break;
      
      case 'AGGREGATE_CHART_DATA':
        result = aggregateChartData(payload);
        break;
      
      case 'PROCESS_MISSION_DATA':
        result = processMissionData(payload);
        break;
      
      case 'CALCULATE_WHO_COMPLIANCE':
        result = calculateWHOCompliance(payload);
        break;
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({ type: 'SUCCESS', id, result });
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      id, 
      error: error.message 
    });
  }
};

// Parse raw sensor data
function parseSensorData(rawData) {
  const { data, format } = rawData;
  
  if (format === 'pmscan') {
    return data.map(item => {
      if (typeof item === 'string') {
        const parts = item.split(',');
        // Parse timestamp from data (assumed to be in parts[5]) or use current time as fallback
        const ts = Number(parts[5]); // or from payload timestamp field
        const timestamp = Number.isFinite(ts) ? ts : Date.now(); // fallback as number
        
        return {
          timestamp, // Keep as epoch ms number
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

// Calculate statistical analysis
function calculateStatistics(data) {
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
    .map(m => m[field])
    .filter(v => v !== null && v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);
  
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
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];
  
  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  // Percentiles
  const getPercentile = (p) => {
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

// Aggregate data for charts
function aggregateChartData(data) {
  const { measurements, timeInterval, fields } = data;
  
  if (!measurements || measurements.length === 0) return [];
  
  // Group data by time intervals using numeric bucketing
  const groups = new Map();
  const intervalMs = getIntervalMs(timeInterval);
  
  measurements.forEach(measurement => {
    // Handle both numeric timestamps and ISO strings
    const timestamp = typeof measurement.timestamp === 'number' 
      ? measurement.timestamp 
      : new Date(measurement.timestamp).getTime();
    
    // Create numeric bucket key (epoch ms aligned to interval)
    const bucketMs = Math.floor(timestamp / intervalMs) * intervalMs;
    
    if (!groups.has(bucketMs)) {
      groups.set(bucketMs, []);
    }
    groups.get(bucketMs).push(measurement);
  });
  
  // Calculate averages for each interval
  return Array.from(groups.entries()).map(([bucketMs, groupMeasurements]) => {
    const result = { timestamp: bucketMs }; // Keep as numeric timestamp
    
    fields.forEach(field => {
      const values = groupMeasurements
        .map(m => m[field])
        .filter(v => v !== null && v !== undefined && !isNaN(v));
      
      result[field] = values.length > 0
        ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
        : null;
    });
    
    return result;
  }).sort((a, b) => a.timestamp - b.timestamp); // Sort by numeric timestamp
}

function getIntervalMs(interval) {
  switch (interval) {
    case '1min': return 60 * 1000;
    case '5min': return 5 * 60 * 1000;
    case '15min': return 15 * 60 * 1000;
    case '1hour': return 60 * 60 * 1000;
    case '1day': return 24 * 60 * 60 * 1000;
    default: return 5 * 60 * 1000; // Default 5 minutes
  }
}

// Process mission data
function processMissionData(data) {
  const { missions, groupBy } = data;
  
  if (!missions || missions.length === 0) return [];
  
  // Group missions by the specified field
  const groups = new Map();
  
  missions.forEach(mission => {
    const key = mission[groupBy] || 'Unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(mission);
  });
  
  // Calculate statistics for each group
  return Array.from(groups.entries()).map(([key, groupMissions]) => {
    const measurements = groupMissions.flatMap(m => m.measurements || []);
    
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

// Calculate WHO compliance
function calculateWHOCompliance(data) {
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
  
  const result = {};
  
  ['pm25', 'pm10'].forEach(pollutant => {
    const values = measurements
      .map(m => m[pollutant])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length === 0) {
      result[pollutant] = { compliance: 100, exceedances: 0 };
      return;
    }
    
    const dailyLimit = WHO_LIMITS[pollutant].daily;
    const exceedances = values.filter(v => v > dailyLimit).length;
    const compliance = Math.max(0, Math.round(((values.length - exceedances) / values.length) * 100));
    
    result[pollutant] = { compliance, exceedances };
  });
  
  return result;
}

// Helper functions
function calculateAverage(measurements, field) {
  const values = measurements
    .map(m => m[field])
    .filter(v => v !== null && v !== undefined && !isNaN(v));
  
  return values.length > 0
    ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
    : 0;
}

function calculateTotalDuration(missions) {
  return missions.reduce((total, mission) => {
    if (mission.start_time && mission.end_time) {
      const duration = new Date(mission.end_time) - new Date(mission.start_time);
      return total + Math.max(0, duration);
    }
    return total;
  }, 0);
}