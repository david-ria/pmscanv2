// Optimized vector-based air quality visualization
import { useMemo } from 'react';

interface AirQualityVisualizationProps {
  pm25Value: number;
  quality: {
    level: string;
    color: string;
  };
  className?: string;
}

export function AirQualityVisualization({ 
  pm25Value, 
  quality, 
  className = "w-full h-24" 
}: AirQualityVisualizationProps) {
  // Generate optimized SVG visualization instead of heavy images
  const gradientId = `air-quality-${quality.level}`;
  
  const particleCount = useMemo(() => {
    // Optimize particle count based on quality level
    return Math.min(Math.floor(pm25Value / 5), 50);
  }, [pm25Value]);

  return (
    <div className={`${className} relative overflow-hidden rounded-lg`}>
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 200 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`hsl(var(--${quality.color}) / 0.1)`} />
            <stop offset="100%" stopColor={`hsl(var(--${quality.color}) / 0.05)`} />
          </linearGradient>
          
          {/* Optimized particle animation using CSS transforms */}
          <circle id="particle" r="0.5" fill={`hsl(var(--${quality.color}) / 0.3)`}>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="translate"
              values="0,100; 0,0; 0,100"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
        </defs>
        
        {/* Background gradient */}
        <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        
        {/* Optimized particle system using SVG animation */}
        {Array.from({ length: Math.min(particleCount, 20) }).map((_, i) => (
          <use
            key={i}
            href="#particle"
            x={10 + (i * 8) % 180}
            y={20 + (i * 3) % 60}
            style={{
              animationDelay: `${i * 0.2}s`,
              opacity: Math.max(0.1, 1 - (i / particleCount))
            }}
          />
        ))}
        
        {/* Quality level indicator */}
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="text-xs font-medium"
          fill={`hsl(var(--${quality.color}))`}
        >
          {quality.level}
        </text>
      </svg>
    </div>
  );
}