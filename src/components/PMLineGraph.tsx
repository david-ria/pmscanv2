import React, { useMemo } from 'react';
import { formatTime } from '@/utils/timeFormat';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { SensorReadingData as PMScanData } from '@/types/sensor';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { rateLimitedDebug } from '@/utils/logger';

// Helper to get CSS variable value as HSL color string
const getCSSColor = (varName: string): string => {
  if (typeof window === 'undefined') return '#888888';
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `hsl(${value})` : '#888888';
};

// Chart color tokens that read from CSS variables
const useChartColors = () => {
  return useMemo(() => ({
    pm1: getCSSColor('--chart-pm1'),
    pm25: getCSSColor('--chart-pm25'),
    pm10: getCSSColor('--chart-pm10'),
    event: getCSSColor('--chart-event'),
    // Context colors
    indoor: getCSSColor('--context-indoor'),
    outdoor: getCSSColor('--context-outdoor'),
    transport: getCSSColor('--context-transport'),
    walking: getCSSColor('--context-walking'),
    cycling: getCSSColor('--context-cycling'),
    sport: getCSSColor('--context-sport'),
    rest: getCSSColor('--context-rest'),
    work: getCSSColor('--context-work'),
    default: getCSSColor('--context-default'),
  }), []);
};

interface EventData {
  id: string;
  timestamp: Date;
  event_type: string;
  comment?: string;
}

type PollutantType = 'pm1' | 'pm25' | 'pm10' | 'tvoc';

interface PMLineGraphProps {
  data: Array<{
    pmData: PMScanData;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    context?: {
      locationContext?: string;
      activityContext?: string;
      automaticContext?: string;
    };
  }>;
  events?: EventData[];
  className?: string;
  hideTitle?: boolean;
  highlightContextType?: 'location' | 'activity' | 'autocontext';
  missionContext?: {
    locationContext?: string;
    activityContext?: string;
  };
  variant?: 'realtime' | 'history';
  visiblePollutants?: PollutantType[];
}

