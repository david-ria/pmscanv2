/* ==========================================================================
 * AUTO CONTEXT – Unified Engine (Single File)
 * - Keeps your rule-based engine (Wi-Fi/time/etc.)
 * - Adds fork preprocessor (UNDERGROUND / INDOOR / OUTDOOR)
 * - Includes full Underground classifier + Cooking detector (frying/boiling)
 * - Web-compatible (no BT required). No external imports.
 * ======================================================================== */

/* ========================= Types (from your code) ======================== */
export interface AutoContextRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher number = higher priority
  conditions: {
    wifi?: { home?: boolean; work?: boolean; known?: boolean; };
    location?: { insideHome?: boolean; insideWork?: boolean; gpsQuality?: 'good' | 'poor'; };
    movement?: { speed?: { min?: number; max?: number; }; isMoving?: boolean; };
    time?: { hourRange?: { start: number; end: number }; isWeekend?: boolean; };
    connectivity?: { cellularSignal?: boolean; carBluetooth?: boolean; };
    weather?: {
      main?: 'Clear'|'Clouds'|'Rain'|'Snow'|'Thunderstorm'|'Drizzle'|'Mist'|'Fog';
      temperature?: { min?: number; max?: number };
      humidity?: { min?: number; max?: number };
    };
    context?: { previousWifi?: 'home'|'work'; latestContextStartsWith?: string; };
  };
  result: string;
}

export interface AutoContextEvaluationData {
  wifi: { home: boolean; work: boolean; known: boolean; currentSSID: string | null; previousSSID: string | null; };
  location: { insideHome: boolean; insideWork: boolean; gpsQuality: 'good' | 'poor'; };
  movement: {
    speed: number; isMoving: boolean;
    walkingSignature?: boolean; // robust 10s/30s hysteresis
    dataQuality?: 'good'|'partial'|'poor';
  };
  time: { currentHour: number; isWeekend?: boolean; };
  connectivity: { cellularSignal: boolean; carBluetooth: boolean; };
  weather: { main: string; temperature: number; humidity: number; };
  context: { latestContext: string; };
}

export interface AutoContextInputs {
  location?: { latitude: number; longitude: number; accuracy?: number; };
  speed?: number;
}

/* ========================= Extra signals (forks) ========================= */
type Fork = 'UNDERGROUND' | 'INDOOR' | 'OUTDOOR';
type GPSQuality = 'good' | 'partial' | 'poor';

export interface ExtraSignals {
  nowMs?: number;
  gpsLossSeconds?: number;               // seconds without GPS / very poor accuracy
  headingVarianceLast30s?: number;       // deg^2 (optional)
  // Air, for cooking
  pm1?: number; pm25?: number; pm10?: number; rh?: number; temp?: number;
  // Raw sensors, for underground
  rawAccel?: { x:number; y:number; z:number };
  rawMag?:   { x:number; y:number; z:number };
  rawBaro?:  { pressure:number };
  // Priors
  hour?: number; weekday?: number;
}

