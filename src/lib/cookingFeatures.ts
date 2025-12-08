import { SensorReadingData as PMScanData } from '@/types/sensor';
import { CookingEvent, CookSubtype2 } from '@/utils/eventUtils';

/**
 * Centralized cooking classification parameters for easy tuning
 */
export const CookingParams = {
  // Boiling scoring thresholds
  dRH_boiling: 6,          // ΔRH ≥ 6% → +0.50
  R10_boiling: 1.1,        // R10 ≤ 1.1 → +0.15
  peak_low_boiling: 100,   // peakHeight < 100 → +0.10
  dT_boiling_max: 1.5,     // 0 ≤ ΔT ≤ 1.5°C → +0.05
  R1_boiling_min: 0.60,    // R1 ≥ 0.60 → +0.05

  // Frying scoring thresholds
  R1_frying_min: 0.35,     // R1 ∈ [0.35, 0.65] → +0.30
  R1_frying_max: 0.65,
  peak_high_frying: 100,   // peakHeight ≥ 100 → +0.25
  rise_frying: 15,         // riseRate ≥ 15 → +0.20
  tHalf_frying: 10,        // decayHalfLife ≥ 10 → +0.10
  R10_common: 1.2,         // R10 ≤ 1.2 → +0.05

  // Anti-false-positive penalties
  penalties: {
    vacR10: 1.4,           // !still & R10 > 1.4 → -0.25 (vacuum)
    smokeR1: 0.80,         // R1 > 0.80 & ΔRH < 2% → -0.20 (smoke/incense)
    dustR10: 1.8,          // R10 > 1.8 & ΔRH < 2% → -0.30 (dust/construction)
    dRH_min: 2             // Minimum ΔRH for smoke/dust penalties
  },

  // Scoring weights (exact values from rules)
  weights: {
    boiling_dRH: 0.50,
    boiling_R10: 0.15,
    boiling_peak: 0.10,
    boiling_dT: 0.05,
    boiling_R1: 0.05,
    
    frying_R1: 0.30,
    frying_peak: 0.25,
    frying_rise: 0.20,
    frying_tHalf: 0.10,
    frying_R10: 0.05,
    
    context_still: 0.05,
    context_home: 0.05,
    context_kitchen: 0.10,
    context_mealtime: 0.05,
    
    penalty_vacuum: 0.25,
    penalty_smoke: 0.20,
    penalty_dust: 0.30
  },

  // Debug controls
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logFeatures: true,
    logScores: true,
    logDecision: true
  }
};

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
 * Cooking subtype scores based on feature analysis
 */
export interface CookingScores {
  boiling: number;     // 0..1+ score for boiling activity
  frying: number;      // 0..1+ score for frying activity
  confidence: number;  // overall confidence in classification
  predicted: CookSubtype2 | null; // best prediction or null if unclear
}

/**
 * Enhanced cooking features with scoring
 */
export interface CookingFeaturesWithScores extends CookingFeatures {
  scores: CookingScores;
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

