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
  highlightedContexts?: {
    location?: string;
    activity?: string;
    autoContext?: string;
  };
}

export function PMLineGraph({ data, events = [], className, highlightedContexts }: PMLineGraphProps) {
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

  // Generate highlighted areas based on context selection
  const highlightedAreas = React.useMemo(() => {
    if (!highlightedContexts || !chartData.length) return [];
    
    const areas: Array<{ start: number; end: number; type: string }> = [];
    let currentStart = -1;
    let currentType = '';
    
    chartData.forEach((entry, index) => {
      const { context } = entry;
      const isHighlighted = 
        (highlightedContexts.location && context?.locationContext === highlightedContexts.location) ||
        (highlightedContexts.activity && context?.activityContext === highlightedContexts.activity) ||
        (highlightedContexts.autoContext && context?.automaticContext === highlightedContexts.autoContext);
      
      const contextType = highlightedContexts.location ? 'location' :
                         highlightedContexts.activity ? 'activity' : 'autoContext';
      
      if (isHighlighted) {
        if (currentStart === -1) {
          currentStart = index + 1; // chartData uses 1-based indexing
          currentType = contextType;
        }
      } else {
        if (currentStart !== -1) {
          areas.push({
            start: currentStart,
            end: index, // End at previous index
            type: currentType
          });
          currentStart = -1;
        }
      }
    });
    
    // Handle case where highlight goes to the end
    if (currentStart !== -1) {
      areas.push({
        start: currentStart,
        end: chartData.length,
        type: currentType
      });
    }
    
    return areas;
  }, [chartData, highlightedContexts]);

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
          margin={{ top: 5, right: 5, left: 0, bottom: 120 }}
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
          {/* Context highlighted areas */}
          {highlightedAreas.map((area, index) => (
            <ReferenceArea
              key={`highlight-${index}`}
              x1={area.start}
              x2={area.end}
              fill={area.type === 'location' ? '#22c55e' : area.type === 'activity' ? '#ef4444' : '#3b82f6'}
              fillOpacity={0.1}
              stroke={area.type === 'location' ? '#22c55e' : area.type === 'activity' ? '#ef4444' : '#3b82f6'}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
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
