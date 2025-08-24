import { PMScanData } from '@/lib/pmscan/types';
import { CookingEvent, CookSubtype2 } from '@/utils/eventUtils';

export interface CookingFeatures {
  // PM ratios in central third
  R1: number;          // mean(PM1/PM2.5)
  R10: number;         // mean(PM10/PM2.5) 
  
  // Temporal patterns
  riseRate: number;    // µg/m³/min slope PM2.5 start → central third
  peakHeight: number;  // PM2.5_peak - baseline25
  decayHalfLife: number; // minutes to drop to baseline + peakHeight/2
  
  // Environmental changes
  deltaRH: number;     // humidity change start → plateau
  deltaT: number;      // temperature change start → plateau
  
  // Context booleans
  still: boolean;      // movement detected during episode
  atHome: boolean;     // location context indicates home
  kitchenBeacon: boolean; // kitchen-specific location detected
  mealTime: boolean;   // episode during typical meal hours
  
  // Episode metadata
  duration: number;    // minutes
  baseline25: number;  // PM2.5 baseline before episode
  peak25: number;      // maximum PM2.5 during episode
  startTime: Date;     // episode start timestamp
  
  // Quality indicators
  dataQuality: 'good' | 'partial' | 'poor';
  measurementCount: number;
}

/**
 * Utility function for calculating mean of array segment
 */
function segmentMean(arr: number[], i0: number, i1: number): number {
  const s = Math.max(0, i0);
  const e = Math.min(arr.length, i1);
  if (e <= s) return 0;
  let sum = 0;
  for (let i = s; i < e; i++) {
    sum += arr[i];
  }
  return sum / (e - s);
}

/**
 * Calculate slope between two points in time series
 */
function calculateSlope(values: number[], timestamps: Date[], startIdx: number, endIdx: number): number {
  if (startIdx >= endIdx || startIdx < 0 || endIdx >= values.length) return 0;
  
  const startTime = timestamps[startIdx].getTime();
  const endTime = timestamps[endIdx].getTime();
  const timeDiffMinutes = (endTime - startTime) / (1000 * 60);
  
  if (timeDiffMinutes <= 0) return 0;
  
  const valueDiff = values[endIdx] - values[startIdx];
  return valueDiff / timeDiffMinutes;
}

/**
 * Find baseline PM2.5 value from measurements before episode
 */
function findBaseline(measurements: PMScanData[], episodeStart: Date): number {
  const baselineWindow = 10 * 60 * 1000; // 10 minutes before episode
  const baselineStart = new Date(episodeStart.getTime() - baselineWindow);
  
  const baselineMeasurements = measurements.filter(m => 
    m.timestamp >= baselineStart && m.timestamp < episodeStart
  );
  
  if (baselineMeasurements.length === 0) {
    // Fallback: use first few measurements of the episode
    const episodeMeasurements = measurements.filter(m => m.timestamp >= episodeStart);
    if (episodeMeasurements.length > 0) {
      return Math.min(...episodeMeasurements.slice(0, 3).map(m => m.pm25));
    }
    return 10; // Default baseline
  }
  
  return baselineMeasurements.reduce((sum, m) => sum + m.pm25, 0) / baselineMeasurements.length;
}

/**
 * Check if time falls within typical meal hours
 */
function isMealTime(timestamp: Date): boolean {
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  const timeDecimal = hour + minute / 60;
  
  // Breakfast: 6:30-9:30, Lunch: 11:30-14:00, Dinner: 17:30-21:00
  return (
    (timeDecimal >= 6.5 && timeDecimal <= 9.5) ||    // Breakfast
    (timeDecimal >= 11.5 && timeDecimal <= 14.0) ||   // Lunch
    (timeDecimal >= 17.5 && timeDecimal <= 21.0)      // Dinner
  );
}

/**
 * Calculate comprehensive cooking features from PM measurements
 */
