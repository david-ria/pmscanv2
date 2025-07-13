import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

type BreakdownType = 'location' | 'activity' | 'autocontext';

interface BreakdownTypeSelectorProps {
  breakdownType: BreakdownType;
  onBreakdownTypeChange: (type: BreakdownType) => void;
}

export const BreakdownTypeSelector = ({
  breakdownType,
  onBreakdownTypeChange,
}: BreakdownTypeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <RadioGroup
      value={breakdownType}
      onValueChange={(value) => onBreakdownTypeChange(value as BreakdownType)}
      className="flex flex-row justify-center gap-2 sm:gap-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="location" id="location" />
        <Label htmlFor="location" className="cursor-pointer text-sm">
          {t('analysis.location')}
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="activity" id="activity" />
        <Label htmlFor="activity" className="cursor-pointer text-sm">
          {t('analysis.activity')}
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="autocontext" id="autocontext" />
        <Label htmlFor="autocontext" className="cursor-pointer text-sm">
          {t('analysis.autocontext')}
        </Label>
      </div>
    </RadioGroup>
  );
};
