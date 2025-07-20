import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { MissionData } from '@/lib/dataStorage';

type ContextType = 'none' | 'location' | 'activity' | 'autocontext';

interface GraphContextSelectorProps {
  mission: MissionData;
  selectedContextType: ContextType;
  onContextTypeChange: (type: ContextType) => void;
}

export function GraphContextSelector({
  mission,
  selectedContextType,
  onContextTypeChange,
}: GraphContextSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-card rounded-lg border">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          Mise en évidence des contextes
        </h4>
        
        <RadioGroup
          value={selectedContextType}
          onValueChange={(value) => onContextTypeChange(value as ContextType)}
          className="flex flex-row justify-center gap-2 sm:gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none" className="cursor-pointer text-sm">
              Aucun
            </Label>
          </div>
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
      </div>
    </div>
  );
}