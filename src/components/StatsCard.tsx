
import { BaseCard } from '@/components/shared/BaseCard';
import { cn } from '@/lib/utils';
import { layoutClasses, cardClasses } from '@/lib/css-utils';

interface Stat {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'default' | 'good' | 'moderate' | 'poor';
}

interface StatsCardProps {
  title: string;
  stats: Stat[];
  className?: string;
}

export function StatsCard({ title, stats, className }: StatsCardProps) {
  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'good':
        return 'text-air-good';
      case 'moderate':
        return 'text-air-moderate';
      case 'poor':
        return 'text-air-poor';
      default:
        return 'text-foreground';
    }
  };

  return (
    <BaseCard title={title} className={cn(cardClasses.elevated, className)}>
      <div className={cn(layoutClasses.contentGrid, 'grid-cols-2')}>
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className={cn('text-2xl font-bold', getColorClasses(stat.color))}>
              {stat.value}
              {stat.unit && <span className="text-sm ml-1">{stat.unit}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}
