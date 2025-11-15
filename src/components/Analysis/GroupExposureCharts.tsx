import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface ContextExposure {
  context: string;
  avgPM1: number;
  avgPM25: number;
  avgPM10: number;
  measurementCount: number;
}

interface GroupExposureChartsProps {
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
}

const PMTypeSelector = ({ 
  value, 
  onChange 
}: { 
  value: 'pm1' | 'pm25' | 'pm10'; 
  onChange: (value: 'pm1' | 'pm25' | 'pm10') => void;
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange('pm1')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          value === 'pm1'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        PM1
      </button>
      <button
        onClick={() => onChange('pm25')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          value === 'pm25'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        PM2.5
      </button>
      <button
        onClick={() => onChange('pm10')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          value === 'pm10'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        PM10
      </button>
    </div>
  );
};

const getBarColor = (index: number): string => {
  const colors = [
    '#14B8A6', // Teal/Cyan
    '#F59E0B', // Orange
    '#A855F7', // Purple
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F97316', // Deep Orange
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#EAB308', // Yellow
  ];
  return colors[index % colors.length];
};

export function GroupExposureCharts({ selectedPeriod, selectedDate }: GroupExposureChartsProps) {
  const { t } = useTranslation();
  const { activeGroup } = useGroupSettings();
  const activeGroupId = activeGroup?.id;
  const [pmType, setPmType] = useState<'pm1' | 'pm25' | 'pm10'>('pm25');
  const [locationData, setLocationData] = useState<ContextExposure[]>([]);
  const [activityData, setActivityData] = useState<ContextExposure[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    switch (selectedPeriod) {
      case 'day':
        return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      case 'week':
        return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      case 'year':
        return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
    }
  }, [selectedPeriod, selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeGroupId) return;

      setLoading(true);
      try {
        // Fetch measurements for the group
        const { data: measurements, error } = await supabase
          .from('measurements')
          .select(`
            location_context,
            activity_context,
            pm1,
            pm25,
            pm10,
            mission_id,
            missions!inner(
              group_id,
              shared
            )
          `)
          .eq('missions.group_id', activeGroupId)
          .eq('missions.shared', true)
          .gte('timestamp', dateRange.start.toISOString())
          .lte('timestamp', dateRange.end.toISOString());

        if (error) throw error;

        // Aggregate by location context
        const locationMap = new Map<string, { sum1: number; sum25: number; sum10: number; count: number }>();
        const activityMap = new Map<string, { sum1: number; sum25: number; sum10: number; count: number }>();

        measurements?.forEach((m) => {
          // Location aggregation
          if (m.location_context) {
            const existing = locationMap.get(m.location_context) || { sum1: 0, sum25: 0, sum10: 0, count: 0 };
            locationMap.set(m.location_context, {
              sum1: existing.sum1 + m.pm1,
              sum25: existing.sum25 + m.pm25,
              sum10: existing.sum10 + m.pm10,
              count: existing.count + 1
            });
          }

          // Activity aggregation
          if (m.activity_context) {
            const existing = activityMap.get(m.activity_context) || { sum1: 0, sum25: 0, sum10: 0, count: 0 };
            activityMap.set(m.activity_context, {
              sum1: existing.sum1 + m.pm1,
              sum25: existing.sum25 + m.pm25,
              sum10: existing.sum10 + m.pm10,
              count: existing.count + 1
            });
          }
        });

        // Convert to array and calculate averages
        const locationExposures: ContextExposure[] = Array.from(locationMap.entries()).map(([context, data]) => ({
          context,
          avgPM1: data.sum1 / data.count,
          avgPM25: data.sum25 / data.count,
          avgPM10: data.sum10 / data.count,
          measurementCount: data.count
        }));

        const activityExposures: ContextExposure[] = Array.from(activityMap.entries()).map(([context, data]) => ({
          context,
          avgPM1: data.sum1 / data.count,
          avgPM25: data.sum25 / data.count,
          avgPM10: data.sum10 / data.count,
          measurementCount: data.count
        }));

        setLocationData(locationExposures);
        setActivityData(activityExposures);
      } catch (error) {
        console.error('Error fetching group exposure data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeGroupId, dateRange]);

  // Sort data based on selected PM type
  const sortedLocationData = useMemo(() => {
    return [...locationData]
      .sort((a, b) => {
        const aValue = pmType === 'pm1' ? a.avgPM1 : pmType === 'pm25' ? a.avgPM25 : a.avgPM10;
        const bValue = pmType === 'pm1' ? b.avgPM1 : pmType === 'pm25' ? b.avgPM25 : b.avgPM10;
        return bValue - aValue; // Descending
      })
      .slice(0, 10)
      .map(item => ({ ...item, isLocation: true })); // Mark as location data
  }, [locationData, pmType]);

  const sortedActivityData = useMemo(() => {
    return [...activityData]
      .sort((a, b) => {
        const aValue = pmType === 'pm1' ? a.avgPM1 : pmType === 'pm25' ? a.avgPM25 : a.avgPM10;
        const bValue = pmType === 'pm1' ? b.avgPM1 : pmType === 'pm25' ? b.avgPM25 : b.avgPM10;
        return bValue - aValue; // Descending
      })
      .slice(0, 10)
      .map(item => ({ ...item, isLocation: false })); // Mark as activity data
  }, [activityData, pmType]);

  const getCurrentPMKey = () => {
    return pmType === 'pm1' ? 'avgPM1' : pmType === 'pm25' ? 'avgPM25' : 'avgPM10';
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pmKey = getCurrentPMKey();
      const value = data[pmKey];
      
      // Calculate percentage of total
      const isLocationData = data.isLocation;
      const allData = isLocationData ? sortedLocationData : sortedActivityData;
      const total = allData.reduce((sum: number, item: any) => {
        const itemValue = pmKey === 'avgPM1' ? item.avgPM1 : pmKey === 'avgPM25' ? item.avgPM25 : item.avgPM10;
        return sum + itemValue;
      }, 0);
      const percentage = ((value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-1">{data.context}</p>
          <p className="text-sm text-muted-foreground">
            {value.toFixed(1)} µg/m³
          </p>
          <p className="text-sm font-medium text-primary">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>{t('analysis.groupExposure.title')}</CardTitle>
          <PMTypeSelector value={pmType} onChange={setPmType} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Location Chart */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('analysis.groupExposure.byLocation')}
            </h3>
            {sortedLocationData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('analysis.groupExposure.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortedLocationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="context" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'PM (µg/m³)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--foreground))' }
                    }}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={getCurrentPMKey()}
                    radius={[4, 4, 0, 0]}
                  >
                    {sortedLocationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity Chart */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('analysis.groupExposure.byActivity')}
            </h3>
            {sortedActivityData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('analysis.groupExposure.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortedActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="context" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'PM (µg/m³)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--foreground))' }
                    }}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={getCurrentPMKey()}
                    radius={[4, 4, 0, 0]}
                  >
                    {sortedActivityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
