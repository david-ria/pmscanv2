import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreakdownData } from './PollutionBreakdown/usePollutionBreakdownData';
import type { PollutantType } from './PollutantSelector';

interface ExposureBarChartProps {
  data: BreakdownData[];
  pollutantType: PollutantType;
}

export const ExposureBarChart = ({ data, pollutantType }: ExposureBarChartProps) => {
  const { t } = useTranslation();

  const doseUnit = pollutantType === 'tvoc' ? 'ppb·h' : 'µg·h/m³';

  const chartData = useMemo(() => {
    return data
      .sort((a, b) => b.percentage - a.percentage)
      .map((item) => ({
        ...item,
        shortName: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('analysis.exposureAnalysis.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as BreakdownData & { shortName: string };
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{item.name}</p>
          <div className="text-sm text-muted-foreground space-y-1 mt-1">
            <p>{t('analysis.exposureAnalysis.percentage')}: {item.percentage.toFixed(1)}%</p>
            <p>{t('analysis.exposureAnalysis.average')}: {item.avgPM.toFixed(1)} {pollutantType === 'tvoc' ? 'ppb' : 'µg/m³'}</p>
            <p>{t('analysis.exposureAnalysis.timeSpent')}: {Math.round(item.exposure)} min</p>
            <p>{t('analysis.exposureAnalysis.cumulativeExposure')}: {item.cumulativeDose.toFixed(1)} {doseUnit}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {t('analysis.exposureAnalysis.chartTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <XAxis 
                dataKey="shortName" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                angle={-35}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
