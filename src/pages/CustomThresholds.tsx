import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useThresholds, AirQualityThresholds } from '@/contexts/ThresholdContext';
import { MenuPageHeader } from '@/components/MenuPageHeader';

export default function CustomThresholds() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { thresholds, updateThresholds, resetToWHOStandards } = useThresholds();
  
  const [localThresholds, setLocalThresholds] = useState<AirQualityThresholds>(thresholds);

  const handleInputChange = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    level: 'good' | 'moderate' | 'poor',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setLocalThresholds(prev => ({
      ...prev,
      [pollutant]: {
        ...prev[pollutant],
        [level]: numValue
      }
    }));
  };

  const validateThresholds = (thresholds: AirQualityThresholds): boolean => {
    for (const pollutant of ['pm1', 'pm25', 'pm10'] as const) {
      const { good, moderate, poor } = thresholds[pollutant];
      if (good >= moderate || moderate >= poor) {
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateThresholds(localThresholds)) {
      toast({
        title: t('common.error'),
        description: t('thresholds.validation.increasingOrder'),
        variant: 'destructive'
      });
      return;
    }

    updateThresholds(localThresholds);
    toast({
      title: t('common.success'),
      description: t('thresholds.saved')
    });
    navigate('/profile');
  };

  const handleReset = () => {
    resetToWHOStandards();
    setLocalThresholds(thresholds);
    toast({
      title: t('common.success'),
      description: t('thresholds.resetToWHO')
    });
  };

  const renderPollutantCard = (
    pollutant: 'pm1' | 'pm25' | 'pm10',
    title: string,
    unit: string = 'μg/m³'
  ) => (
    <Card key={pollutant}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-air-good">
              {t('thresholds.levels.good')} (≤ {unit})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={localThresholds[pollutant].good}
              onChange={(e) => handleInputChange(pollutant, 'good', e.target.value)}
              className="text-center"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-air-moderate">
              {t('thresholds.levels.moderate')} (≤ {unit})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={localThresholds[pollutant].moderate}
              onChange={(e) => handleInputChange(pollutant, 'moderate', e.target.value)}
              className="text-center"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-air-poor">
              {t('thresholds.levels.poor')} (≤ {unit})
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={localThresholds[pollutant].poor}
              onChange={(e) => handleInputChange(pollutant, 'poor', e.target.value)}
              className="text-center"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('thresholds.levels.veryPoor')}: {'>'} {localThresholds[pollutant].poor} {unit}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <MenuPageHeader 
          title={t('thresholds.title')}
          subtitle={t('thresholds.subtitle')}
        />

        {/* WHO Standards Info */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm">
              <strong>{t('thresholds.whoInfo.title')}:</strong>{' '}
              {t('thresholds.whoInfo.description')}
            </p>
          </CardContent>
        </Card>

        {/* Threshold Controls */}
        <div className="space-y-6">
          {renderPollutantCard('pm1', 'PM1')}
          {renderPollutantCard('pm25', 'PM2.5')}
          {renderPollutantCard('pm10', 'PM10')}
        </div>

        <Separator className="my-6" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 min-h-[44px] touch-manipulation"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('thresholds.resetToWHO')}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 min-h-[44px] touch-manipulation"
          >
            <Save className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </div>

        {/* Validation Warning */}
        {!validateThresholds(localThresholds) && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              {t('thresholds.validation.increasingOrder')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}