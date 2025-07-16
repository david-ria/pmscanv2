import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BaseCardProps } from '@/types/shared';

interface BaseCardComponentProps extends BaseCardProps {
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  contentClassName?: string;
}

export const BaseCard = ({ 
  title, 
  description, 
  headerActions, 
  children, 
  className,
  contentClassName 
}: BaseCardComponentProps) => {
  return (
    <Card className={cn("w-full", className)}>
      {(title || description || headerActions) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && <div className="flex items-center space-x-2">{headerActions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};