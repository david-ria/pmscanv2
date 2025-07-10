import { Activity, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface ActivityData {
  activity: string;
  timeSpent: number;
  averageExposure: number;
  measurements: number;
}

interface ActivityAnalysisProps {
  activityData: ActivityData[];
  showActivityExposure: boolean;
  onToggleExposure: (value: boolean) => void;
}

export const ActivityAnalysis = ({ 
  activityData, 
  showActivityExposure, 
  onToggleExposure 
}: ActivityAnalysisProps) => {
  const { t } = useTranslation();

  if (activityData.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('analysis.activityAnalysisTitle')}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="activity-toggle" className="text-sm">
              <Clock className="h-4 w-4 inline mr-1" />
              {t('analysis.timeSpent')}
            </Label>
            <Switch
              id="activity-toggle"
              checked={showActivityExposure}
              onCheckedChange={onToggleExposure}
            />
            <Label htmlFor="activity-toggle" className="text-sm">
              <BarChart3 className="h-4 w-4 inline mr-1" />
              {t('analysis.exposure')}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activityData.map((activity, index) => {
            const maxValue = showActivityExposure 
              ? Math.max(...activityData.map(a => a.averageExposure))
              : Math.max(...activityData.map(a => a.timeSpent));
            
            const currentValue = showActivityExposure 
              ? activity.averageExposure 
              : activity.timeSpent;
            
            const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

            return (
              <div key={activity.activity} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {activity.activity}
                  </span>
                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>
                      {showActivityExposure 
                        ? `${Math.round(activity.averageExposure)} µg/m³`
                        : `${Math.round(activity.timeSpent / 60)}h ${activity.timeSpent % 60}min`
                      }
                    </span>
                    <span className="text-xs">
                      {activity.measurements} {t('analysis.measurements')}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};