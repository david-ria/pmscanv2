import { useState } from 'react';
import { RefreshCw, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { ExportReportDialog } from './ExportReportDialog';
import { useDialog } from '@/hooks/useDialog';
import { useNotifications } from '@/hooks/useNotifications';
import { generateAnalysisReport, downloadPDF } from '@/lib/pdfExport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

interface StatisticalAnalysisProps {
  statisticalAnalysis: string;
  loading: boolean;
  onRegenerate: () => void;
  // Export data
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  breakdownData: BreakdownData[];
  pmType: 'pm1' | 'pm25' | 'pm10';
  breakdownType: string;
}

export const StatisticalAnalysis = ({
  statisticalAnalysis,
  loading,
  onRegenerate,
  selectedPeriod,
  selectedDate,
  breakdownData,
  pmType,
  breakdownType,
}: StatisticalAnalysisProps) => {
  const { t } = useTranslation();
  const exportDialog = useDialog();
  const { notifyInfo } = useNotifications();
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async (method: 'download' | 'email', email?: string) => {
    setExportLoading(true);
    try {
      const exportData = {
        selectedPeriod,
        selectedDate,
        statisticalAnalysis,
        breakdownData,
        pmType,
        breakdownType,
      };

      const pdfBlob = await generateAnalysisReport(exportData);
      
      if (method === 'download') {
        const filename = `rapport-analyse-${format(selectedDate, 'yyyy-MM-dd', { locale: fr })}.pdf`;
        downloadPDF(pdfBlob, filename);
      } else if (method === 'email' && email) {
        // Email functionality will be implemented in a future release
        notifyInfo('Email functionality is coming soon!');
      }
    } finally {
      setExportLoading(false);
    }
  };

  if (!statisticalAnalysis) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('analysis.statisticalAnalysis')}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loading ? t('analysis.analyzing') : t('analysis.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">
              {t('analysis.analysisInProgress')}
            </p>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-line text-sm text-foreground leading-relaxed font-mono">
              {statisticalAnalysis}
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={exportDialog.openDialog}
                disabled={exportLoading}
              >
                <Download className="h-3 w-3 mr-2" />
                {t('analysis.exportReport')}
              </Button>
            </div>
            
            <ExportReportDialog
              open={exportDialog.open}
              onOpenChange={exportDialog.onOpenChange}
              onExport={handleExport}
              loading={exportLoading}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