export function calculateCookingFeatures(
  measurements: PMScanData[],
  episodeStart: Date,
  episodeEnd: Date,
  locationContext?: string,
  automaticContext?: string
): CookingFeatures {
  // Filter measurements to episode timeframe
  const episodeMeasurements = measurements.filter(m => 
    m.timestamp >= episodeStart && m.timestamp <= episodeEnd
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (episodeMeasurements.length < 3) {
    console.warn('Insufficient measurements for cooking feature calculation');
    // Return minimal features with poor quality
    return {
      R1: 0, R10: 0, riseRate: 0, peakHeight: 0, decayHalfLife: 0,
      deltaRH: 0, deltaT: 0, still: true, atHome: false, kitchenBeacon: false,
      mealTime: isMealTime(episodeStart), duration: 0, baseline25: 10,
      peak25: 10, startTime: episodeStart, dataQuality: 'poor', measurementCount: 0
    };
  }

  const duration = (episodeEnd.getTime() - episodeStart.getTime()) / (1000 * 60); // minutes
  const measurementCount = episodeMeasurements.length;
  
  // Extract time series
  const pm1Values = episodeMeasurements.map(m => m.pm1);
  const pm25Values = episodeMeasurements.map(m => m.pm25);
  const pm10Values = episodeMeasurements.map(m => m.pm10);
  const rhValues = episodeMeasurements.map(m => m.humidity);
  const tempValues = episodeMeasurements.map(m => m.temp);
  const timestamps = episodeMeasurements.map(m => m.timestamp);

  // Calculate baseline and peak
  const baseline25 = findBaseline(measurements, episodeStart);
  const peak25 = Math.max(...pm25Values);
  const peakHeight = peak25 - baseline25;

  // Central third indices for ratio calculations
  const thirdSize = Math.floor(pm25Values.length / 3);
  const centralStart = thirdSize;
  const centralEnd = pm25Values.length - thirdSize;

  // Calculate PM ratios in central third
  let R1 = 0;
  let R10 = 0;
  let validRatioCount = 0;

  for (let i = centralStart; i < centralEnd; i++) {
    if (pm25Values[i] > 1) { // Avoid division by very small values
      R1 += pm1Values[i] / pm25Values[i];
      R10 += pm10Values[i] / pm25Values[i];
      validRatioCount++;
    }
  }

  if (validRatioCount > 0) {
    R1 /= validRatioCount;
    R10 /= validRatioCount;
  }

  // Calculate rise rate (start to central third)
  const centralThirdIdx = Math.floor((centralStart + centralEnd) / 2);
  const riseRate = calculateSlope(pm25Values, timestamps, 0, centralThirdIdx);

  // Calculate decay half-life
  let decayHalfLife = 0;
  const peakIdx = pm25Values.indexOf(peak25);
  const halfPeakTarget = baseline25 + peakHeight / 2;
  
  if (peakIdx >= 0 && peakIdx < pm25Values.length - 1) {
    for (let i = peakIdx + 1; i < pm25Values.length; i++) {
      if (pm25Values[i] <= halfPeakTarget) {
        decayHalfLife = (timestamps[i].getTime() - timestamps[peakIdx].getTime()) / (1000 * 60);
        break;
      }
    }
  }

  // Calculate environmental deltas (start to 5-10 min window)
  const plateauWindowStart = Math.floor(measurementCount * 0.25); // ~25% into episode
  const plateauWindowEnd = Math.floor(measurementCount * 0.5);    // ~50% into episode
  
  const startRH = segmentMean(rhValues, 0, 2);
  const startT = segmentMean(tempValues, 0, 2);
  const plateauRH = segmentMean(rhValues, plateauWindowStart, plateauWindowEnd);
  const plateauT = segmentMean(tempValues, plateauWindowStart, plateauWindowEnd);
  
  const deltaRH = plateauRH - startRH;
  const deltaT = plateauT - startT;

  // Context analysis
  const atHome = locationContext?.toLowerCase().includes('home') || 
                 automaticContext?.toLowerCase().includes('home') || false;
  
  const kitchenBeacon = locationContext?.toLowerCase().includes('kitchen') ||
                       automaticContext?.toLowerCase().includes('kitchen') || false;
  
  const still = automaticContext?.toLowerCase().includes('indoor') || 
               !automaticContext?.toLowerCase().includes('walking') || true;
  
  const mealTime = isMealTime(episodeStart);

  // Assess data quality
  let dataQuality: 'good' | 'partial' | 'poor' = 'good';
  if (measurementCount < 5 || duration < 2) {
    dataQuality = 'poor';
  } else if (measurementCount < 10 || duration < 5) {
    dataQuality = 'partial';
  }

  const features: CookingFeatures = {
    R1: Number(R1.toFixed(3)),
    R10: Number(R10.toFixed(3)),
    riseRate: Number(riseRate.toFixed(2)),
    peakHeight: Number(peakHeight.toFixed(1)),
    decayHalfLife: Number(decayHalfLife.toFixed(1)),
    deltaRH: Number(deltaRH.toFixed(1)),
    deltaT: Number(deltaT.toFixed(2)),
    still,
    atHome,
    kitchenBeacon,
    mealTime,
    duration: Number(duration.toFixed(1)),
    baseline25: Number(baseline25.toFixed(1)),
    peak25: Number(peak25.toFixed(1)),
    startTime: episodeStart,
    dataQuality,
    measurementCount
  };

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.debug('🍳 Cooking Features Calculated:', {
      duration: `${features.duration} min`,
      peakHeight: `${features.peakHeight} µg/m³`,
      riseRate: `${features.riseRate} µg/m³/min`,
      ratios: `R1=${features.R1}, R10=${features.R10}`,
      environmental: `ΔRH=${features.deltaRH}%, ΔT=${features.deltaT}°C`,
      context: {
        atHome: features.atHome,
        mealTime: features.mealTime,
        still: features.still,
        kitchen: features.kitchenBeacon
      },
      quality: features.dataQuality,
      measurementCount: features.measurementCount
    });
  }

  return features;
}

/**
 * Enhanced cooking event with calculated features
 */
export interface EnhancedCookingEvent extends CookingEvent {
  features?: CookingFeatures;
}

/**
 * Detect and enhance cooking events with feature calculation
 */
export function enhanceCookingEventWithFeatures(
  cookingEvent: CookingEvent,
  measurements: PMScanData[],
  locationContext?: string,
  automaticContext?: string
): EnhancedCookingEvent {
  const episodeStart = new Date(cookingEvent.start);
  const episodeEnd = cookingEvent.end ? new Date(cookingEvent.end) : new Date(episodeStart.getTime() + 30 * 60 * 1000); // Default 30 min
  
  const features = calculateCookingFeatures(
    measurements,
    episodeStart,
    episodeEnd,
    locationContext,
    automaticContext
  );

  return {
    ...cookingEvent,
    features
  };
}