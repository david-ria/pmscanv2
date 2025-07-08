import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  color?: "default" | "good" | "moderate" | "poor";
}

interface StatsCardProps {
  title: string;
  stats: Stat[];
  className?: string;
}

export function StatsCard({ title, stats, className }: StatsCardProps) {
  const getColorClasses = (color?: string) => {
    switch (color) {
      case "good":
        return "text-air-good";
      case "moderate":
        return "text-air-moderate";
      case "poor":
        return "text-air-poor";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={cn("text-2xl font-bold", getColorClasses(stat.color))}>
                {stat.value}
                {stat.unit && <span className="text-sm ml-1">{stat.unit}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}