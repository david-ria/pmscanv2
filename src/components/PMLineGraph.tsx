import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime, isValidTimestamp } from '@/utils/timeFormat';

interface PMDataPoint {
  timestamp: Date;
  pm1: number;
  pm25: number;
  pm10: number;
  locationContext?: string;
  activityContext?: string;
  automaticContext?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
}

interface EventData {
  id: string;
  timestamp: Date;
  event_type: string;
  comment?: string;
}

interface MissionContext {
  locationContext?: string;
  activityContext?: string;
}

interface PMLineGraphProps {
  data: PMDataPoint[];
  className?: string;
  events?: EventData[];
  hideTitle?: boolean;
  highlightContextType?: 'location' | 'activity' | 'autocontext';
  missionContext?: MissionContext;
}

export const PMLineGraph = ({ 
  data, 
  className = '', 
  events = [], 
  hideTitle = false, 
  highlightContextType,
  missionContext 
}: PMLineGraphProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (!data || data.length === 0) {
    return (
      <div className={`flex-center h-full min-h-[300px] text-muted-foreground ${className}`}>
        {t('realTime.noData')}
      </div>
    );
  }

  const chartData = data.map(point => {
    // Validate timestamp and create safe fallback
    const validTimestamp = point.timestamp && isValidTimestamp(point.timestamp) 
      ? point.timestamp 
      : new Date();
    
    return {
      timestamp: validTimestamp.getTime(),
      pm1: Math.round(point.pm1),
      pm25: Math.round(point.pm25),
      pm10: Math.round(point.pm10),
      time: formatTime(validTimestamp),
      // Include context data for potential highlighting
      locationContext: point.locationContext,
      activityContext: point.activityContext,
      automaticContext: point.automaticContext,
    };
  }).filter(point => point.timestamp && !isNaN(point.timestamp));

  const formatXAxisLabel = (timeString: string) => {
    // timeString is already formatted from chartData.time
    return isMobile ? timeString.slice(0, 5) : timeString; // Show HH:mm on mobile, HH:mm:ss on desktop
  };

  // Function to get line color based on context highlighting
  const getLineColor = (lineType: 'pm1' | 'pm25' | 'pm10') => {
    const defaultColors = {
      pm1: "hsl(var(--air-good))",
      pm25: "hsl(var(--air-moderate))",
      pm10: "hsl(var(--air-poor))"
    };
    
    return defaultColors[lineType];
  };

  // Calculate context segments for highlighting
  const contextSegments = React.useMemo(() => {
    if (!highlightContextType || !data.length) return [];

    const segments: Array<{
      context: string;
      startTime: number;
      endTime: number;
      avgPm25: number;
      color: string;
    }> = [];

    let currentContext = '';
    let segmentStart = 0;
    let segmentValues: number[] = [];

    // Define context colors with good contrast
    const contextColors = [
      'hsl(220 70% 50%)',  // Blue
      'hsl(160 60% 45%)',  // Teal  
      'hsl(30 80% 55%)',   // Orange
      'hsl(280 60% 50%)',  // Purple
      'hsl(10 80% 50%)',   // Red
    ];

    let colorIndex = 0;
    const contextColorMap = new Map<string, string>();

    data.forEach((point, index) => {
      let contextValue = '';
      
      switch (highlightContextType) {
        case 'location':
          contextValue = point.locationContext || missionContext?.locationContext || '';
          break;
        case 'activity':
          contextValue = point.activityContext || missionContext?.activityContext || '';
          break;
        case 'autocontext':
          contextValue = point.automaticContext || '';
          break;
      }

      if (contextValue && contextValue !== 'unknown') {
        if (contextValue !== currentContext) {
          // Finish previous segment
          if (currentContext && segmentValues.length > 0) {
            segments.push({
              context: currentContext,
              startTime: segmentStart,
              endTime: point.timestamp.getTime(),
              avgPm25: segmentValues.reduce((sum, val) => sum + val, 0) / segmentValues.length,
              color: contextColorMap.get(currentContext) || contextColors[0],
            });
          }

          // Start new segment
          currentContext = contextValue;
          segmentStart = point.timestamp.getTime();
          segmentValues = [point.pm25];

          // Assign color if not already assigned
          if (!contextColorMap.has(contextValue)) {
            contextColorMap.set(contextValue, contextColors[colorIndex % contextColors.length]);
            colorIndex++;
          }
        } else {
          segmentValues.push(point.pm25);
        }
      }
    });

    // Finish last segment
    if (currentContext && segmentValues.length > 0) {
      segments.push({
        context: currentContext,
        startTime: segmentStart,
        endTime: data[data.length - 1].timestamp.getTime(),
        avgPm25: segmentValues.reduce((sum, val) => sum + val, 0) / segmentValues.length,
        color: contextColorMap.get(currentContext) || contextColors[0],
      });
    }

    return segments;
  }, [data, highlightContextType, missionContext]);

  // Custom chart component with context overlays
  const CustomChart = ({ width, height }: { width: number; height: number }) => {
    const margin = {
      top: isMobile ? 10 : 20,
      right: isMobile ? 10 : 30,
      left: isMobile ? 10 : 20,
      bottom: isMobile ? 20 : 5,
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Find data range for scaling
    const timeExtent = [
      Math.min(...chartData.map(d => d.timestamp)),
      Math.max(...chartData.map(d => d.timestamp))
    ];

    return (
      <div className="relative w-full h-full">
        {/* Context overlays */}
        {contextSegments.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ 
            marginTop: margin.top, 
            marginLeft: margin.left, 
            marginRight: margin.right, 
            marginBottom: margin.bottom 
          }}>
            {contextSegments.map((segment, index) => {
              const startPercent = ((segment.startTime - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * 100;
              const endPercent = ((segment.endTime - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * 100;
              const widthPercent = endPercent - startPercent;

              return (
                <div
                  key={`${segment.context}-${index}`}
                  className="absolute top-0 h-full opacity-20"
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: segment.color,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Context labels */}
        {contextSegments.length > 0 && (
          <div className="absolute top-2 left-0 right-0 flex flex-wrap gap-1 justify-center pointer-events-none z-10">
            {contextSegments.map((segment, index) => (
              <div
                key={`label-${segment.context}-${index}`}
                className="text-xs px-2 py-1 rounded text-white font-medium shadow-sm"
                style={{ backgroundColor: segment.color }}
              >
                {segment.context}: {Math.round(segment.avgPm25)} µg/m³
              </div>
            ))}
          </div>
        )}

        {/* Recharts LineChart */}
        <LineChart
          width={width}
          height={height}
          data={chartData}
          margin={margin}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted-foreground))" 
            opacity={0.3} 
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={formatXAxisLabel}
            stroke="hsl(var(--muted-foreground))"
            interval={isMobile ? 'preserveStartEnd' : 0}
          />
          <YAxis
            tick={{ fontSize: isMobile ? 10 : 12 }}
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'µg/m³',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: isMobile ? 10 : 12 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: isMobile ? '12px' : '14px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
          />
          <Line
            type="monotone"
            dataKey="pm1"
            stroke={getLineColor('pm1')}
            strokeWidth={2}
            dot={{ r: isMobile ? 2 : 3 }}
            activeDot={{ r: isMobile ? 4 : 6 }}
            name="PM1.0 µg/m³"
          />
          <Line
            type="monotone"
            dataKey="pm25"
            stroke={getLineColor('pm25')}
            strokeWidth={2}
            dot={{ r: isMobile ? 2 : 3 }}
            activeDot={{ r: isMobile ? 4 : 6 }}
            name="PM2.5 µg/m³"
          />
          <Line
            type="monotone"
            dataKey="pm10"
            stroke={getLineColor('pm10')}
            strokeWidth={2}
            dot={{ r: isMobile ? 2 : 3 }}
            activeDot={{ r: isMobile ? 4 : 6 }}
            name="PM10 µg/m³"
          />
        </LineChart>
      </div>
    );
  };

  return (
    <div className={`w-full h-full min-h-[300px] flex flex-col ${className}`}>
      {!hideTitle && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{t('realTime.graph')}</h3>
        </div>
      )}
      
      {/* Context labels - give them proper space above chart */}
      {contextSegments.length > 0 && (
        <div className="mb-2 min-h-[32px] flex flex-wrap gap-1 justify-center">
          {contextSegments.map((segment, index) => (
            <div
              key={`label-${segment.context}-${index}`}
              className="text-xs px-2 py-1 rounded font-medium shadow-sm whitespace-nowrap text-white"
              style={{ backgroundColor: segment.color }}
            >
              {segment.context}: {Math.round(segment.avgPm25)} µg/m³
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 relative">
        {/* Context overlays positioned over the chart area */}
        {contextSegments.length > 0 && (
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ 
              marginTop: 20, 
              marginLeft: isMobile ? 15 : 25, 
              marginRight: 30, 
              marginBottom: 40 
            }}
          >
            {contextSegments.map((segment, index) => {
              const timeExtent = [
                Math.min(...chartData.map(d => d.timestamp)),
                Math.max(...chartData.map(d => d.timestamp))
              ];
              const startPercent = ((segment.startTime - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * 100;
              const endPercent = ((segment.endTime - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * 100;
              const widthPercent = Math.max(endPercent - startPercent, 1); // Ensure minimum width

              return (
                <div
                  key={`overlay-${segment.context}-${index}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${Math.max(startPercent, 0)}%`,
                    width: `${Math.min(widthPercent, 100 - Math.max(startPercent, 0))}%`,
                    backgroundColor: segment.color,
                    opacity: 0.15,
                  }}
                />
              );
            })}
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: isMobile ? 15 : 25,
              bottom: 40,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--muted-foreground))" 
              opacity={0.3} 
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickFormatter={formatXAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 10 : 12 }}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: 'µg/m³',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: isMobile ? 10 : 12 }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: isMobile ? '12px' : '14px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
            />
            <Line
              type="monotone"
              dataKey="pm1"
              stroke={getLineColor('pm1')}
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM1.0 µg/m³"
            />
            <Line
              type="monotone"
              dataKey="pm25"
              stroke={getLineColor('pm25')}
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM2.5 µg/m³"
            />
            <Line
              type="monotone"
              dataKey="pm10"
              stroke={getLineColor('pm10')}
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM10 µg/m³"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};