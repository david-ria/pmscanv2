import { Map } from 'lucide-react';

interface OptimizedMapPlaceholderProps {
  className?: string;
  message?: string;
}

export function OptimizedMapPlaceholder({ 
  className = "h-full", 
  message = "Map will load when recording starts" 
}: OptimizedMapPlaceholderProps) {
  return (
    <div className={`${className} bg-gradient-to-br from-muted/20 to-muted/40 border border-border rounded-lg relative overflow-hidden`}>
      {/* Optimized background pattern using CSS instead of images */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.1) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="relative">
            {/* Optimized icon with CSS animation instead of heavy images */}
            <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50 animate-pulse-soft" />
            <div className="absolute -inset-2 bg-primary/5 rounded-full animate-ping opacity-20" />
          </div>
          <p className="text-sm text-muted-foreground max-w-48">
            {message}
          </p>
        </div>
      </div>
      
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
    </div>
  );
}