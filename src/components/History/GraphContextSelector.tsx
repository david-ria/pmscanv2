import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

type ContextType = 'location' | 'activity' | 'autocontext';

interface GraphContextSelectorProps {
  measurements: any[];
  selectedContextType: ContextType;
  onContextTypeChange: (type: ContextType) => void;
}

export function GraphContextSelector({
  measurements,
  selectedContextType,
  onContextTypeChange,
}: GraphContextSelectorProps) {
  const { t } = useTranslation();

  // Check what context data is available from measurements
  const availableContexts = React.useMemo(() => {
    const hasLocationContext = measurements.some(m => m.locationContext);
    const hasActivityContext = measurements.some(m => m.activityContext);
    const hasAutoContext = measurements.some(m => 
      m.automaticContext && m.automaticContext !== 'unknown');
    
    return {
      location: hasLocationContext,
      activity: hasActivityContext,
      autocontext: hasAutoContext
    };
  }, [measurements]);

  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center">
        Mise en évidence des contextes
      </h4>
      
      {!availableContexts.location && !availableContexts.activity && !availableContexts.autocontext ? (
        <p className="text-xs text-muted-foreground italic text-center">
          Aucune donnée de contexte disponible pour cette mission
        </p>
      ) : (
        <RadioGroup
          value={selectedContextType}
          onValueChange={(value) => onContextTypeChange(value as ContextType)}
          className="flex flex-row justify-center gap-2 sm:gap-6"
        >
          {availableContexts.location && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="location" id="location" />
              <Label htmlFor="location" className="cursor-pointer text-sm">
                {t('analysis.location')}
              </Label>
            </div>
          )}
          {availableContexts.activity && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="activity" id="activity" />
              <Label htmlFor="activity" className="cursor-pointer text-sm">
                {t('analysis.activity')}
              </Label>
            </div>
          )}
          {availableContexts.autocontext && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="autocontext" id="autocontext" />
              <Label htmlFor="autocontext" className="cursor-pointer text-sm">
                {t('analysis.autocontext')}
              </Label>
            </div>
          )}
        </RadioGroup>
      )}
    </div>
  );
}