import { AUTO_CTX_CFG } from '@/lib/autoContext.config';
import * as logger from '@/utils/logger';

export interface WalkingSigSnapshot {
  walkingSignature: boolean;   // booléen lissé
  walkingConfidence: number;   // 0..1 (cadence normalisée)
  lastUpdated: number;         // epoch ms
  isActive: boolean;           // accelerometer is receiving data
  isSupported: boolean;        // device supports accelerometer
}

export class MotionWalkingSignature {
  private static instance: MotionWalkingSignature | null = null;
  
  private snapshot: WalkingSigSnapshot = {
    walkingSignature: false,
    walkingConfidence: 0,
    lastUpdated: Date.now(),
    isActive: false,
    isSupported: false,
  };

  private emaG = 0;
  private alpha = 0.1;
  private lastPeak = 0;
  private peakHistory: number[] = [];
  private candidate = false;
  private candidateTrueSince: number | null = null;
  private candidateFalseSince: number | null = null;
  private highPassHistory: Array<{ value: number; timestamp: number }> = [];
  private lastMotionEvent = 0; // Track last accelerometer event
  private timeoutId: number | null = null;
  private started = false;

  // Singleton pattern to prevent multiple instances
  static getInstance(): MotionWalkingSignature {
    if (!MotionWalkingSignature.instance) {
      MotionWalkingSignature.instance = new MotionWalkingSignature();
    }
    return MotionWalkingSignature.instance;
  }

  // Check if device supports motion events
  private isDeviceSupported(): boolean {
    // Check if DeviceMotionEvent is available
    if (typeof DeviceMotionEvent === 'undefined') {
      return false;
    }

    // Check if we're on a mobile device (basic heuristic)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    return isMobile;
  }

