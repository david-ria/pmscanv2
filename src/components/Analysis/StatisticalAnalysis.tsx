import { RefreshCw, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface StatisticalAnalysisProps {
  statisticalAnalysis: string;
  loading: boolean;
  onRegenerate: () => void;
}

export const StatisticalAnalysis = ({
  statisticalAnalysis,
  loading,
  onRegenerate,
}: StatisticalAnalysisProps) => {
  const { t } = useTranslation();

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
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-3 w-3 mr-2" />
                {t('analysis.exportReport')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