  // Controllable debug logging
  if (CookingParams.debug.enabled && CookingParams.debug.logFeatures) {
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
 * Calculate cooking subtype scores based on feature analysis
 */
export function calculateCookingScores(features: CookingFeatures): CookingScores {
  const params = CookingParams;
  let boilingScore = 0;
  let fryingScore = 0;

  // === BOILING SCORING RULES ===
  
  // ΔRH ≥ 6% → +0.50
  if (features.deltaRH >= params.dRH_boiling) {
    boilingScore += params.weights.boiling_dRH;
  }
  
  // R10 ≤ 1.1 → +0.15
  if (features.R10 <= params.R10_boiling) {
    boilingScore += params.weights.boiling_R10;
  }
  
  // peakHeight < 100 → +0.10
  if (features.peakHeight < params.peak_low_boiling) {
    boilingScore += params.weights.boiling_peak;
  }
  
  // 0 ≤ ΔT ≤ 1.5°C → +0.05
  if (features.deltaT >= 0 && features.deltaT <= params.dT_boiling_max) {
    boilingScore += params.weights.boiling_dT;
  }
  
  // R1 ≥ 0.60 → +0.05
  if (features.R1 >= params.R1_boiling_min) {
    boilingScore += params.weights.boiling_R1;
  }

  // === FRYING SCORING RULES ===
  
  // R1 ∈ [0.35, 0.65] → +0.30
  if (features.R1 >= params.R1_frying_min && features.R1 <= params.R1_frying_max) {
    fryingScore += params.weights.frying_R1;
  }
  
  // peakHeight ≥ 100 → +0.25
  if (features.peakHeight >= params.peak_high_frying) {
    fryingScore += params.weights.frying_peak;
  }
  
  // riseRate ≥ 15 → +0.20
  if (features.riseRate >= params.rise_frying) {
    fryingScore += params.weights.frying_rise;
  }
  
  // decayHalfLife ≥ 10 → +0.10
  if (features.decayHalfLife >= params.tHalf_frying) {
    fryingScore += params.weights.frying_tHalf;
  }
  
  // R10 ≤ 1.2 → +0.05
  if (features.R10 <= params.R10_common) {
    fryingScore += params.weights.frying_R10;
  }

  // === CONTEXT BONUSES (applied to both) ===
  
  let contextBonus = 0;
  
  // +0.05 if still
  if (features.still) {
    contextBonus += params.weights.context_still;
  }
  
  // +0.05 if atHome
  if (features.atHome) {
    contextBonus += params.weights.context_home;
  }
  
  // +0.10 if kitchenBeacon
  if (features.kitchenBeacon) {
    contextBonus += params.weights.context_kitchen;
  }
  
  // +0.05 if mealTime
  if (features.mealTime) {
    contextBonus += params.weights.context_mealtime;
  }

  // === ANTI-FALSE-POSITIVE PENALTIES (subtract from both) ===
  
  let penalties = 0;
  
  // −0.25 if !still and R10 > 1.4 (vacuum cleaner)
  if (!features.still && features.R10 > params.penalties.vacR10) {
    penalties += params.weights.penalty_vacuum;
  }
  
  // −0.20 if R1 > 0.80 and ΔRH < 2% (smoke/incense)
  if (features.R1 > params.penalties.smokeR1 && features.deltaRH < params.penalties.dRH_min) {
    penalties += params.weights.penalty_smoke;
  }
  
  // −0.30 if R10 > 1.8 and ΔRH < 2% (dust/construction)
  if (features.R10 > params.penalties.dustR10 && features.deltaRH < params.penalties.dRH_min) {
    penalties += params.weights.penalty_dust;
  }

  // Apply context bonuses and penalties
  boilingScore = Math.max(0, boilingScore + contextBonus - penalties);
  fryingScore = Math.max(0, fryingScore + contextBonus - penalties);

  // Calculate overall confidence and prediction
  const maxScore = Math.max(boilingScore, fryingScore);
  const totalScore = boilingScore + fryingScore;
  const confidence = totalScore > 0 ? maxScore / Math.max(totalScore, 1) : 0;
  
  let predicted: CookSubtype2 | null = null;
  if (maxScore > 0.3) { // Minimum confidence threshold
    predicted = boilingScore > fryingScore ? 'cooking-boiling' : 'cooking-frying';
  }

  const scores: CookingScores = {
    boiling: Number(boilingScore.toFixed(3)),
    frying: Number(fryingScore.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    predicted
  };

  // Controllable debug logging
  if (params.debug.enabled && params.debug.logScores) {
    console.debug('🍳 Cooking Scores Calculated:', {
      boiling: scores.boiling,
      frying: scores.frying,
      confidence: scores.confidence,
      predicted: scores.predicted,
      contextBonus: contextBonus.toFixed(3),
      penalties: penalties.toFixed(3),
      thresholds_used: {
        dRH_boiling: params.dRH_boiling,
        R10_boiling: params.R10_boiling,
        peak_frying: params.peak_high_frying,
        rise_frying: params.rise_frying
      }
    });
    
    if (params.debug.logFeatures) {
      console.debug('🍳 Key Features:', {
        R1: features.R1.toFixed(3),
        R10: features.R10.toFixed(3),
        deltaRH: `${features.deltaRH}%`,
        deltaT: `${features.deltaT}°C`,
        peakHeight: `${features.peakHeight} µg/m³`,
        riseRate: `${features.riseRate} µg/m³/min`,
        decayHalfLife: `${features.decayHalfLife} min`
      });
    }
  }

  return scores;
}

/**
 * Calculate comprehensive cooking features with scoring
 */
export function calculateCookingFeaturesWithScores(
  measurements: PMScanData[],
  episodeStart: Date,
  episodeEnd: Date,
  locationContext?: string,
  automaticContext?: string
): CookingFeaturesWithScores {
  const features = calculateCookingFeatures(
    measurements, 
    episodeStart, 
    episodeEnd, 
    locationContext, 
    automaticContext
  );
  
  const scores = calculateCookingScores(features);

  return {
    ...features,
    scores
  };
}

/**
 * Enhanced cooking event with calculated features and scores
 */
export interface EnhancedCookingEvent extends CookingEvent {
  features?: CookingFeaturesWithScores;
}

/**
 * Detect and enhance cooking events with feature calculation and scoring
 */
export function enhanceCookingEventWithFeatures(
  cookingEvent: CookingEvent,
  measurements: PMScanData[],
  locationContext?: string,
  automaticContext?: string
): EnhancedCookingEvent {
  const episodeStart = new Date(cookingEvent.start);
  const episodeEnd = cookingEvent.end ? new Date(cookingEvent.end) : new Date(episodeStart.getTime() + 30 * 60 * 1000); // Default 30 min
  
  const featuresWithScores = calculateCookingFeaturesWithScores(
    measurements,
    episodeStart,
    episodeEnd,
    locationContext,
    automaticContext
  );

  // Decision logic using simple comparison
  const boil = featuresWithScores.scores.boiling;
  const fry = featuresWithScores.scores.frying;
  
  const chosen = (boil >= fry) ? "cooking-boiling" : "cooking-frying";
  const confidence = Math.max(0, Math.min(1, Math.max(boil, fry)));
  const lowConfidence = confidence < 0.50;

  // Update cooking event with subtype and confidence
  const enhancedEvent: EnhancedCookingEvent = {
    ...cookingEvent,
    features: featuresWithScores,
    subtype: chosen,
    confidence: confidence,
    lowConfidence: lowConfidence || undefined // Only set if true
  };

  // Controllable decision logging
  if (CookingParams.debug.enabled && CookingParams.debug.logDecision) {
    console.log('🍳 Cooking Event Result:', JSON.stringify({
      type: "cooking",
      subtype: chosen,
      confidence: confidence,
      lowConfidence: lowConfidence || undefined,
      scores: {
        boiling: boil,
        frying: fry
      },
      timestamp: enhancedEvent.timestamp.toISOString(),
      duration: featuresWithScores.duration
    }, null, 2));
  }

  return enhancedEvent;
}