/* ========================= Rule engine (yours) =========================== */
export const DEFAULT_AUTO_CONTEXT_RULES: AutoContextRule[] = [
  // Highest priority: Speed-based driving detection (most reliable)
  { id: 'driving-high-speed', name: 'High-speed driving', description: 'Very high speed movement (>30 km/h) indicates driving', priority: 100, conditions: { movement: { speed: { min: 30 } }, }, result: 'Driving', },
  { id: 'driving-medium-speed', name: 'Medium-speed driving', description: 'Medium speed movement (>20 km/h) indicates vehicle transport', priority: 95, conditions: { movement: { speed: { min: 20 } }, }, result: 'Driving', },
  { id: 'driving-sticky-unless-walk', name: 'Driving sticky unless walking', description: 'Stay Driving if previous was Driving and no walking signature', priority: 96, conditions: { context: { latestContextStartsWith: 'Driving' } }, result: 'Driving', },
  { id: 'driving-redlight', name: 'Driving red light / slow stop', description: 'Remain Driving at very low speed if no walking signature', priority: 94, conditions: { context: { latestContextStartsWith: 'Driving' }, location: { gpsQuality: 'good' }, movement: { speed: { max: 5 } } }, result: 'Driving', },
  // Car bluetooth detection (when available)
  { id: 'driving-car-bluetooth', name: 'Car bluetooth driving', description: 'Car bluetooth connected with movement', priority: 90, conditions: { connectivity: { carBluetooth: true }, movement: { speed: { min: 5 } }, }, result: 'Driving', },
  // Medium-high priority: Outdoor movement
  { id: 'outdoor-cycling', name: 'Cycling', description: 'Medium speed outdoor movement (8-19 km/h) without walking signature', priority: 85, conditions: { location: { gpsQuality: 'good' }, movement: { speed: { min: 8, max: 19 } }, }, result: 'Outdoor cycling', },
  { id: 'outdoor-jogging-accel', name: 'Jogging', description: 'Jogging speed (7-15 km/h) with walking signature', priority: 82, conditions: { location: { gpsQuality: 'good' }, movement: { speed: { min: 7, max: 15 } } }, result: 'Outdoor jogging', },
  { id: 'outdoor-walking', name: 'Walking', description: 'Slow outdoor movement (2-7 km/h) with walking signature', priority: 80, conditions: { location: { gpsQuality: 'good' }, movement: { speed: { min: 2, max: 7 } }, }, result: 'Outdoor walking', },
  // WiFi-based detection with time restrictions (LOWER priority than movement)
  { id: 'wifi-work-hours', name: 'Indoor work', description: 'Connected to WiFi during working hours (weekdays 9-18), stationary', priority: 70, conditions: { wifi: { known: true }, time: { hourRange: { start: 9, end: 18 }, isWeekend: false }, movement: { speed: { max: 2 } } }, result: 'Indoor at work', },
  { id: 'wifi-home-evening', name: 'Indoor home (evening)', description: 'Connected to WiFi during evening hours (after 18:00), stationary', priority: 65, conditions: { wifi: { known: true }, time: { hourRange: { start: 18, end: 23 } }, movement: { speed: { max: 2 } } }, result: 'Indoor at home', },
  { id: 'wifi-home-morning', name: 'Indoor home (morning)', description: 'Connected to WiFi during morning hours (before 9:00), stationary', priority: 65, conditions: { wifi: { known: true }, time: { hourRange: { start: 6, end: 9 } }, movement: { speed: { max: 2 } } }, result: 'Indoor at home', },
  { id: 'wifi-home-weekend', name: 'Indoor home (weekend)', description: 'Connected to WiFi during weekends, stationary', priority: 60, conditions: { wifi: { known: true }, time: { isWeekend: true }, movement: { speed: { max: 2 } } }, result: 'Indoor at home', },
  // Lower priority: General outdoor activities
  { id: 'outdoor-stationary', name: 'Outdoor stationary', description: 'Good GPS signal, stationary, no WiFi', priority: 55, conditions: { location: { gpsQuality: 'good' }, movement: { speed: { max: 2 } }, wifi: { known: false }, }, result: 'Outdoor', },
  // Time-based fallback rules
  { id: 'time-work-hours', name: 'Work hours', description: 'During work hours on weekdays, stationary', priority: 45, conditions: { time: { hourRange: { start: 9, end: 18 }, isWeekend: false }, movement: { speed: { max: 2 } }, }, result: 'At work', },
  { id: 'time-evening-home', name: 'Evening at home', description: 'Evening hours, stationary', priority: 40, conditions: { time: { hourRange: { start: 18, end: 23 } }, movement: { speed: { max: 2 } }, }, result: 'At home', },
  { id: 'time-morning-home', name: 'Morning at home', description: 'Early morning hours, stationary', priority: 40, conditions: { time: { hourRange: { start: 6, end: 9 } }, movement: { speed: { max: 2 } }, }, result: 'At home', },
  // Fallback rules
  { id: 'generic-indoor-wifi', name: 'Generic indoor (WiFi)', description: 'Connected to WiFi, stationary', priority: 30, conditions: { wifi: { known: true }, movement: { speed: { max: 2 } }, }, result: 'Indoor', },
  { id: 'generic-outdoor-moving', name: 'Generic outdoor (moving)', description: 'Moving with good GPS, no WiFi', priority: 25, conditions: { location: { gpsQuality: 'good' }, movement: { isMoving: true }, wifi: { known: false }, }, result: 'Outdoor', },
  { id: 'generic-unknown', name: 'Unknown context', description: 'Cannot determine context', priority: 10, conditions: {}, result: 'Unknown', },
];

