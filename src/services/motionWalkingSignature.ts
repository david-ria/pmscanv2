export interface WalkingSigSnapshot {
  walkingSignature: boolean;   // booléen lissé
  walkingConfidence: number;   // 0..1 (placeholder)
  lastUpdated: number;         // epoch ms
}

export class MotionWalkingSignature {
  private snapshot: WalkingSigSnapshot = {
    walkingSignature: false,
    walkingConfidence: 0,
    lastUpdated: Date.now(),
  };

  // à appeler au démarrage de la session
  async start(): Promise<void> {
    // placeholder — logic in next steps
    this.snapshot = { walkingSignature: false, walkingConfidence: 0, lastUpdated: Date.now() };
  }

  // à appeler à l'arrêt de la session
  stop(): void {
    // placeholder
  }

  // récupéré par le moteur de règles
  getSnapshot(): WalkingSigSnapshot {
    return this.snapshot;
  }
}