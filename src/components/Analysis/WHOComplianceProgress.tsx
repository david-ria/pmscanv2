import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface WHOComplianceProgressProps {
  dataPoints: {
    totalExposureMinutes: number;
    timeAboveWHO: number;
  };
}

export const WHOComplianceProgress = ({ dataPoints }: WHOComplianceProgressProps) => {
  const { t } = useTranslation();

  const compliancePercentage = dataPoints.totalExposureMinutes > 0 
    ? ((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analysis.whoComplianceTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('analysis.timeBelowWHO')}</span>
              <span className="font-medium">
                {Math.round(compliancePercentage)}%
              </span>
            </div>
            <Progress 
              value={compliancePercentage} 
              className="h-3" 
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('analysis.whoRecommendation')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};