export function evaluateAutoContextRules(rules: AutoContextRule[], data: AutoContextEvaluationData): string {
  const sorted = [...rules].sort((a,b)=>b.priority-a.priority);
  for (const rule of sorted) if (matchesRule(rule, data)) return rule.result;
  return 'Unknown';
}

function matchesRule(rule: AutoContextRule, data: AutoContextEvaluationData): boolean {
  const c = rule.conditions;

  // WiFi
  if (c.wifi){
    if (c.wifi.home !== undefined && c.wifi.home !== data.wifi.home) return false;
    if (c.wifi.work !== undefined && c.wifi.work !== data.wifi.work) return false;
    if (c.wifi.known !== undefined && c.wifi.known !== data.wifi.known) return false;
  }
  // Location
  if (c.location){
    if (c.location.insideHome !== undefined && c.location.insideHome !== data.location.insideHome) return false;
    if (c.location.insideWork !== undefined && c.location.insideWork !== data.location.insideWork) return false;
    if (c.location.gpsQuality !== undefined && c.location.gpsQuality !== data.location.gpsQuality) return false;
  }
  // Movement
  if (c.movement){
    if (c.movement.isMoving !== undefined && c.movement.isMoving !== data.movement.isMoving) return false;
    if (c.movement.speed){
      if (c.movement.speed.min !== undefined && data.movement.speed < c.movement.speed.min) return false;
      if (c.movement.speed.max !== undefined && data.movement.speed > c.movement.speed.max) return false;
    }
  }
  // Walking signature directives via description
  const needsWalkSig   = /with walking signature/i.test(rule.description || '');
  const forbidWalkSig  = /without walking signature/i.test(rule.description || '');
  const walkSig = data.movement?.walkingSignature === true;
  if (needsWalkSig && !walkSig) return false;
  if (forbidWalkSig && walkSig) return false;
  if (rule.id === 'driving-sticky-unless-walk' && walkSig) return false;

  // Time
  if (c.time){
    const { hourRange, isWeekend } = c.time;
    const h = data.time.currentHour;
    if (hourRange){
      const { start, end } = hourRange;
      if (start <= end){ if (h < start || h >= end) return false; }
      else { if (h < start && h >= end) return false; }
    }
    if (isWeekend !== undefined && data.time.isWeekend !== isWeekend) return false;
  }
  // Connectivity
  if (c.connectivity){
    if (c.connectivity.cellularSignal !== undefined && c.connectivity.cellularSignal !== data.connectivity.cellularSignal) return false;
    if (c.connectivity.carBluetooth   !== undefined && c.connectivity.carBluetooth   !== data.connectivity.carBluetooth) return false;
  }
  // Weather
  if (c.weather){
    if (c.weather.main !== undefined && c.weather.main !== data.weather.main) return false;
    if (c.weather.temperature){
      const t = data.weather.temperature;
      if (c.weather.temperature.min !== undefined && t < c.weather.temperature.min) return false;
      if (c.weather.temperature.max !== undefined && t > c.weather.temperature.max) return false;
    }
    if (c.weather.humidity){
      const h = data.weather.humidity;
      if (c.weather.humidity.min !== undefined && h < c.weather.humidity.min) return false;
      if (c.weather.humidity.max !== undefined && h > c.weather.humidity.max) return false;
    }
  }
  // Context
  if (c.context){
    if (c.context.previousWifi === 'home' && !data.wifi.previousSSID) return false;
    if (c.context.previousWifi === 'work' && !data.wifi.previousSSID) return false;
    if (c.context.latestContextStartsWith &&
        !data.context.latestContext.startsWith(c.context.latestContextStartsWith)) return false;
  }
  return true;
}

