import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

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

  const chartData = data.map(point => ({
    timestamp: point.timestamp.getTime(),
    pm1: Math.round(point.pm1),
    pm25: Math.round(point.pm25),
    pm10: Math.round(point.pm10),
    time: format(point.timestamp, 'HH:mm:ss'),
    // Include context data for potential highlighting
    locationContext: point.locationContext,
    activityContext: point.activityContext,
    automaticContext: point.automaticContext,
  }));

  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, isMobile ? 'HH:mm' : 'HH:mm:ss');
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

  return (
    <div className={`w-full h-full min-h-[300px] flex flex-col ${className}`}>
      {!hideTitle && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{t('realTime.graph')}</h3>
        </div>
      )}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: isMobile ? 10 : 20,
              right: isMobile ? 10 : 30,
              left: isMobile ? 10 : 20,
              bottom: isMobile ? 20 : 5,
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