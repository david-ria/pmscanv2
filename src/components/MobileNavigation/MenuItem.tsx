import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Crown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Info, LucideIcon } from 'lucide-react';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  badge?: string | null;
  action?: () => void;
  toggle?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
  info?: string;
}

export function MenuItem({
  icon: Icon,
  label,
  badge,
  action,
  toggle,
  info,
}: MenuItemProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!toggle) {
      action?.();
    }
  };

  return (
    <TooltipProvider>
      <div
        className="flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors rounded-lg min-h-[48px] touch-manipulation active:bg-accent/70"
        onClick={handleClick}
        style={{ cursor: toggle ? 'default' : 'pointer' }}
      >
        <div className="flex items-center gap-4">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground leading-tight">{label}</span>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{info}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge
              variant={badge === 'Premium' ? 'outline' : 'secondary'}
              className={cn(
                'text-xs flex-shrink-0',
                badge === t('sensors.connected') && 'bg-air-good/10 text-air-good',
                badge === 'Premium' && 'text-yellow-700 border-yellow-300 dark:text-yellow-400 dark:border-yellow-600'
              )}
            >
              {badge === 'Premium' && <Crown className="h-3 w-3 mr-1" />}
              {badge}
            </Badge>
          )}
          {toggle && (
            <Switch
              checked={toggle.checked}
              onCheckedChange={toggle.onCheckedChange}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
