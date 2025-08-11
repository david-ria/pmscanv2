import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceArea, ReferenceLine } from 'recharts';
import { formatTime, getNumericTimestamp, ensureDate } from '@/utils/timestampUtils';
import { logDataProcessing, throttledLog } from '@/utils/debugLogger';
import { Card, CardContent } from '@/components/ui/card';

// Interfaces
interface EventData {
  id?: string;
  type?: string;
  comment?: string;
  timestamp: Date | string | number;
}

interface PMLineGraphProps {
  data: any[];
  events?: EventData[];
  height?: number;
  className?: string;
  highlightContextType?: 'location' | 'activity';
  hideTemperature?: boolean;
}

// Component
export const PMLineGraph: React.FC<PMLineGraphProps> = ({
  data,
  events,
  height = 400,
  className = '',
  highlightContextType,
  hideTemperature = false,
}) => {
  // Memoize chart data processing to avoid redundant calculations
  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    logDataProcessing('PMLineGraph', data.length, data[data.length - 1]?.pmData?.pm25);
    
    // Create a fresh copy and sort by timestamp to ensure chronological order
    const processedData = [...data]
      .sort((a, b) => {
        const aTime = getNumericTimestamp(a.pmData.timestamp);
        const bTime = getNumericTimestamp(b.pmData.timestamp);
        return aTime - bTime;
      })
      .map((entry) => {
        const timestamp = getNumericTimestamp(entry.pmData.timestamp);
        return {
          time: timestamp, // Use numeric timestamp for X-axis
          PM1: entry.pmData.pm1,
          PM25: entry.pmData.pm25,
          PM10: entry.pmData.pm10,
          timestamp: formatTime(timestamp),
          fullTimestamp: timestamp, // Keep numeric timestamp for calculations
          temperature: entry.weatherData?.temperature,
          humidity: entry.weatherData?.humidity,
          location: entry.location,
          context: entry.context,
          automaticContext: entry.automaticContext, // Include automatic context
        };
      });
    
    return processedData;
  }, [data, data?.length, data?.[data?.length - 1]?.pmData?.timestamp]); // Optimized dependencies

  // Process events to find their position on the chart
  const eventMarkers = React.useMemo(() => {
    if (!events || events.length === 0 || chartData.length === 0) {
      return [];
    }

    return events.map((event, index) => {
      if (events && events.length > 0) {
        // Ensure timestamp is a Date object
        const eventTimestamp = ensureDate(event.timestamp);
        const eventTime = eventTimestamp.getTime();

        // Find the closest data point
        let closestIndex = 0;
        let minDiff = Math.abs(chartData[0].fullTimestamp - eventTime);

        for (let i = 1; i < chartData.length; i++) {
          const entryTime = chartData[i].fullTimestamp;
          const diff = Math.abs(entryTime - eventTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }

        return {
          id: event.id || `event-${index}`,
          type: event.type || 'event',
          comment: event.comment || '',
          chartPosition: chartData[closestIndex].time, // Use actual timestamp
          timeString: formatTime(eventTimestamp),
        };
      }
      return null;
    }).filter(Boolean);
  }, [events, chartData]);

  // Function to get color based on context type and value
  const getContextColor = React.useCallback((contextType: string, value: string): string => {
    if (!contextType || !value) return '#94a3b8';
    
    const colorMap: Record<string, Record<string, string>> = {
      location: {
        home: '#3b82f6',
        office: '#8b5cf6',
        outdoor: '#10b981',
        transport: '#f59e0b',
        restaurant: '#ef4444',
        gym: '#06b6d4',
        shop: '#84cc16',
        default: '#6b7280'
      },
      activity: {
        resting: '#3b82f6',
        walking: '#10b981',
        running: '#ef4444',
        cycling: '#f59e0b',
        working: '#8b5cf6',
        cooking: '#ec4899',
        eating: '#84cc16',
        sleeping: '#1e293b',
        default: '#6b7280'
      }
    };
    
    return colorMap[contextType]?.[value] || colorMap[contextType]?.default || '#6b7280';
  }, []);

  // Generate context highlighting periods
  const contextPeriods = React.useMemo(() => {
    if (!highlightContextType || chartData.length === 0) {
      return [];
    }

    const periods: Array<{
      start: number;
      end: number;
      label: string;
      color: string;
      pm25Average: number;
    }> = [];
    
    let currentStart = 0;
    let currentLabel = '';
    let currentColor = '';
    
    chartData.forEach((entry, index) => {
      const position = entry.time;
      const context = entry.context;
      const missionContext = entry.automaticContext; // Use automatic context if available
      
      // Determine the context value to use based on the selected type
      let contextValue = '';
      let label = '';
      let currentEntryColor = '';
      
      if (highlightContextType === 'location') {
        contextValue = context?.location || missionContext?.location || '';
      } else if (highlightContextType === 'activity') {
        contextValue = context?.activity || missionContext?.activity || '';
      }
      
      if (contextValue) {
        label = contextValue;
        currentEntryColor = getContextColor(highlightContextType, contextValue);
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
          currentColor = currentEntryColor;
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
    
    throttledLog('context-periods', 'Generated context periods:', periods);
    return periods;
  }, [chartData, highlightContextType, getContextColor]);

  // Custom X-axis tick formatter
  const formatXAxisTick = (tickItem: any) => {
    const dataPoint = chartData.find(d => d.time === tickItem);
    return dataPoint ? dataPoint.timestamp : '';
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData.find(d => d.time === label);
      if (!dataPoint) return null;

      return (
        <div className="bg-popover p-3 border rounded-lg shadow-lg text-sm">
          <p className="font-medium mb-1">{dataPoint.timestamp}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-medium">{entry.value?.toFixed(1)}</span>
              {entry.name.includes('PM') ? ' μg/m³' : 
               entry.name === 'Temperature' ? '°C' : 
               entry.name === 'Humidity' ? '%' : ''}
            </p>
          ))}
          {dataPoint.context && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Context:</p>
              {dataPoint.context.location && (
                <p className="text-xs">📍 {dataPoint.context.location}</p>
              )}
              {dataPoint.context.activity && (
                <p className="text-xs">🏃 {dataPoint.context.activity}</p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Aucune donnée disponible</p>
              <p className="text-sm">Les données du graphique apparaîtront ici lors de l'enregistrement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Évolution des particules fines</h3>
          <div className="text-sm text-muted-foreground">
            {chartData[chartData.length - 1]?.timestamp}
          </div>
        </div>
        
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {/* Context highlighting areas */}
              {contextPeriods.map((period, index) => (
                <ReferenceArea
                  key={`context-${index}`}
                  x1={period.start}
                  x2={period.end}
                  fill={period.color}
                  fillOpacity={0.1}
                  stroke={period.color}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                />
              ))}
              
              {/* Event markers */}
              {eventMarkers.map((marker) => (
                <ReferenceLine
                  key={marker.id}
                  x={marker.chartPosition}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: marker.type,
                    position: 'top',
                    style: { fontSize: '10px', fill: '#ef4444' }
                  }}
                />
              ))}
              
              <XAxis 
                dataKey="time"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                yAxisId="pm"
                orientation="left"
                tick={{ fontSize: 10 }}
                label={{ value: 'μg/m³', angle: -90, position: 'insideLeft' }}
              />
              {!hideTemperature && (
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{ value: '°C', angle: 90, position: 'insideRight' }}
                />
              )}
              
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                yAxisId="pm"
                type="monotone"
                dataKey="PM1"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                name="PM1"
                connectNulls={true}
              />
              <Line
                yAxisId="pm"
                type="monotone"
                dataKey="PM25"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={false}
                name="PM2.5"
                connectNulls={true}
              />
              <Line
                yAxisId="pm"
                type="monotone"
                dataKey="PM10"
                stroke="#ffc658"
                strokeWidth={2}
                dot={false}
                name="PM10"
                connectNulls={true}
              />
              
              {!hideTemperature && chartData.some(d => d.temperature !== undefined) && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ff7300"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Temperature"
                  connectNulls={true}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Context periods legend */}
        {contextPeriods.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Périodes {highlightContextType === 'location' ? 'de lieu' : "d'activité"}:
            </p>
            <div className="flex flex-wrap gap-2">
              {contextPeriods.map((period, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: `${period.color}15`,
                    borderLeft: `3px solid ${period.color}`
                  }}
                >
                  <span className="font-medium">{period.label}</span>
                  <span className="text-muted-foreground">
                    (PM2.5: {period.pm25Average.toFixed(1)} μg/m³)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};