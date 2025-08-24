import { AUTO_CTX_CFG } from '@/lib/autoContext.config';

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // m
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type Fix = { lat: number; lon: number; t: number; acc?: number | null };

export class GeoSpeedEstimator {
  private prev?: Fix;
  private vEma = 0;              // km/h
  private readonly alpha = AUTO_CTX_CFG.EMA_ALPHA;
  private readonly maxAcc = AUTO_CTX_CFG.GPS_ACCURACY_MAX;
  private readonly maxJump = AUTO_CTX_CFG.MAX_JUMP;
  private readonly minDt = AUTO_CTX_CFG.MIN_DT;

  update(fix: Fix): { speedKmh: number; gpsQuality: 'good' | 'poor' } {
    const acc = fix.acc ?? null;
    let quality: 'good' | 'poor' = (acc !== null && acc > this.maxAcc) ? 'poor' : 'good';

    if (!this.prev) {
      this.prev = fix;
      return { speedKmh: this.vEma, gpsQuality: quality };
    }

    const dt = (fix.t - this.prev.t) / 1000; // s
    if (!isFinite(dt) || dt <= this.minDt) {
      // trop court ou invalide, ne pas bouger la vitesse
      this.prev = fix;
      return { speedKmh: this.vEma, gpsQuality: quality };
    }

    // si l'un des deux fixes a une précision très faible → qualité globale pauvre
    if ((this.prev.acc ?? 0) > this.maxAcc || (fix.acc ?? 0) > this.maxAcc) {
      quality = 'poor';
    }

    const d = haversineMeters(this.prev.lat, this.prev.lon, fix.lat, fix.lon); // m
    const vMs = d / dt;                   // m/s
    let vKmh = vMs * 3.6;                 // km/h

    // anti-spike (perte/recouvrement GPS)
    if (vKmh > this.maxJump) {
      vKmh = this.maxJump;
      quality = 'poor';
    }

    // EMA
    if (this.vEma === 0) this.vEma = vKmh;
    else this.vEma = this.alpha * vKmh + (1 - this.alpha) * this.vEma;

    this.prev = fix;
    return { speedKmh: this.vEma, gpsQuality: quality };
  }

  reset(): void {
    this.prev = undefined;
    this.vEma = 0;
  }

  getCurrentSpeed(): number {
    return this.vEma;
  }
}