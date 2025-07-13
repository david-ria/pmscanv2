import { Button } from '@/components/ui/button';

type PMType = 'pm1' | 'pm25' | 'pm10';

interface PMTypeSelectorProps {
  pmType: PMType;
  onPMTypeChange: (type: PMType) => void;
}

export const PMTypeSelector = ({
  pmType,
  onPMTypeChange,
}: PMTypeSelectorProps) => {
  return (
    <div className="flex justify-center gap-2 py-4 my-4">
      <Button
        variant={pmType === 'pm1' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPMTypeChange('pm1')}
        className="min-w-12 px-2"
      >
        PM1
      </Button>
      <Button
        variant={pmType === 'pm25' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPMTypeChange('pm25')}
        className="min-w-12 px-2"
      >
        PM2.5
      </Button>
      <Button
        variant={pmType === 'pm10' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPMTypeChange('pm10')}
        className="min-w-12 px-2"
      >
        PM10
      </Button>
    </div>
  );
};
