export const AUTO_CTX_CFG = {
  // GPS Speed Estimator Configuration
  GPS_ACCURACY_MAX: 20,     // m, au-delà = 'poor'
  EMA_ALPHA: 0.25,          // vitesse lissée
  MIN_DT: 0.5,              // s, min intervalle GPS
  MAX_JUMP: 100,            // km/h, pour filtrer spikes

  // Accelerometer Walking Signature Configuration
  ACC_PEAK_THR: 0.8,        // m/s², seuil détection pas
  ACC_REFRAC_MS: 300,       // ms, réfractaire
  ACC_WIN_SEC: 6,           // s, fenêtre analyse
  ACC_CADENCE_MIN: 70,      // pas/min
  ACC_CADENCE_MAX: 180,     // pas/min
  ACC_CV_MAX: 0.30,         // variabilité inter-pas
  ACC_RMS_MIN: 0.5,         // m/s²
  ACC_RMS_MAX: 3.5,         // m/s²
  ACC_HOLD_ENTER: 10,       // s consécutifs pour entrer marche
  ACC_HOLD_EXIT: 30,        // s consécutifs pour sortir marche
  ACC_TIMEOUT_MS: 5000,     // ms, timeout sans event → force false

  // Speed-based Rule Thresholds
  SPEED_DRIVING_ENTER: 20,  // km/h
  SPEED_RED_LIGHT_MAX: 5,   // km/h
} as const;

export type DataQuality = 'good' | 'partial' | 'poor';

/**
 * Calculate combined data quality from GPS and accelerometer status
 */
export function calculateDataQuality(
  gpsQuality: 'good' | 'poor',
  accelerometerActive: boolean
): DataQuality {
  if (gpsQuality === 'good' && accelerometerActive) {
    return 'good';
  }
  if (gpsQuality === 'good' || accelerometerActive) {
    return 'partial';
  }
  return 'poor';
}