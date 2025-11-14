/**
 * Preview Mode Indicator - Shows when running in Lovable preview environment
 */

import { useEffect, useState } from 'react';
import { isLovablePreview } from '@/utils/environmentDetection';
import { Badge } from '@/components/ui/badge';

export const PreviewModeIndicator = () => {
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(isLovablePreview());
  }, []);

  if (!isPreview) return null;

  return (
    <Badge 
      variant="outline" 
      className="fixed bottom-4 left-4 z-50 bg-muted/90 backdrop-blur-sm border-border/50 text-xs"
    >
      Preview Mode
    </Badge>
  );
};
