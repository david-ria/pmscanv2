import { AlertTriangle, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SubscriptionUpgradePromptProps {
  featureName: string;
  description?: string;
  inline?: boolean;
}

export function SubscriptionUpgradePrompt({ 
  featureName, 
  description,
  inline = false 
}: SubscriptionUpgradePromptProps) {
  if (inline) {
    return (
      <Badge variant="secondary" className="ml-2 text-xs">
        <Crown className="h-3 w-3 mr-1" />
        Premium
      </Badge>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        <span className="font-medium">{featureName}</span> is a premium feature.
        {description && (
          <span className="block text-sm mt-1 text-yellow-700 dark:text-yellow-300">
            {description}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}