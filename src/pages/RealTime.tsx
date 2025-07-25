import { useState, useEffect } from 'react';
import * as logger from '@/utils/logger';

export default function RealTime() {
  const [showStaticOnly, setShowStaticOnly] = useState(true);
  
  useEffect(() => {
    logger.debug('RealTime: Static placeholder only');
  }, []);

  // Static placeholder - zero hooks, zero processing, zero intelligence
  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Static Air Quality placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">PM1</h3>
          <p className="text-lg font-semibold">--</p>
          <p className="text-xs text-muted-foreground">μg/m³</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">PM2.5</h3>
          <p className="text-lg font-semibold">--</p>
          <p className="text-xs text-muted-foreground">μg/m³</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">PM10</h3>
          <p className="text-lg font-semibold">--</p>
          <p className="text-xs text-muted-foreground">μg/m³</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Status</h3>
          <p className="text-sm font-medium">Ready</p>
        </div>
      </div>

      {/* Toggle buttons placeholder */}
      <div className="flex items-center justify-center mb-3">
        <div className="flex bg-muted p-1 rounded-lg">
          <button className="px-3 py-1.5 text-sm bg-background rounded text-foreground flex items-center gap-2">
            <div className="w-4 h-4 bg-muted-foreground/30 rounded"></div>
            Map
          </button>
          <button className="px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
            <div className="w-4 h-4 bg-muted-foreground/30 rounded"></div>
            Graph
          </button>
        </div>
      </div>

      {/* Static fake map */}
      <div className="h-[45vh] relative mb-4">
        <div className="h-full relative rounded-lg overflow-hidden border border-border bg-gradient-to-br from-muted/30 to-muted/60">
          <div className="absolute inset-0">
            {/* Street grid pattern */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 8 }, (_, i) => (
                <div 
                  key={`h-${i}`}
                  className="absolute h-px bg-muted-foreground/30 w-full"
                  style={{ top: `${12.5 + i * 12.5}%` }}
                />
              ))}
              {Array.from({ length: 6 }, (_, i) => (
                <div 
                  key={`v-${i}`}
                  className="absolute w-px bg-muted-foreground/30 h-full"
                  style={{ left: `${16.6 + i * 16.6}%` }}
                />
              ))}
            </div>
            
            {/* Fake building blocks */}
            <div className="absolute top-[20%] left-[25%] w-8 h-6 bg-muted-foreground/20 rounded-sm"></div>
            <div className="absolute top-[35%] right-[30%] w-10 h-8 bg-muted-foreground/20 rounded-sm"></div>
            <div className="absolute bottom-[40%] left-[40%] w-6 h-10 bg-muted-foreground/20 rounded-sm"></div>
            <div className="absolute bottom-[25%] right-[25%] w-12 h-6 bg-muted-foreground/20 rounded-sm"></div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border">
              <p className="text-sm text-muted-foreground text-center">
                Connect sensor to start recording
              </p>
            </div>
          </div>
          
          {/* Static record button */}
          <div className="absolute bottom-4 right-4">
            <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 bg-white/90 rounded-full"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Static placeholders for other sections */}
      <div className="h-16 bg-muted/10 rounded-lg mb-4"></div>
      <div className="h-20 bg-muted/10 rounded-lg mb-4"></div>
    </div>
  );
}