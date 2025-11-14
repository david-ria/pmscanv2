
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

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: BreakdownData; value: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-md p-2 text-sm shadow-md">
          <p className="text-foreground font-medium">{data.name}</p>
          <p className="text-foreground">
            {payload[0].value.toFixed(1)}%
          </p>
          <p className="text-foreground">
            PM{pmType.replace('pm', '')}: {Math.round(data.avgPM)} μg/m³
          </p>
        </div>
      );
    }
    return null;
  };

  if (breakdownData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('analysis.noDataForPeriod')}
      </div>
    );
  }

  // Custom label function for better mobile display
  const renderCustomLabel = (entry: BreakdownData) => {
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
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
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
            content={<CustomTooltip />}
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
