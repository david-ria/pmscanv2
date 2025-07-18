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
} from 'recharts';
import { PMScanData } from '@/lib/pmscan/types';

interface PMLineGraphProps {
  data: Array<{
    pmData: PMScanData;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  }>;
  className?: string;
}

export function PMLineGraph({ data, className }: PMLineGraphProps) {
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
