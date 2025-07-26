import { Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useTranslation } from 'react-i18next';

interface AutoContextDisplayProps {
  className?: string;
}

export function AutoContextDisplay({ className }: AutoContextDisplayProps) {
  const { latestContext, isEnabled } = useAutoContext(false); // Don't start active scanning for display only
  const { t } = useTranslation();

  if (!isEnabled || !latestContext) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Brain className="h-4 w-4" />
        <span>{t('realTime.autoContext', 'Auto Context')}</span>
      </div>
      <Badge variant="outline" className="bg-muted">
        {latestContext}
      </Badge>
    </div>
  );
}