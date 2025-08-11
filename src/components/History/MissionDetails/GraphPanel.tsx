import React, { memo, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PMLineGraph } from '@/components/PMLineGraph';
import { GraphContextSelector } from '../GraphContextSelector';
import { MissionData } from '@/lib/dataStorage';
import { formatDateTime } from '@/utils/timeFormat';

interface GraphPanelProps {
  mission: MissionData;
  graphData: any[];
  events: any[];
  selectedContextType: 'location' | 'activity' | 'autocontext';
  onContextTypeChange: (contextType: 'location' | 'activity' | 'autocontext') => void;
}

export const GraphPanel = memo(forwardRef<HTMLDivElement, GraphPanelProps>(
  ({ mission, graphData, events, selectedContextType, onContextTypeChange }, ref) => {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-lg">Évolution des particules fines (µg/m³)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {mission.measurementsCount} points de données • Dernière mesure: {formatDateTime(mission.endTime)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <GraphContextSelector
            mission={mission}
            selectedContextType={selectedContextType}
            onContextTypeChange={onContextTypeChange}
          />
          {/* Graph container with better mobile responsive height */}
          <div className="h-[400px] sm:h-[500px] w-full overflow-hidden" ref={ref}>
            <PMLineGraph 
              data={graphData} 
              events={events} 
              className="h-full w-full"
              highlightContextType={selectedContextType === 'autocontext' ? 'location' : selectedContextType}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
));

GraphPanel.displayName = 'GraphPanel';