export function PMLineGraph({ 
  data, 
  events = [], 
  className, 
  hideTitle = false, 
  highlightContextType, 
  missionContext, 
  variant = 'realtime',
  visiblePollutants = ['pm1', 'pm25', 'pm10']
}: PMLineGraphProps) {
  const { t } = useTranslation();
  const { getCurrentThresholds, isGroupMode, activeGroup } = useGroupSettings();
  const chartColors = useChartColors();

  // Transform data for the chart - ensure proper chronological ordering
  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    return data
      // Sort by timestamp to ensure chronological order (oldest to newest)
      .sort((a, b) => a.pmData.timestamp.getTime() - b.pmData.timestamp.getTime())
      // Show all data points for full recording view
      .map((entry, index) => ({
        time: entry.pmData.timestamp.getTime(), // Use actual timestamp for X-axis
        sequentialIndex: index + 1, // Keep sequential index for fallback
        timestamp: formatTime(entry.pmData.timestamp),
        fullTimestamp: entry.pmData.timestamp, // Keep full timestamp for calculations
        PM1: entry.pmData.pm1,
        PM25: entry.pmData.pm25,
        PM10: entry.pmData.pm10,
        temp: entry.pmData.temp,
        humidity: entry.pmData.humidity,
        pressure: entry.pmData.pressure, // Atmospheric pressure in hPa
        tvoc: entry.pmData.tvoc, // TVOC in ppb
        context: entry.context,
      }));
  }, [data]); // Re-compute when data changes for real-time updates

  // Process events to find their position on the chart
  const eventMarkers = React.useMemo(() => {
    if (!Array.isArray(events) || !events.length || !Array.isArray(chartData) || !chartData.length) return [];
    
    console.log('Processing events for chart:', events.length, 'events, ', chartData.length, 'data points');
    
    return events
      .map((event) => {
        // Ensure timestamp is a Date object
        const eventTimestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
        const eventTime = eventTimestamp.getTime();
        let closestIndex = -1;
        let minTimeDiff = Infinity;
        
        // Find closest data point in the chartData
        chartData.forEach((entry, index) => {
          const entryTime = entry.fullTimestamp.getTime();
          const timeDiff = Math.abs(entryTime - eventTime);
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestIndex = index;
          }
        });
        
        // Allow events within 60 seconds of data points
        if (closestIndex >= 0 && minTimeDiff < 60000) {
          console.log('Event matched to chart:', event.event_type, 'at position', chartData[closestIndex].time);
          return {
            ...event,
            chartPosition: chartData[closestIndex].time, // Use actual timestamp
            timeString: formatTime(eventTimestamp),
          };
        }
        console.log('Event not matched:', event.event_type, 'time diff:', minTimeDiff);
        return null;
      })
      .filter(Boolean);
  }, [events, chartData]);

  // Color mapping for different activities and locations using design system colors
  const getContextColor = React.useCallback((contextType: string, contextValue: string): string => {
    const colorMap: Record<string, string> = {
      'indoor': chartColors.indoor,
      'outdoor': chartColors.outdoor,
      'transport': chartColors.transport,
      'walking': chartColors.walking,
      'cycling': chartColors.cycling,
      'driving': chartColors.transport,
      'train': chartColors.indoor,
      'bus': chartColors.transport,
      'metro': chartColors.indoor,
      'undergroundTransport': chartColors.indoor,
      'sport': chartColors.sport,
      'rest': chartColors.rest,
      'work': chartColors.work,
      'meeting': chartColors.transport,
      'shopping': chartColors.indoor,
      'cooking': chartColors.outdoor,
      'cleaning': chartColors.work,
      'studying': chartColors.indoor,
      'jogging': chartColors.sport,
      'home': chartColors.outdoor,
      'office': chartColors.walking,
      'school': chartColors.cycling,
      'park': chartColors.outdoor,
      'mainstreet': chartColors.rest,
      'underground': chartColors.indoor,
    };
    return colorMap[contextValue.toLowerCase()] || chartColors.default;
  }, [chartColors]);

    // Generate highlighted areas and labels based on context type selection
    const contextPeriods = React.useMemo(() => {
      if (!highlightContextType || !chartData.length) return [];
      
      const periods: Array<{ 
        start: number; 
        end: number; 
        label: string; 
        color: string;
        pm25Average: number;
      }> = [];
      
      let currentStart = chartData[0].time;
    let currentLabel = '';
    let currentColor = '';
    
    chartData.forEach((entry, index) => {
      const { context } = entry;
      const position = entry.time;
      
      // Get context value - prioritize measurement level, fallback to mission level
      const contextValue = 
        highlightContextType === 'location' ? (context?.locationContext || missionContext?.locationContext) :
        highlightContextType === 'activity' ? (context?.activityContext || missionContext?.activityContext) :
        highlightContextType === 'autocontext' ? context?.automaticContext :
        undefined;
      
      // Handle context changes or missing values
      let label = '';
      let color = '';
      
      if (contextValue && contextValue !== 'unknown') {
        label = contextValue;
        color = getContextColor(highlightContextType, contextValue);
      }
      
      // Debug context processing
      if (index < 3) {
        console.log(`Processing entry ${index}:`, {
          measurementContext: context,
          missionContext,
          selectedContextType: highlightContextType,
          resolvedValue: contextValue,
          finalLabel: label
        });
      }
      
      // Check if we need to close current period and start a new one
      if (currentLabel !== label) {
        // Close previous period if it exists and has valid data
        if (currentLabel !== '' && currentStart < position) {
          const periodStartIndex = chartData.findIndex(entry => entry.time >= currentStart);
          const periodData = chartData.slice(periodStartIndex, index);
          const pm25Average = periodData.length > 0 
            ? periodData.reduce((sum, entry) => sum + entry.PM25, 0) / periodData.length 
            : 0;
          
          periods.push({
            start: currentStart,
            end: position,
            label: currentLabel,
            color: currentColor,
            pm25Average
          });
        }
        
        // Start new period only if we have a valid label
        if (label !== '') {
          currentStart = position;
          currentLabel = label;
          currentColor = color;
        } else {
          // Reset tracking for unknown periods
          currentLabel = '';
          currentColor = '';
        }
      }
    });
    
    // Handle the final period
    if (currentLabel !== '' && chartData.length > 0) {
      const lastTimestamp = chartData[chartData.length - 1].time;
      const periodStartIndex = chartData.findIndex(entry => entry.time >= currentStart);
      const periodData = chartData.slice(periodStartIndex);
      const pm25Average = periodData.length > 0 
        ? periodData.reduce((sum, entry) => sum + entry.PM25, 0) / periodData.length 
        : 0;
      
      periods.push({
        start: currentStart,
        end: lastTimestamp + (lastTimestamp - chartData[Math.max(0, chartData.length - 2)].time), // Estimate end
        label: currentLabel,
        color: currentColor,
        pm25Average
      });
    }
    
    console.log('Generated context periods:', periods);
    console.log('Periods details:', periods.map(p => ({
      label: p.label,
      start: p.start,
      end: p.end,
      duration: p.end - p.start,
      dataPoints: p.end - p.start,
      pm25Average: p.pm25Average.toFixed(1)
    })));
    return periods;
  }, [chartData, highlightContextType, missionContext, getContextColor]);

  const formatTooltip = (value: number | string, name: string) => {
    if (name === 'PM1' || name === 'PM25' || name === 'PM10') {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      return [`${numValue.toFixed(1)} µg/m³`, name];
    }
    if (name === 'temp') {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      return [`${numValue.toFixed(1)}°C`, 'Température'];
    }
    if (name === 'humidity') {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      return [`${numValue.toFixed(1)}%`, 'Humidité'];
    }
    if (name === 'pressure') {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      return [`${numValue.toFixed(0)} hPa`, 'Pression'];
    }
    if (name === 'tvoc') {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      return [`${numValue.toFixed(0)} ppb`, 'TVOC'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (tickItem: unknown, index: number) => {
    const dataPoint = chartData[index];
    return dataPoint ? dataPoint.timestamp : '';
  };

  if (chartData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full bg-card border border-border rounded-lg ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-medium">Aucune donnée disponible</p>
          <p className="text-sm mt-2">
            Démarrez un enregistrement pour voir le graphique en temps réel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      {!hideTitle && (
        <div className="mb-2 text-xs text-muted-foreground space-y-0.5">
          <div>{chartData.length} {t('graph.dataPoints')}</div>
          <div>{t('graph.lastMeasurement')}: {chartData[chartData.length - 1]?.timestamp}</div>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <LineChart
          data={chartData}
          margin={variant === 'history' 
            ? { top: 40, right: 30, left: 10, bottom: 20 }
            : { top: 5, right: 30, left: 0, bottom: 60 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={(value) => {
              return formatTime(new Date(value));
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            width={30}
            domain={[0, 'dataMax + 5']}
            allowDataOverflow={false}
          />
          {visiblePollutants.includes('tvoc') && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              width={40}
              domain={[0, 'dataMax + 50']}
              allowDataOverflow={false}
              label={{ value: 'ppb', angle: 90, position: 'insideRight', fontSize: 10 }}
            />
          )}
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => {
              return `Temps: ${formatTime(new Date(label))}`;
            }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend 
            verticalAlign={variant === 'history' ? "bottom" : "top"}
            align={variant === 'history' ? "center" : "right"}
            wrapperStyle={variant === 'history' 
              ? { paddingBottom: '10px' }
              : { paddingTop: '0px', paddingRight: '20px' }
            }
            height={variant === 'history' ? 36 : undefined}
          />
          {visiblePollutants.includes('pm1') && (
            <Line
              type="monotone"
              dataKey="PM1"
              stroke={chartColors.pm1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: chartColors.pm1 }}
              yAxisId="left"
            />
          )}
          {visiblePollutants.includes('pm25') && (
            <Line
              type="monotone"
              dataKey="PM25"
              stroke={chartColors.pm25}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: chartColors.pm25 }}
              yAxisId="left"
            />
          )}
          {visiblePollutants.includes('pm10') && (
            <Line
              type="monotone"
              dataKey="PM10"
              stroke={chartColors.pm10}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: chartColors.pm10 }}
              yAxisId="left"
            />
          )}
          {visiblePollutants.includes('tvoc') && (
            <Line
              type="monotone"
              dataKey="tvoc"
              stroke={getCSSColor('--chart-tvoc')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: getCSSColor('--chart-tvoc') }}
              yAxisId="right"
            />
          )}
          {/* Context highlighted areas with labels */}
          {contextPeriods.map((period, index) => {
            const periodWidth = period.end - period.start;
            const centerX = period.start + periodWidth / 2;
            const isShortPeriod = periodWidth < 20; // Consider periods less than 20 data points as short
            
            // Use fixed offsets so labels align horizontally across periods
            const PM_AVG_OFFSET = variant === 'history' ? 8 : 12; // PM2.5 average label offset from top
            const CONTEXT_LABEL_OFFSET = variant === 'history' ? 22 : 28; // Context label offset from top
            
            return (
              <React.Fragment key={`period-${index}`}>
                <ReferenceArea
                  x1={period.start}
                  x2={period.end}
                  fill={period.color}
                  fillOpacity={0.15}
                  stroke={period.color}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
                {/* PM25 average label */}
                <ReferenceLine
                  x={centerX}
                  stroke="transparent"
                  strokeWidth={0}
                  yAxisId="left"
                  label={{
                    value: `${period.pm25Average.toFixed(1)} µg/m³`,
                    position: 'top',
                    fontSize: 12,
                    fill: chartColors.pm25,
                    textAnchor: 'middle',
                    fontWeight: 'bold',
                    offset: PM_AVG_OFFSET,
                    style: {
                      textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                      fontWeight: 'bold'
                    }
                  }}
                />
                {/* Context label */}
                <ReferenceLine
                  x={centerX}
                  stroke="transparent"
                  strokeWidth={0}
                  yAxisId="left"
                  label={{
                    value: period.label,
                    position: 'top',
                    fontSize: 14,
                    fill: period.color,
                    textAnchor: 'middle',
                    fontWeight: 'bold',
                    offset: CONTEXT_LABEL_OFFSET,
                    style: {
                      textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </React.Fragment>
            );
          })}
          
          {/* Event markers */}
          {eventMarkers.map((event: { id: string; event_type?: string; _type?: string; chartPosition: number }, eventIndex: number) => {
            const eventType = event.event_type || event._type || 'Event';
            const displayLabel = eventType === 'undefined' ? 'Event' : eventType;
            
            return (
              <React.Fragment key={event.id}>
                {/* Event line */}
                <ReferenceLine
                  x={event.chartPosition}
                  stroke={chartColors.event}
                  strokeWidth={3}
                  strokeDasharray="3 3"
                  yAxisId="left"
                />
                {/* Event label positioned above the line */}
                <ReferenceLine
                  x={event.chartPosition}
                  stroke="transparent"
                  strokeWidth={0}
                  yAxisId="left"
                  label={{
                    value: displayLabel,
                    position: 'top',
                    fontSize: 12,
                    fill: chartColors.event,
                    textAnchor: 'start',
                    fontWeight: 'bold',
                    offset: 15 + (eventIndex * 20),
                    style: {
                      textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                      fontWeight: 'bold',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center'
                    }
                  }}
                />
              </React.Fragment>
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}