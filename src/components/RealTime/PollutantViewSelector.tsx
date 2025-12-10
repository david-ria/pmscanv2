import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type PollutantType = 'pm1' | 'pm25' | 'pm10' | 'tvoc';

interface PollutantViewSelectorProps {
  mode: 'single' | 'multi';
  selectedPollutants: PollutantType[];
  onChange: (selected: PollutantType[]) => void;
  className?: string;
}

const POLLUTANTS: { key: PollutantType; label: string }[] = [
  { key: 'pm1', label: 'PM1' },
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'tvoc', label: 'TVOC' },
];

export function PollutantViewSelector({
  mode,
  selectedPollutants,
  onChange,
  className,
}: PollutantViewSelectorProps) {
  const { t } = useTranslation();

  const handleClick = (pollutant: PollutantType) => {
    if (mode === 'single') {
      onChange([pollutant]);
    } else {
      // Multi-select toggle
      if (selectedPollutants.includes(pollutant)) {
        // Don't allow deselecting the last one
        if (selectedPollutants.length > 1) {
          onChange(selectedPollutants.filter((p) => p !== pollutant));
        }
      } else {
        onChange([...selectedPollutants, pollutant]);
      }
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-center gap-1.5">
        {POLLUTANTS.map(({ key, label }) => {
          const isSelected = selectedPollutants.includes(key);
          return (
            <Button
              key={key}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleClick(key)}
              className={cn(
                'min-w-[60px] text-xs font-medium transition-all',
                isSelected && 'ring-2 ring-primary/30 shadow-sm'
              )}
            >
              {label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {mode === 'single'
          ? t('realTime.pollutantSelector.mapInfo')
          : t('realTime.pollutantSelector.graphInfo')}
      </p>
    </div>
  );
}
