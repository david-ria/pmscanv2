
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

interface PMDataPoint {
  timestamp: Date;
  pm1: number;
  pm25: number;
  pm10: number;
}

interface PMLineGraphProps {
  data: PMDataPoint[];
  className?: string;
}

export const PMLineGraph = ({ data, className = '' }: PMLineGraphProps) => {
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
    time: format(point.timestamp, 'HH:mm:ss')
  }));

  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, isMobile ? 'HH:mm' : 'HH:mm:ss');
  };

  return (
    <div className={`w-full h-full min-h-[300px] flex flex-col ${className}`}>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: isMobile ? 10 : 20,
              left: isMobile ? 10 : 20,
              bottom: 30
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              height={30}
            />
            <YAxis
              label={{ 
                value: 'μg/m³', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: isMobile ? 10 : 12 }
              }}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 40 : 50}
            />
            <Tooltip
              labelFormatter={(value) => formatXAxisLabel(value as number)}
              formatter={(value: number, name: string) => [
                `${value} μg/m³`,
                name.toUpperCase()
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: isMobile ? '11px' : '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            />
            <Line
              type="monotone"
              dataKey="pm1"
              stroke="hsl(var(--air-good))"
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM1"
            />
            <Line
              type="monotone"
              dataKey="pm25"
              stroke="hsl(var(--air-moderate))"
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM2.5"
            />
            <Line
              type="monotone"
              dataKey="pm10"
              stroke="hsl(var(--air-poor))"
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              name="PM10"
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ 
                fontSize: isMobile ? '11px' : '12px',
                paddingTop: '8px'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
