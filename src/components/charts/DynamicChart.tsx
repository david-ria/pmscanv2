/**
 * Dynamic Chart wrapper for lazy-loaded Recharts
 * Use this instead of importing Recharts components directly
 */
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3Icon, Loader2 } from 'lucide-react';
import { loadChartLibrary } from '@/lib/dynamicImports';

interface ChartConfig {
  [key: string]: {
    label?: string;
    color?: string;
    [key: string]: unknown;
  };
}

interface DynamicChartProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  type: 'line' | 'bar' | 'pie' | 'area';
  title?: string;
  height?: number;
  className?: string;
  children?: (recharts: Record<string, React.ComponentType<any>>) => React.ReactNode;
}

export function DynamicChart({
  data,
  config,
  type,
  title,
  height = 300,
  className,
  children
}: DynamicChartProps) {
  const [chartLib, setChartLib] = useState<Record<string, React.ComponentType<any>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRequested, setUserRequested] = useState(false);

  const loadChart = useCallback(async () => {
    if (loading || chartLib) return;

    setLoading(true);
    try {
      console.log('🚀 Loading charts library dynamically...');
      const recharts = await loadChartLibrary();
      setChartLib(recharts);
      console.log('✅ Charts library loaded');
    } catch (error) {
      console.error('Failed to load charts library:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, chartLib]);

  const handleUserRequest = () => {
    setUserRequested(true);
    loadChart();
  };

  // Show loading prompt
  if (!userRequested && !chartLib) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4" style={{ height }}>
            <div className="p-4 rounded-full bg-primary/10">
              <BarChart3Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2 text-foreground">Interactive Chart</h3>
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                Load the chart to visualize your data
              </p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                ~1MB • Loads on demand
              </p>
            </div>
            <Button onClick={handleUserRequest} className="font-medium">
              <BarChart3Icon className="h-4 w-4 mr-2" aria-hidden="true" />
              Load Chart
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4" style={{ height }}>
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading Recharts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render chart once loaded
  if (chartLib && children) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            {children(chartLib)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default chart rendering
  if (chartLib) {
    const { ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = chartLib;

    const ChartComponent = {
      line: LineChart,
      bar: BarChart,
      pie: PieChart,
      area: AreaChart,
    }[type];

    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {/* Add your chart components here based on config */}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Example usage:
/*
<DynamicChart
  data={chartData}
  config={chartConfig}
  type="line"
  title="PM2.5 Levels Over Time"
  height={400}
>
  {(recharts) => {
    const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="pm25" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    );
  }}
</DynamicChart>
*/