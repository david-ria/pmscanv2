import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime, formatDurationHHMM } from '@/utils/timeFormat';
import { downloadPDF } from '@/lib/pdfExport';
import { isoForFilename } from '@/utils/iso';
import { OverallStats, ContextStats } from '@/lib/analysis/mission';
import { MissionData } from '@/lib/dataStorage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Image as ImageIcon, FileText } from 'lucide-react';

interface ExportActionsProps {
  mission: MissionData;
  overallStats: OverallStats;
  contextStats: {
    location: Record<string, ContextStats>;
    activity: Record<string, ContextStats>;
    autocontext: Record<string, ContextStats>;
  };
  events: any[];
  graphRef: React.RefObject<HTMLDivElement>;
}

export const ExportActions = memo<ExportActionsProps>(({
  mission,
  overallStats,
  contextStats,
  events,
  graphRef
}) => {
  const { toast } = useToast();

  const saveGraphAsImage = useCallback(async () => {
    if (!graphRef.current) return;
    
    try {
      const canvas = await html2canvas(graphRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `${mission.name}_graph_${isoForFilename(Date.now())}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Graph saved",
        description: "Graph image has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error saving graph:', error);
      toast({
        title: "Error",
        description: "Failed to save graph image",
        variant: "destructive",
      });
    }
  }, [graphRef, mission.name, toast]);

  const exportMissionReport = useCallback(async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Mission Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Mission details
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Mission: ${mission.name}`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${formatDateTime(mission.startTime)}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Duration: ${formatDurationHHMM(mission.durationMinutes)}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Measurements: ${mission.measurementsCount}`, 20, yPosition);
      yPosition += 5;
      
      if (mission.locationContext && mission.activityContext) {
        pdf.text(`Context: ${mission.locationContext} • ${mission.activityContext}`, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // Overall statistics
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Overall Statistics', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`PM1.0: Avg ${overallStats.pm1.avg.toFixed(1)} µg/m³ (Min: ${overallStats.pm1.min.toFixed(1)}, Max: ${overallStats.pm1.max.toFixed(1)})`, 20, yPosition);
      yPosition += 5;
      pdf.text(`PM2.5: Avg ${overallStats.pm25.avg.toFixed(1)} µg/m³ (Min: ${overallStats.pm25.min.toFixed(1)}, Max: ${overallStats.pm25.max.toFixed(1)})`, 20, yPosition);
      yPosition += 5;
      pdf.text(`PM10: Avg ${overallStats.pm10.avg.toFixed(1)} µg/m³ (Min: ${overallStats.pm10.min.toFixed(1)}, Max: ${overallStats.pm10.max.toFixed(1)})`, 20, yPosition);
      yPosition += 15;

      // Context statistics
      Object.entries(contextStats).forEach(([contextType, stats]) => {
        if (Object.keys(stats).length === 0) return;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Statistics by ${contextType}`, 20, yPosition);
        yPosition += 8;

        Object.entries(stats).forEach(([context, values]) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${context} (${formatDurationHHMM(values.timeSpent)}):`, 25, yPosition);
          yPosition += 4;
          pdf.text(`  PM1.0: ${values.pm1.toFixed(1)} µg/m³, PM2.5: ${values.pm25.toFixed(1)} µg/m³, PM10: ${values.pm10.toFixed(1)} µg/m³`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      });

      // Events
      if (events.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Recorded Events (${events.length})`, 20, yPosition);
        yPosition += 8;

        events.forEach((event) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const eventTime = new Date(event.timestamp).toLocaleString();
          pdf.text(`${eventTime} - ${event.eventType || 'Event'}`, 25, yPosition);
          yPosition += 4;
          
          if (event.comment) {
            pdf.text(`  Comment: ${event.comment}`, 25, yPosition);
            yPosition += 4;
          }
          
          if (event.latitude && event.longitude) {
            pdf.text(`  Location: ${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`, 25, yPosition);
            yPosition += 4;
          }
          yPosition += 2;
        });
      }

      // Save PDF
      const blob = pdf.output('blob');
      downloadPDF(blob, `${mission.name}_report_${isoForFilename(Date.now())}.pdf`);
      
      toast({
        title: "Report exported",
        description: "Mission report has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export mission report",
        variant: "destructive",
      });
    }
  }, [mission, overallStats, contextStats, events, toast]);

  return (
    <div className="flex gap-2 pt-4 border-t">
      <Button
        onClick={saveGraphAsImage}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <ImageIcon className="h-4 w-4" />
        Save Graph
      </Button>
      <Button
        onClick={exportMissionReport}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Export Report
      </Button>
    </div>
  );
});

ExportActions.displayName = 'ExportActions';