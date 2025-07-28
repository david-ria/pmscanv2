
import { useState, useEffect, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';

type PMType = 'pm1' | 'pm25' | 'pm10';

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

interface PollutionPieChartProps {
  breakdownData: BreakdownData[];
  pmType: PMType;
}

export const PollutionPieChart = ({
  breakdownData,
  pmType,
}: PollutionPieChartProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
          setIsReady(true);
        }
      }
    };

    // Initial measurement
    updateDimensions();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver if available for more accurate container size tracking
    if (containerRef.current && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        clearTimeout(timeoutId);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  if (breakdownData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('analysis.noDataForPeriod')}
      </div>
    );
  }

  // Don't render chart until container dimensions are available
  if (!isReady || dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div ref={containerRef} className="w-full h-full min-h-[200px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">{t('common.loading')}...</div>
      </div>
    );
  }

  // Custom label function for better mobile display
  const renderCustomLabel = (entry: any) => {
    // Hide labels on very small screens to avoid clutter
    if (dimensions.width < 400) {
      return null;
    }
    
    if (entry.percentage < 5) {
      return null; // Don't show labels for very small slices
    }
    
    return `${entry.percentage.toFixed(0)}%`;
  };

  // Responsive configuration based on actual container size
  const isSmallScreen = dimensions.width < 640;
  const isMobileScreen = dimensions.width < 400;

  return (
    <div ref={containerRef} className="w-full h-full min-h-[200px]">
      <ResponsiveContainer 
        width={dimensions.width} 
        height={dimensions.height}
        minHeight={200}
      >
        <PieChart>
          <Pie
            data={breakdownData}
            cx="50%"
            cy="50%"
            outerRadius={isSmallScreen ? "60%" : "70%"}
            innerRadius={isMobileScreen ? "20%" : "0%"}
            fill="#8884d8"
            dataKey="percentage"
            label={renderCustomLabel}
            labelLine={false}
          >
            {breakdownData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value.toFixed(1)}%`,
              `PM${pmType.replace('pm', '')}: ${Math.round(props.payload.avgPM)} μg/m³`,
            ]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: isSmallScreen ? '12px' : '14px',
              padding: '8px',
            }}
          />
          {!isMobileScreen && (
            <Legend 
              wrapperStyle={{ 
                fontSize: isSmallScreen ? '11px' : '12px',
                paddingTop: '10px'
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
