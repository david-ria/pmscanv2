import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type ContextType = 'location' | 'activity' | 'autocontext';

interface ContextTypeSelectorProps {
  value: ContextType;
  onChange: (type: ContextType) => void;
}

export const ContextTypeSelector = ({ value, onChange }: ContextTypeSelectorProps) => {
  const { t } = useTranslation();

  const contextTypes: { key: ContextType; label: string }[] = [
    { key: 'location', label: t('analysis.exposureAnalysis.byLocation') },
    { key: 'activity', label: t('analysis.exposureAnalysis.byActivity') },
    { key: 'autocontext', label: t('analysis.exposureAnalysis.byAutocontext') },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 py-2">
      {contextTypes.map(({ key, label }) => (
        <Button
          key={key}
          variant={value === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(key)}
          className="min-w-20 px-3"
        >
          {label}
        </Button>
      ))}
    </div>
  );
};
