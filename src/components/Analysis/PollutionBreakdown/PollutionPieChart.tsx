
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';

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

  if (breakdownData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('analysis.noDataForPeriod')}
      </div>
    );
  }

  // Custom label function for better mobile display
  const renderCustomLabel = (entry: any) => {
    // Hide labels on very small screens to avoid clutter
    if (window.innerWidth < 400) {
      return null;
    }
    
    if (entry.percentage < 5) {
      return null; // Don't show labels for very small slices
    }
    
    return `${entry.percentage.toFixed(0)}%`;
  };

  // Responsive configuration based on screen size
  const isSmallScreen = window.innerWidth < 640;
  const isMobileScreen = window.innerWidth < 400;

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={breakdownData}
            cx="50%"
            cy="50%"
            outerRadius={isSmallScreen ? "60%" : "70%"}
            innerRadius={isMobileScreen ? "20%" : "0%"}
            fill="#8884d8"
            dataKey="percentage"
            label={renderCustomLabel}
            labelLine={false}
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
              fontSize: isSmallScreen ? '12px' : '14px',
              padding: '8px',
            }}
          />
          {!isMobileScreen && (
            <Legend 
              wrapperStyle={{ 
                fontSize: isSmallScreen ? '11px' : '12px',
                paddingTop: '10px'
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
