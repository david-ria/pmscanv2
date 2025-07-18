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
  }>;
  events?: EventData[];
  className?: string;
}

export function PMLineGraph({ data, events = [], className }: PMLineGraphProps) {
  // Transform data for the chart
  const chartData = data
    .map((entry, index) => ({
      time: index + 1, // Simple index for now
      timestamp: entry.pmData.timestamp.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      PM1: entry.pmData.pm1,
      PM25: entry.pmData.pm25,
      PM10: entry.pmData.pm10,
      temp: entry.pmData.temp,
      humidity: entry.pmData.humidity,
    }))
    .slice(-50); // Show last 50 data points

  // Process events to find their position on the chart
  const eventMarkers = events
    .map((event) => {
      // Find the data point closest to the event time
      // Ensure timestamp is a Date object
      const eventTimestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
      const eventTime = eventTimestamp.getTime();
      let closestIndex = -1;
      let minTimeDiff = Infinity;
      
      data.forEach((entry, index) => {
        const entryTime = entry.pmData.timestamp.getTime();
        const timeDiff = Math.abs(entryTime - eventTime);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestIndex = index;
        }
      });
      
      // Only include events that are within the displayed range
      const displayedStartIndex = Math.max(0, data.length - 50);
      if (closestIndex >= displayedStartIndex && closestIndex < data.length) {
        const chartIndex = closestIndex - displayedStartIndex + 1;
        return {
          ...event,
          chartPosition: chartIndex,
          timeString: eventTimestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
      }
      return null;
    })
    .filter(Boolean);

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
              // Show every 5th tick to avoid crowding
              return index % 5 === 0 ? chartData[index]?.timestamp || '' : '';
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
