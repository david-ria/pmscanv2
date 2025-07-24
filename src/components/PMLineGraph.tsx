import React from 'react';
import { formatTime } from '@/utils/timeFormat';
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
import { PMScanData } from '@/lib/pmscan/types';

interface EventData {
  id: string;
  timestamp: Date;
  event_type: string;
  comment?: string;
}

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
  highlightContextType?: 'location' | 'activity' | 'autocontext';
  missionContext?: {
    locationContext?: string;
    activityContext?: string;
  };
}

export function PMLineGraph({ data, events = [], className, highlightContextType, missionContext }: PMLineGraphProps) {
  // Transform data for the chart - ensure proper chronological ordering
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
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
        context: entry.context,
      }));
  }, [data]); // Re-compute when data changes for real-time updates

  // Process events to find their position on the chart
  const eventMarkers = React.useMemo(() => {
    if (!events.length || !chartData.length) return [];
    
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

  // Color mapping for different activities and locations
  const getContextColor = React.useCallback((contextType: string, contextValue: string): string => {
    if (contextType === 'activity') {
      const activityColors: Record<string, string> = {
        'indoor': '#8b5cf6', // purple
        'outdoor': '#22c55e', // green
        'transport': '#ef4444', // red
        'walking': '#3b82f6', // blue
        'cycling': '#f59e0b', // amber
        'driving': '#dc2626', // red-600
        'train': '#7c3aed', // violet
        'bus': '#ea580c', // orange
        'metro': '#9333ea', // purple-600
        'undergroundTransport': '#6366f1', // indigo
        'sport': '#059669', // emerald
        'rest': '#64748b', // slate
        'work': '#0891b2', // cyan
        'meeting': '#e11d48', // rose
        'shopping': '#db2777', // pink
        'cooking': '#84cc16', // lime
        'cleaning': '#06b6d4', // cyan-500
        'studying': '#8b5cf6', // purple-500
        'jogging': '#10b981', // emerald-500
      };
      return activityColors[contextValue.toLowerCase()] || '#6b7280'; // gray fallback
    } else if (contextType === 'location') {
      const locationColors: Record<string, string> = {
        'home': '#22c55e', // green
        'office': '#3b82f6', // blue
        'school': '#f59e0b', // amber
        'indoor': '#8b5cf6', // purple
        'outdoor': '#10b981', // emerald
        'transport': '#ef4444', // red
        'underground': '#6366f1', // indigo
        'park': '#84cc16', // lime
        'mainstreet': '#64748b', // slate
      };
      return locationColors[contextValue.toLowerCase()] || '#6b7280'; // gray fallback
    }
    return '#3b82f6'; // blue fallback for autocontext
  }, []);

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

  const formatTooltip = (value: any, name: string) => {
    if (name === 'PM1' || name === 'PM25' || name === 'PM10') {
      return [`${value} µg/m³`, name];
    }
    if (name === 'temp') {
      return [`${value}°C`, 'Température'];
    }
    if (name === 'humidity') {
      return [`${value}%`, 'Humidité'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (tickItem: any, index: number) => {
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
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Évolution des particules fines (µg/m³)
        </h3>
        <p className="text-sm text-muted-foreground">
          {chartData.length} points de données • Dernière mesure:{' '}
          {chartData[chartData.length - 1]?.timestamp}
        </p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 100, right: 5, left: 0, bottom: 120 }}
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
            tick={{ fontSize: 12 }}
            width={30}
          />
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
          <Legend />
          <Line
            type="monotone"
            dataKey="PM1"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: '#22c55e', strokeWidth: 1, r: 3 }}
            activeDot={{ r: 5, stroke: '#22c55e' }}
          />
          <Line
            type="monotone"
            dataKey="PM25"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: '#ef4444', strokeWidth: 1, r: 3 }}
            activeDot={{ r: 5, stroke: '#ef4444' }}
          />
          <Line
            type="monotone"
            dataKey="PM10"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
            activeDot={{ r: 5, stroke: '#3b82f6' }}
          />
          {/* Context highlighted areas with labels */}
          {contextPeriods.map((period, index) => {
            const periodWidth = period.end - period.start;
            const centerX = period.start + periodWidth / 2;
            const isShortPeriod = periodWidth < 20; // Consider periods less than 20 data points as short
            
            // Calculate staggered positioning for overlapping labels
            const verticalOffset = index % 2 === 0 ? 5 : 45;
            const labelOffset = index % 2 === 0 ? 25 : 65;
            
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
                  label={{
                    value: `${period.pm25Average.toFixed(1)} µg/m³`,
                    position: 'top',
                    fontSize: 10,
                    fill: '#ef4444',
                    textAnchor: 'middle',
                    fontWeight: 'bold',
                    offset: verticalOffset,
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
                  label={{
                    value: period.label,
                    position: 'top',
                    fontSize: 12,
                    fill: period.color,
                    textAnchor: 'middle',
                    fontWeight: 'bold',
                    offset: labelOffset,
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
          {eventMarkers.map((event: any, eventIndex: number) => {
            const eventType = event.event_type || event._type || 'Event';
            const displayLabel = eventType === 'undefined' ? 'Event' : eventType;
            
            return (
              <React.Fragment key={event.id}>
                {/* Event line */}
                <ReferenceLine
                  x={event.chartPosition}
                  stroke="#f97316"
                  strokeWidth={3}
                  strokeDasharray="3 3"
                />
                {/* Event label positioned above the line */}
                <ReferenceLine
                  x={event.chartPosition}
                  stroke="transparent"
                  strokeWidth={0}
                  label={{
                    value: displayLabel,
                    position: 'top',
                    fontSize: 12,
                    fill: '#f97316',
                    textAnchor: 'start',
                    fontWeight: 'bold',
                    offset: 100 + (eventIndex * 20),
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
