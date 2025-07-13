import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";

type PMType = "pm1" | "pm25" | "pm10";

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

export const PollutionPieChart = ({ breakdownData, pmType }: PollutionPieChartProps) => {
  const { t } = useTranslation();

  if (breakdownData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('analysis.noDataForPeriod')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={breakdownData}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          fill="#8884d8"
          dataKey="percentage"
          label={(entry) => `${entry.name}: ${entry.percentage.toFixed(0)}%`}
        >
          {breakdownData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `${value.toFixed(1)}%`,
            `PM${pmType.replace('pm', '')}: ${Math.round(props.payload.avgPM)} μg/m³`
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
