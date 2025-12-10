import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateFilter } from '@/components/DateFilter';
import { CollaborativeMap } from '@/components/Analysis/CollaborativeMap';
import { PersonalDataMap } from '@/components/Analysis/PersonalDataMap';
import { PollutantSelector, type PollutantType } from '@/components/Analysis/PollutantSelector';
import { ExposureAnalysisSection } from '@/components/Analysis/ExposureAnalysisSection';
import { useAnalysisLogic } from '@/components/Analysis/AnalysisLogic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroupSettings } from '@/hooks/useGroupSettings';

export default function Analysis() {
  const { t } = useTranslation();
  const { isGroupMode } = useGroupSettings();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<
    'day' | 'week' | 'month' | 'year'
  >('day');
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
  const [pollutantType, setPollutantType] = useState<PollutantType>('pm25');

  const {
    filteredMissions,
    loading,
    loadingMeasurements,
  } = useAnalysisLogic(selectedDate, selectedPeriod, activeTab === 'personal');

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-foreground mb-6">
        {t('analysis.pageTitle')}
      </h1>

      {/* Date Filter */}
      <DateFilter
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        className="mb-4"
      />

      {/* Pollutant Selector */}
      <PollutantSelector
        value={pollutantType}
        onChange={setPollutantType}
      />

      {/* Tabs: Personal / Group */}
      {isGroupMode ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'personal' | 'group')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">{t('analysis.myData')}</TabsTrigger>
            <TabsTrigger value="group">{t('analysis.groupData')}</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <PersonalDataMap
              selectedDate={selectedDate}
              selectedPeriod={selectedPeriod}
              pollutantType={pollutantType}
              filteredMissions={filteredMissions}
            />
            <ExposureAnalysisSection
              missions={filteredMissions}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
              pollutantType={pollutantType}
            />
          </TabsContent>

          <TabsContent value="group" className="mt-4">
            <CollaborativeMap
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
              pollutantType={pollutantType}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-4">
          <PersonalDataMap
            selectedDate={selectedDate}
            selectedPeriod={selectedPeriod}
            pollutantType={pollutantType}
            filteredMissions={filteredMissions}
          />
          <ExposureAnalysisSection
            missions={filteredMissions}
            selectedPeriod={selectedPeriod}
            selectedDate={selectedDate}
            pollutantType={pollutantType}
          />
        </div>
      )}
    </div>
  );
}
