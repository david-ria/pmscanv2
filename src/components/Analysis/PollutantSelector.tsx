import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type PollutantType = 'pm1' | 'pm25' | 'pm10' | 'tvoc';

interface PollutantSelectorProps {
  value: PollutantType;
  onChange: (type: PollutantType) => void;
}

export const PollutantSelector = ({ value, onChange }: PollutantSelectorProps) => {
  const { t } = useTranslation();

  const pollutants: { key: PollutantType; label: string }[] = [
    { key: 'pm1', label: t('analysis.pollutantSelector.pm1') },
    { key: 'pm25', label: t('analysis.pollutantSelector.pm25') },
    { key: 'pm10', label: t('analysis.pollutantSelector.pm10') },
    { key: 'tvoc', label: t('analysis.pollutantSelector.tvoc') },
  ];

  return (
    <div className="flex justify-center gap-2 py-2">
      {pollutants.map(({ key, label }) => (
        <Button
          key={key}
          variant={value === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(key)}
          className="min-w-14 px-3"
        >
          {label}
        </Button>
      ))}
    </div>
  );
};
