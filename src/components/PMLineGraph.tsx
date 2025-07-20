import React from 'react';
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
        time: index + 1, // Sequential index for X-axis (left to right)
        timestamp: entry.pmData.timestamp.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
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
          console.log('Event matched to chart:', event.event_type, 'at position', closestIndex + 1);
          return {
            ...event,
            chartPosition: closestIndex + 1, // chartData uses 1-based indexing for time
            timeString: eventTimestamp.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
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
    
    let currentStart = 1;
    let currentLabel = '';
    let currentColor = '';
    
    chartData.forEach((entry, index) => {
      const { context } = entry;
      const position = index + 1;
      
      // Debug logging
      if (index === 0) {
        console.log('PMLineGraph context debug:', {
          highlightContextType,
          measurementContext: context,
          missionContext,
          sampleEntry: entry
        });
      }
      
      // Get context value from measurement level first, then fall back to mission level
      const contextValue = 
        highlightContextType === 'location' ? (context?.locationContext || missionContext?.locationContext) :
        highlightContextType === 'activity' ? (context?.activityContext || missionContext?.activityContext) :
        highlightContextType === 'autocontext' ? context?.automaticContext :
        undefined;
      
      // Only create periods for actual context values, not transitions
      if (!contextValue || contextValue === 'unknown') {
        // This is a transition - close current period if exists
        if (currentLabel !== '') {
          const periodData = chartData.slice(currentStart - 1, index);
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
          currentLabel = '';
          currentColor = '';
        }
        return; // Skip transition periods
      }
      
      // Determine label and color for actual context values
      let label = contextValue;
      let color = getContextColor(highlightContextType, contextValue);
      
      // Debug logging for context values
      if (index < 3) {
        console.log(`Entry ${index} context:`, {
          contextValue,
          measurementLevel: context,
          missionLevel: missionContext
        });
      }
      
      // Check if we need to close current period and start a new one
      if (currentLabel !== label) {
        // Close previous period if it exists
        if (currentLabel !== '') {
          const periodData = chartData.slice(currentStart - 1, index);
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
        
        // Start new period
        currentStart = position;
        currentLabel = label;
        currentColor = color;
      }
    });
    
    // Handle the final period
    if (currentLabel !== '') {
      const periodData = chartData.slice(currentStart - 1);
      const pm25Average = periodData.length > 0 
        ? periodData.reduce((sum, entry) => sum + entry.PM25, 0) / periodData.length 
        : 0;
      
      periods.push({
        start: currentStart,
        end: chartData.length + 1,
        label: currentLabel,
        color: currentColor,
        pm25Average
      });
    }
    
    console.log('Generated context periods:', periods);
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
          margin={{ top: 40, right: 5, left: 0, bottom: 120 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={(value, index) => {
              // Show fewer ticks for larger datasets to avoid crowding
              const interval = Math.max(1, Math.floor(chartData.length / 10));
              return index % interval === 0 ? chartData[index]?.timestamp || '' : '';
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            width={30}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => {
              const dataPoint = chartData[label - 1];
              return dataPoint ? `Temps: ${dataPoint.timestamp}` : '';
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
          {contextPeriods.map((period, index) => (
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
              <ReferenceLine
                x={period.start + (period.end - period.start) / 2}
                stroke="transparent"
                strokeWidth={0}
                label={{
                  value: `${period.pm25Average.toFixed(1)} µg/m³`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#ef4444',
                  textAnchor: 'middle',
                  fontWeight: 'bold',
                  offset: 5,
                  style: {
                    textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                    fontWeight: 'bold'
                  }
                }}
              />
              <ReferenceLine
                x={period.start + (period.end - period.start) / 2}
                stroke="transparent"
                strokeWidth={0}
                label={{
                  value: period.label,
                  position: 'top',
                  fontSize: 12,
                  fill: period.color,
                  textAnchor: 'middle',
                  fontWeight: 'bold',
                  offset: 25,
                  style: {
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                    fontWeight: 'bold'
                  }
                }}
              />
            </React.Fragment>
          ))}
          
          {/* Event markers */}
          {eventMarkers.map((event: any) => (
            <ReferenceLine
              key={event.id}
              x={event.chartPosition}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: event.event_type,
                position: 'top',
                fontSize: 10,
                fill: '#f97316',
                textAnchor: 'middle',
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