  // Demande de permission iOS Safari
  private async requestPermission(): Promise<void> {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permission denied for device motion');
        }
      } catch (error) {
        console.error('Failed to request device motion permission:', error);
        throw error;
      }
    }
  }

  async start(): Promise<void> {
    if (this.started) {
      return; // Already started
    }

    // Check device support first
    this.snapshot.isSupported = this.isDeviceSupported();
    if (!this.snapshot.isSupported) {
      logger.rateLimitedDebug('motion-unsupported', 30000, 'MotionWalkingSignature: Device does not support motion events or is not mobile');
      return;
    }

    try {
      await this.requestPermission();
      this.lastMotionEvent = performance.now(); // Initialize to current time
      window.addEventListener('devicemotion', this.onMotion, true);
      this.snapshot.isActive = true;
      this.startTimeoutMonitoring();
      this.started = true;
      logger.rateLimitedDebug('motion-started', 30000, 'MotionWalkingSignature started successfully');
    } catch (error) {
      logger.warn('MotionWalkingSignature: Failed to start due to permission error:', error);
      this.snapshot.isSupported = false;
    }
  }

  stop(): void {
    if (!this.started) {
      return; // Already stopped
    }

    window.removeEventListener('devicemotion', this.onMotion, true);
    this.stopTimeoutMonitoring();
    this.started = false;
    
    // Reset state
    this.emaG = 0;
    this.peakHistory = [];
    this.highPassHistory = [];
    this.candidate = false;
    this.candidateTrueSince = null;
    this.candidateFalseSince = null;
    this.snapshot = {
      walkingSignature: false,
      walkingConfidence: 0,
      lastUpdated: Date.now(),
      isActive: false,
      isSupported: this.snapshot.isSupported, // Preserve support status
    };
    logger.rateLimitedDebug('motion-stopped', 30000, 'MotionWalkingSignature stopped');
  }

  private startTimeoutMonitoring(): void {
    this.stopTimeoutMonitoring();
    this.timeoutId = window.setInterval(() => {
      const now = performance.now();
      if (now - this.lastMotionEvent > AUTO_CTX_CFG.ACC_TIMEOUT_MS) {
        // Use rate-limited warning to prevent console spam
        logger.warn('Accelerometer timeout - no motion data received');
        this.snapshot.walkingSignature = false;
        this.snapshot.isActive = false;
        this.snapshot.lastUpdated = Date.now();
      }
    }, 5000); // Check every 5 seconds instead of every second
  }

  private stopTimeoutMonitoring(): void {
    if (this.timeoutId !== null) {
      clearInterval(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private onMotion = (ev: DeviceMotionEvent): void => {
    const now = performance.now();
    this.lastMotionEvent = now;
    this.snapshot.isActive = true;
    
    const ax = ev.accelerationIncludingGravity?.x ?? 0;
    const ay = ev.accelerationIncludingGravity?.y ?? 0;
    const az = ev.accelerationIncludingGravity?.z ?? 0;
    
    // Calculer la magnitude de l'accélération
    const m = Math.sqrt(ax * ax + ay * ay + az * az);
    
    // Filtre passe-haut EMA pour enlever la gravité
    this.emaG = (1 - this.alpha) * this.emaG + this.alpha * m;
    const h = m - this.emaG;
    
    // Garder l'historique pour le calcul RMS (dernières 6s)
    this.highPassHistory.push({ value: h, timestamp: now });
    this.highPassHistory = this.highPassHistory.filter(
      item => now - item.timestamp <= AUTO_CTX_CFG.ACC_WIN_SEC * 1000
    );

    // Détection de pics avec période réfractaire
    if (h > AUTO_CTX_CFG.ACC_PEAK_THR && (now - this.lastPeak) > AUTO_CTX_CFG.ACC_REFRAC_MS) {
      this.peakHistory.push(now);
      this.lastPeak = now;
      // Garder seulement les dernières 6s
      this.peakHistory = this.peakHistory.filter(
        t => now - t <= AUTO_CTX_CFG.ACC_WIN_SEC * 1000
      );
    }

    this.evaluate(now);
  };

  private evaluate(now: number): void {
    // Besoin d'au moins 3 pics pour calculer la régularité
    if (this.peakHistory.length < 3) {
      this.candidate = false;
      this.updateHysteresis(now);
      return;
    }

    // Calcul de la cadence (pics/min)
    const windowDuration = AUTO_CTX_CFG.ACC_WIN_SEC;
    const cadence = (this.peakHistory.length / windowDuration) * 60;

    // Calcul de la régularité (coefficient de variation des intervalles)
    const intervals = this.peakHistory.slice(1).map((t, i) => (t - this.peakHistory[i]) / 1000);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((s, x) => s + (x - avg) ** 2, 0) / intervals.length;
    const sd = Math.sqrt(variance);
    const cv = avg > 0 ? sd / avg : 1;

    // Calcul de l'intensité (RMS du signal passe-haut)
    let rms = 0;
    if (this.highPassHistory.length > 0) {
      const sumSquares = this.highPassHistory.reduce((s, item) => s + item.value ** 2, 0);
      rms = Math.sqrt(sumSquares / this.highPassHistory.length);
    }

    // Application des critères
    const cadenceOK = cadence >= AUTO_CTX_CFG.ACC_CADENCE_MIN && cadence <= AUTO_CTX_CFG.ACC_CADENCE_MAX;
    const regularityOK = cv <= AUTO_CTX_CFG.ACC_CV_MAX;
    const intensityOK = rms >= AUTO_CTX_CFG.ACC_RMS_MIN && rms <= AUTO_CTX_CFG.ACC_RMS_MAX;

    this.candidate = cadenceOK && regularityOK && intensityOK;

    // Rate-limited debug logging only in development
    if (this.peakHistory.length >= 3) {
      logger.rateLimitedDebug('walking-detection', 5000, 'Walking detection:', {
        cadence: cadence.toFixed(1),
        regularity: cv.toFixed(3),
        intensity: rms.toFixed(2),
        candidate: this.candidate,
        criteria: { cadenceOK, regularityOK, intensityOK }
      });
    }

    this.updateHysteresis(now);
  }

  private updateHysteresis(now: number): void {
    if (this.candidate) {
      // Candidat positif
      if (!this.candidateTrueSince) {
        this.candidateTrueSince = now;
      }
      this.candidateFalseSince = null;
      
      // Basculer à true après X secondes consécutives
      if ((now - this.candidateTrueSince) / 1000 >= AUTO_CTX_CFG.ACC_HOLD_ENTER) {
        this.snapshot.walkingSignature = true;
      }
    } else {
      // Candidat négatif
      if (!this.candidateFalseSince) {
        this.candidateFalseSince = now;
      }
      this.candidateTrueSince = null;
      
      // Basculer à false après X secondes consécutives
      if ((now - this.candidateFalseSince) / 1000 >= AUTO_CTX_CFG.ACC_HOLD_EXIT) {
        this.snapshot.walkingSignature = false;
      }
    }

    // Calcul de la confiance basée sur la cadence normalisée
    const cadence = this.peakHistory.length > 0 ? (this.peakHistory.length / AUTO_CTX_CFG.ACC_WIN_SEC) * 60 : 0;
    this.snapshot.walkingConfidence = Math.min(1, Math.max(0, cadence / AUTO_CTX_CFG.ACC_CADENCE_MAX));
    this.snapshot.lastUpdated = Date.now();
  }

  getSnapshot(): WalkingSigSnapshot {
    return { ...this.snapshot };
  }
}