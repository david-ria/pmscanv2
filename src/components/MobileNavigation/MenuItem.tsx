import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  badge?: string | null;
  action?: () => void;
  toggle?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
}

export function MenuItem({ icon: Icon, label, badge, action, toggle }: MenuItemProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!toggle) {
      action?.();
    }
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors rounded-lg min-h-[48px] touch-manipulation"
      onClick={handleClick}
      style={{ cursor: toggle ? 'default' : 'pointer' }}
    >
      <div className="flex items-center gap-4">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground leading-tight">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs flex-shrink-0",
              badge === t('sensors.connected') && "bg-air-good/10 text-air-good"
            )}
          >
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
  );
}