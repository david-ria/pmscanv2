import { useTranslation } from 'react-i18next';

type PMType = 'pm1' | 'pm25' | 'pm10';

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  avgPM1: number;
  avgPM25: number;
  avgPM10: number;
  color: string;
  exposure: number;
  cumulativeDose: number;
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

export const PollutionSummaryTable = ({
  breakdownData,
  pmType,
  whoThreshold,
}: PollutionSummaryTableProps) => {
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
        const exceedsWHO =
          whoThreshold.value && item.avgPM > whoThreshold.value;

        return (
          <div
            key={item.name}
            className="flex items-start sm:items-center gap-3 p-3 bg-muted/30 rounded-lg"
          >
            <div
              className="w-4 h-4 rounded-full mt-0.5 sm:mt-0 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground break-words space-y-1">
                <div>
                  {Math.round(item.exposure)} {t('analysis.minutes')} • {(item.exposure / 60).toFixed(1)}h exposure
                </div>
                <div className="flex flex-wrap gap-2">
                  <span>PM1: {Math.round(item.avgPM1)} μg/m³</span>
                  <span>PM2.5: {Math.round(item.avgPM25)} μg/m³</span>
                  <span>PM10: {Math.round(item.avgPM10)} μg/m³</span>
                </div>
                <div>
                  Dose: {item.cumulativeDose.toFixed(1)} μg·h/m³
                </div>
                {whoThreshold.value && (
                  <div
                    className={`${exceedsWHO ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {exceedsWHO
                      ? t('analysis.exceeds')
                      : t('analysis.complies')}{' '}
                    {t('analysis.whoThreshold')}: {whoThreshold.value} μg/m³
                  </div>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-medium text-sm">
                {item.percentage.toFixed(0)}%
              </div>
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
