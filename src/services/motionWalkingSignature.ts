export interface WalkingSigSnapshot {
  walkingSignature: boolean;   // booléen lissé
  walkingConfidence: number;   // 0..1 (cadence normalisée)
  lastUpdated: number;         // epoch ms
}

export class MotionWalkingSignature {
  private snapshot: WalkingSigSnapshot = {
    walkingSignature: false,
    walkingConfidence: 0,
    lastUpdated: Date.now(),
  };

  private emaG = 0;
  private alpha = 0.1;
  private lastPeak = 0;
  private peakHistory: number[] = [];
  private candidate = false;
  private candidateTrueSince: number | null = null;
  private candidateFalseSince: number | null = null;
  private highPassHistory: Array<{ value: number; timestamp: number }> = []; // Pour le calcul RMS

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
    await this.requestPermission();
    window.addEventListener('devicemotion', this.onMotion, true);
    console.log('MotionWalkingSignature started');
  }

  stop(): void {
    window.removeEventListener('devicemotion', this.onMotion, true);
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
    };
    console.log('MotionWalkingSignature stopped');
  }

  private onMotion = (ev: DeviceMotionEvent): void => {
    const ax = ev.accelerationIncludingGravity?.x ?? 0;
    const ay = ev.accelerationIncludingGravity?.y ?? 0;
    const az = ev.accelerationIncludingGravity?.z ?? 0;
    
    // Calculer la magnitude de l'accélération
    const m = Math.sqrt(ax * ax + ay * ay + az * az);
    
    // Filtre passe-haut EMA pour enlever la gravité
    this.emaG = (1 - this.alpha) * this.emaG + this.alpha * m;
    const h = m - this.emaG;
    
    // Garder l'historique pour le calcul RMS (dernières 6s)
    const now = performance.now();
    this.highPassHistory.push({ value: h, timestamp: now });
    this.highPassHistory = this.highPassHistory.filter(item => now - item.timestamp <= 6000);

    // Détection de pics avec période réfractaire
    if (h > 0.8 && (now - this.lastPeak) > 300) {
      this.peakHistory.push(now);
      this.lastPeak = now;
      // Garder seulement les dernières 6s
      this.peakHistory = this.peakHistory.filter(t => now - t <= 6000);
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
    const windowDuration = 6; // 6 secondes
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
    const cadenceOK = cadence >= 70 && cadence <= 180;
    const regularityOK = cv <= 0.30;
    const intensityOK = rms >= 0.5 && rms <= 3.5;

    this.candidate = cadenceOK && regularityOK && intensityOK;

    // Debug logging
    if (this.peakHistory.length >= 3) {
      console.log('Walking detection:', {
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
      
      // Basculer à true après 10s consécutifs
      if ((now - this.candidateTrueSince) / 1000 >= 10) {
        this.snapshot.walkingSignature = true;
      }
    } else {
      // Candidat négatif
      if (!this.candidateFalseSince) {
        this.candidateFalseSince = now;
      }
      this.candidateTrueSince = null;
      
      // Basculer à false après 30s consécutifs
      if ((now - this.candidateFalseSince) / 1000 >= 30) {
        this.snapshot.walkingSignature = false;
      }
    }

    // Calcul de la confiance basée sur la cadence normalisée
    const cadence = this.peakHistory.length > 0 ? (this.peakHistory.length / 6) * 60 : 0;
    this.snapshot.walkingConfidence = Math.min(1, Math.max(0, cadence / 180));
    this.snapshot.lastUpdated = Date.now();
  }

  getSnapshot(): WalkingSigSnapshot {
    return { ...this.snapshot };
  }
}