/* ========================= Helpers ======================================= */
const clamp01 = (x:number)=> x<0?0:x>1?1:x;
const mean = (v:number[]) => v.length? v.reduce((a,b)=>a+b,0)/v.length : 0;
const std  = (v:number[]) => { if(!v.length) return 0; const m=mean(v); return Math.sqrt(v.reduce((s,x)=>s+(x-m)*(x-m),0)/v.length); };
const norm01 = (x:number,a:number,b:number)=> b<=a?0: clamp01((x-a)/(b-a));

/* ========================= Underground (full) ============================= */
// Window buffer for underground (feed at sensor cadence)
type UGSample = { time:number; ax?:number; ay?:number; az?:number; mx?:number; my?:number; mz?:number; p?:number };
const UG_WINDOW_MS = 8000;
let ugBuf: UGSample[] = [];
let ugLastStrongAt = 0;

function pushUndergroundSample_(now:number, accel?:{x:number;y:number;z:number}, mag?:{x:number;y:number;z:number}, baro?:{pressure:number}){
  ugBuf.push({ time: now, ax:accel?.x, ay:accel?.y, az:accel?.z, mx:mag?.x, my:mag?.y, mz:mag?.z, p:baro?.pressure });
  const cutoff = now - UG_WINDOW_MS; while(ugBuf.length && ugBuf[0].time < cutoff) ugBuf.shift();
}
function rms3(ax:number[],ay:number[],az:number[]){ const sx=std(ax),sy=std(ay),sz=std(az); return Math.sqrt((sx*sx+sy*sy+sz*sz)/3); }
function rms3Mag(mx:number[],my:number[],mz:number[]){ const sx=std(mx),sy=std(my),sz=std(mz); return Math.sqrt((sx*sx+sy*sy+sz*sz)/3); }
function estimateFs_(times:number[]){ if(times.length<2) return 0; const dt:number[]=[]; for(let i=1;i<times.length;i++){ const d=(times[i]-times[i-1])/1000; if(d>0) dt.push(d);} dt.sort((a,b)=>a-b); const med=dt[Math.floor(dt.length/2)]||0; return med>0?1/med:0; }
function autocorrNorm_(x:number[], maxLag:number){ const n=x.length; if(n<4) return new Array(maxLag+1).fill(0); const m=mean(x); const xc=x.map(v=>v-m); const den=xc.reduce((s,v)=>s+v*v,0)||1e-9; const ac=new Array(maxLag+1).fill(0); for(let lag=0;lag<=maxLag;lag++){ let num=0; for(let i=lag;i<n;i++) num += xc[i]*xc[i-lag]; ac[lag]=num/den; } return ac; }
function computeWalkScoreUG_(buf: UGSample[]){
  const ax=buf.map(s=>s.ax??0), ay=buf.map(s=>s.ay??0), az=buf.map(s=>s.az??0), t=buf.map(s=>s.time);
  const g=ax.map((_,i)=>Math.sqrt(ax[i]*ax[i]+ay[i]*ay[i]+az[i]*az[i])); const fs=estimateFs_(t);
  if(fs>=15){ const fMin=1.0,fMax=2.5; const lagMin=Math.max(1,Math.floor(fs/fMax)); const lagMax=Math.max(lagMin+1,Math.floor(fs/fMin)); const ac=autocorrNorm_(g,lagMax); let peak=0; for(let lag=lagMin;lag<=lagMax;lag++){ if(ac[lag]>peak) peak=ac[lag]; } return { score: clamp01(peak), isWalking: peak>=0.35, fs }; }
  const diff:number[]=[]; for(let i=1;i<g.length;i++) diff.push(Math.abs(g[i]-g[i-1])); const jumpRate = diff.filter(d=>d>0.15).length/Math.max(1,diff.length);
  const score = Math.min(1, 0.5*jumpRate + 0.5*Math.min(1, std(g)/0.25)); return { score, isWalking: score>=0.5, fs };
}
const UG_TH = { ACCEL_WALK_MIN:0.20, MAG_HIGH_MIN:5.00, ACCEL_VERY_LOW:0.06, ACCEL_LOW:0.12, MAG_LOW_MAX:2.20, BARO_STD_ESC:0.10, BARO_SLOPE_ESC:0.04 };
function classifyUnderground_(buf: UGSample[]){
  const times=buf.map(s=>s.time);
  const ax=buf.map(s=>s.ax??0), ay=buf.map(s=>s.ay??0), az=buf.map(s=>s.az??0);
  const mx=buf.map(s=>s.mx??0), my=buf.map(s=>s.my??0), mz=buf.map(s=>s.mz??0);
  const p =buf.map(s=>s.p).filter(v=>Number.isFinite(v)) as number[];

  const accelStd = rms3(ax,ay,az);
  const magnetoStd = rms3Mag(mx,my,mz);
  const baroStd = p.length>=3 ? std(p) : 0;

  // slope per sec on baro
  let baroSlope = 0;
  if(p.length>=3){
    const t0=times[times.length - p.length];
    const t = times.slice(-p.length).map(T=>(T-(t0||T))/1000);
    const xm=mean(t), ym=mean(p);
    let num=0, den=0; for(let i=0;i<p.length;i++){ num+=(t[i]-xm)*(p[i]-ym); den+=(t[i]-xm)*(t[i]-xm); }
    baroSlope = den===0?0:num/den;
  }

  const { score:walkScore, isWalking, fs } = computeWalkScoreUG_(buf);

  // 1) Walk platform
  if (isWalking || accelStd >= UG_TH.ACCEL_WALK_MIN) {
    return { context:"Walk platform", confidence: clamp01(0.65 + 0.25*walkScore + 0.2*norm01(accelStd, UG_TH.ACCEL_WALK_MIN, UG_TH.ACCEL_WALK_MIN*2)),
             evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
  }
  // 2) Subway moving
  if (magnetoStd >= UG_TH.MAG_HIGH_MIN && accelStd < UG_TH.ACCEL_WALK_MIN) {
    return { context:"Underground Transport", confidence: clamp01(0.7 + 0.2*norm01(magnetoStd, UG_TH.MAG_HIGH_MIN, UG_TH.MAG_HIGH_MIN*2)),
             evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
  }
  // 3) Escalator underground
  if ( (baroStd >= UG_TH.BARO_STD_ESC) ||
       (Math.abs(baroSlope) >= UG_TH.BARO_SLOPE_ESC && accelStd >= 0.02 && accelStd < UG_TH.ACCEL_WALK_MIN) ) {
    return { context:"Escalator underground", confidence: clamp01(0.6 + 0.2*norm01(baroStd, UG_TH.BARO_STD_ESC, UG_TH.BARO_STD_ESC*1.8)),
             evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
  }
  // 4) Underground Station (not moving)
  if (accelStd <= UG_TH.ACCEL_VERY_LOW && (magnetoStd >= 2.0 && magnetoStd < UG_TH.MAG_HIGH_MIN)) {
    return { context:"Underground Station", confidence: 0.6,
             evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
  }
  // 5) Stand platform (calm)
  if (accelStd <= UG_TH.ACCEL_LOW && magnetoStd <= UG_TH.MAG_LOW_MAX) {
    return { context:"Stand platform", confidence: 0.6,
             evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
  }
  return { context:"Stand platform", confidence: 0.5,
           evidence:{ accelStd, magnetoStd, baroStd, baroSlope, walkScore, fs } };
}

/* ========================= Cooking (streaming) =========================== */
const EWMA_ALPHA = 0.02; // ~25–30 min @1Hz
const COOK = {
  triggerDelta25: 25, triggerSlope25: 10, confirmMinDur: 180000,
  keepDelta25: 20, keepDeltaRH: 2, scoreEnter: 0.60, holdMs: 600000
};
let b25=10, b10=10, bRH=45, bT=21;
let cookState:'idle'|'episode'|'cooking'='idle';
let cookStart=0, cookLastAbove=0, cookScoreMax=0;
const ringChecks:boolean[]=[];

const ewma = (prev:number,x:number,a=EWMA_ALPHA)=> a*x+(1-a)*prev;
const isStill = (speed=0, accelVar=0)=> speed<0.3 && accelVar<0.015;

function updateCooking_(now:number, pm1=0, pm25=0, pm10=0, temp=21, rh=45, still=true, atHome=false, beacon=false, isMeal=false){
  // baselines
  b25=ewma(b25,pm25); b10=ewma(b10,pm10); bRH=ewma(bRH,rh); bT=ewma(bT,temp);
  // quick deltas (approx slopes)
  const dPM25 = pm25 - b25;
  const dRH   = rh   - bRH;
  const dT    = temp - bT;
  const R1 = pm25>0 ? pm1/pm25 : 0;
  const R10= pm25>0 ? pm10/pm25: 0;

  const trigNow = (pm25 >= b25 + COOK.triggerDelta25) && (dPM25 >= COOK.triggerSlope25);
  ringChecks.push(trigNow); while(ringChecks.length>3) ringChecks.shift();
  const trig23 = ringChecks.filter(Boolean).length >= 2;

  if (cookState==='idle' && trig23){ cookState='episode'; cookStart=now; cookScoreMax=0; }

  if (cookState!=='idle'){
    let score=0;
    // S1 PM spikes (frying-ish)
    if (pm25 >= b25 + 100) score+=0.30;
    else if (pm25 >= b25 + 50) score+=0.15;
    if (pm10 > b10 && R10 <= 1.2) score+=0.05;
    // S2 granulometry (frying-ish)
    if (R1>=0.35 && R1<=0.70) score+=0.10;
    if (R10<=1.0) score+=0.10;
    // S3 steam/boiling
    if ((rh-bRH)>=4) score+=0.10;
    if ((temp-bT)>=1.0) score+=0.10;
    // S4 context
    if (still) score+=0.10;
    if (atHome) score+=0.10;
    if (beacon) score+=0.05;
    // S5 time prior
    if (isMeal) score+=0.05;
    // Anti FP
    if (!still && R10>1.5) score -= 0.25;   // vacuum
    if (R1>0.8 && (rh-bRH)<2) score -= 0.20; // smoking/incense
    if (R10>1.8 && (rh-bRH)<2) score -= 0.30; // dust

    cookScoreMax = Math.max(cookScoreMax, score);
    if (cookState==='episode' && cookScoreMax>=COOK.scoreEnter && (now-cookStart)>=COOK.confirmMinDur) cookState='cooking';

    const above = (pm25 > b25 + COOK.keepDelta25) || ((rh - bRH) > COOK.keepDeltaRH);
    if (above) cookLastAbove = now;

    const tooLow = (now - cookLastAbove) > COOK.holdMs;
    if (cookState==='cooking' && tooLow){
      cookState='idle'; // closed; subtype can be inferred by current signals if you log event
    } else if (cookState==='episode' && !trig23 && tooLow){
      cookState='idle';
    }
  }
  // active?
  if (cookState==='cooking'){
    const strongPM = (pm25 - b25) >= 80 && R1>=0.35 && R1<=0.7 && (rh-bRH)<2;
    const strongRH = (rh-bRH) >= 4 || (temp-bT)>=1.0;
    const subtype: 'frying'|'boiling'|'unknown' =
      strongPM && !strongRH ? 'frying' :
      strongRH && !strongPM ? 'boiling' :
      (strongPM && strongRH ? ((pm25-b25)>120?'frying':'boiling') : 'unknown');
    return { active:true, subtype, scoreMax:cookScoreMax };
  }
  return { active:false, scoreMax:cookScoreMax };
}

/* ========================= Fork logic ==================================== */
const UNDERGROUND_GATE_SEC = 25;
const UNDERGROUND_EXIT_HYST_SEC = 12;

function decideFork_(data: AutoContextEvaluationData, extras: ExtraSignals): Fork {
  const gpsLoss = (extras.gpsLossSeconds ?? 0) >= UNDERGROUND_GATE_SEC || data.location.gpsQuality === 'poor';
  const now = extras.nowMs ?? Date.now();
  if (gpsLoss) return 'UNDERGROUND';
  if ((now - ugLastStrongAt) < UNDERGROUND_EXIT_HYST_SEC*1000) return 'UNDERGROUND';

  // Indoor proxy (web): poor/partial GPS + stationary
  const indoorProxy = (data.location.gpsQuality !== 'good') && (data.movement.speed < 2) && !data.movement.isMoving;
  if (indoorProxy) return 'INDOOR';

  return 'OUTDOOR';
}

/* ========================= Main unified evaluator ======================== */
export function evaluateAutoContextUnified(
  rules: AutoContextRule[],
  data: AutoContextEvaluationData,
  extras: ExtraSignals = {}
): string {
  const now = extras.nowMs ?? Date.now();

  // Feed underground buffer if raw sensors present
  if (extras.rawAccel || extras.rawMag || extras.rawBaro) {
    pushUndergroundSample_(now, extras.rawAccel, extras.rawMag, extras.rawBaro);
  }

  const fork = decideFork_(data, extras);

  if (fork === 'UNDERGROUND') {
    if (ugBuf.length) {
      const ug = classifyUnderground_(ugBuf);
      // lock exit hysteresis when strong enough
      if (ug.confidence >= 0.55) ugLastStrongAt = now;
      return ug.context; // "Underground Transport" | "Underground Station" | "Escalator underground" | "Walk platform" | "Stand platform"
    }
    // if buffer empty, fall through to generic rules later
  }

  if (fork === 'INDOOR') {
    const cook = updateCooking_(
      now,
      extras.pm1 ?? 0, extras.pm25 ?? 0, extras.pm10 ?? 0,
      extras.temp ?? 21, extras.rh ?? 45,
      (data.movement.speed<0.3) && !data.movement.isMoving, // still proxy
      data.wifi.home, /*beacon*/false,
      extras.hour !== undefined ? ((extras.hour>=11&&extras.hour<=14)||(extras.hour>=18&&extras.hour<=21)) : false
    );
    if (cook.active) return 'Indoor Cooking';
    // else: let your Wi-Fi/time rules pick "Indoor at work/home/…"
  }

  if (fork === 'OUTDOOR') {
    const speed = data.movement.speed ?? 0;
    const walking = data.movement.walkingSignature === true;
    const prev = data.context.latestContext || '';
    // Driving – sustained (accept partial in your dataQuality if you have it)
    if (speed >= 22 && !walking) return 'Driving';
    // Driving – red light sticky (no walking)
    if (prev.startsWith('Driving') && speed < 5 && !walking) return 'Driving';
    // Driving – immunize after fast segment
    if (speed >= 28) return 'Driving';
    // Cycling
    if (speed >= 8 && speed < 22 && !walking) return 'Outdoor cycling';
    // Outdoor walking/jogging
    if (walking && speed >= 2 && speed <= 7) return 'Outdoor walking';
    if (walking && speed > 7 && speed <= 12) return 'Outdoor jogging';
  }

  // Fallback to your rule engine (keeps Working-at-home via Wi-Fi)
  return evaluateAutoContextRules(rules, data);
}

/* ========================= Convenience wrapper =========================== */
// If you prefer a function name aligned with your codebase:
export function evaluateAutoContextWithForks(
  rules: AutoContextRule[],
  data: AutoContextEvaluationData,
  extras: ExtraSignals = {}
): string {
  return evaluateAutoContextUnified(rules, data, extras);
}

/* ========================= Usage example =================================
const context = evaluateAutoContextUnified(
  DEFAULT_AUTO_CONTEXT_RULES,
  data, // AutoContextEvaluationData
  {
    nowMs: Date.now(),
    gpsLossSeconds,
    pm1, pm25, pm10, rh, temp,
    rawAccel: {x, y, z}, rawMag: {x:mx, y:my, z:mz}, rawBaro: {pressure},
    hour
  }
);
=========================================================================== */
