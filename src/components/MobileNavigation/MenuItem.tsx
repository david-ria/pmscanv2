import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  badge?: string | null;
  action?: () => void;
}

export function MenuItem({ icon: Icon, label, badge, action }: MenuItemProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-between px-3 py-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg min-h-[44px]"
      onClick={action}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      {badge && (
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs",
            badge === t('sensors.connected') && "bg-air-good/10 text-air-good"
          )}
        >
          {badge}
        </Badge>
      )}
    </div>
  );
}