import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

type PMType = 'pm1' | 'pm25' | 'pm10';

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

interface PollutionPieChartProps {
  breakdownData: BreakdownData[];
  pmType: PMType;
}

export const PollutionPieChart = ({
  breakdownData,
  pmType,
}: PollutionPieChartProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (breakdownData.length === 0) {
    return (
      <div className="flex-center h-full min-h-[300px] text-muted-foreground">
        {t('analysis.noDataForPeriod')}
      </div>
    );
  }

  // Custom label function optimized for space usage
  const renderCustomLabel = (entry: any) => {
    // More aggressive label filtering for better space usage
    if (isMobile && entry.percentage < 8) {
      return null;
    }
    if (!isMobile && entry.percentage < 5) {
      return null;
    }
    
    return `${entry.percentage.toFixed(0)}%`;
  };

  // Optimized sizing for maximum space utilization
  const getOptimizedRadius = () => {
    if (isMobile) {
      return { outer: "85%", inner: "25%" };
    }
    return { outer: "90%", inner: "0%" };
  };

  const radius = getOptimizedRadius();

  return (
    <div className="w-full h-full min-h-[300px] max-h-[500px] flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={breakdownData}
              cx="50%"
              cy="50%"
              outerRadius={radius.outer}
              innerRadius={radius.inner}
              fill="#8884d8"
              dataKey="percentage"
              label={renderCustomLabel}
              labelLine={false}
              strokeWidth={1}
            >
              {breakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toFixed(1)}%`,
                `PM${pmType.replace('pm', '')}: ${Math.round(props.payload.avgPM)} μg/m³`,
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: isMobile ? '12px' : '14px',
                padding: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ 
                fontSize: isMobile ? '11px' : '12px',
                paddingTop: '8px',
                lineHeight: '1.2'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};