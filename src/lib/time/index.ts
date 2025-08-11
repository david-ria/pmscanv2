/**
 * Core time management - single source of truth for all timing
 * Provides monotonic clock for durations and wall clock for timestamps
 */

// Monotonic clock for durations and scheduling
export const clock = { 
  now: () => performance.now() 
};

// Wall-clock authority with optional server offset
class TimeAuthority {
  private offsetMs = 0;
  
  now(): number { 
    return Date.now() + this.offsetMs; // epoch ms UTC
  }
  
  setOffset(ms: number): void { 
    this.offsetMs = ms; 
  }
  
  getOffset(): number {
    return this.offsetMs;
  }
}

export const timeAuthority = new TimeAuthority();

export async function initTimeSync(): Promise<void> {
  try {
    const samples: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      
      // Use a more robust fetch approach
      const res = await fetch('https://shydpfwuvnlzdzbubmgb.supabase.co/functions/v1/get-server-time', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) {
        throw new Error(`time-sync ${res.status}: ${res.statusText}`);
      }
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`time-sync bad content-type: ${contentType}`);
      }
      
      const data = await res.json();
      
      // Support both `epochMs` and `serverEpochMs` properties
      const serverTime = data.epochMs || data.serverEpochMs;
      if (typeof serverTime !== 'number') {
        throw new Error(`time-sync invalid response: missing epochMs/serverEpochMs`);
      }
      
      const t1 = performance.now();
      const rtt = t1 - t0;
      
      // Estimate server time at receive moment
      const estServerAtReceive = serverTime + rtt / 2;
      const localReceive = Date.now();
      samples.push(estServerAtReceive - localReceive);
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    samples.sort((a, b) => a - b);
    const medianOffset = samples[Math.floor(samples.length / 2)] ?? 0;
    timeAuthority.setOffset(medianOffset);
    
    console.log(`⏰ Time sync completed, offset: ${medianOffset}ms`);
  } catch (error) {
    console.warn('⏰ Time sync failed, using local clock:', error);
    // Fall back to local clock (offset remains 0)
  }
}

// Utility functions for time conversion
export function toDate(epochMs: number): Date {
  return new Date(epochMs);
}

export function toEpochMs(input: number | Date | string): number {
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  
  // ISO string → number
  const t = Date.parse(input);
  if (Number.isNaN(t)) {
    throw new Error(`Invalid timestamp: ${input}`);
  }
  return t;
}