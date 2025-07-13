import { useTranslation } from "react-i18next";

type PMType = "pm1" | "pm25" | "pm10";

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

interface WHOThreshold {
  value: number | null;
  label: string;
}

interface PollutionSummaryTableProps {
  breakdownData: BreakdownData[];
  pmType: PMType;
  whoThreshold: WHOThreshold;
}

export const PollutionSummaryTable = ({ breakdownData, pmType, whoThreshold }: PollutionSummaryTableProps) => {
  const { t } = useTranslation();

  if (breakdownData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t('analysis.noDataAvailable')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {breakdownData.map((item) => {
        const exceedsWHO = whoThreshold.value && item.avgPM > whoThreshold.value;
        
        return (
          <div key={item.name} className="flex items-start sm:items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div 
              className="w-4 h-4 rounded-full mt-0.5 sm:mt-0 flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground break-words">
                {Math.round(item.exposure)} {t('analysis.minutes')} • PM{pmType.replace('pm', '')}: {Math.round(item.avgPM)} μg/m³
                {whoThreshold.value && (
                  <span className={`block sm:inline sm:ml-2 ${exceedsWHO ? 'text-red-600' : 'text-green-600'}`}>
                    ({exceedsWHO ? t('analysis.exceeds') : t('analysis.complies')} {t('analysis.whoThreshold')}: {whoThreshold.value} μg/m³)
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-medium text-sm">{item.percentage.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">
                {(item.exposure / 60).toFixed(1)}h
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
