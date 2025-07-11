import { useTranslation } from "react-i18next";
import { MenuItem } from "./MenuItem";
import { LanguageSelector } from "./LanguageSelector";

interface MenuSectionProps {
  title: string;
  items: {
    icon: React.ComponentType<any>;
    label: string;
    badge?: string | null;
    action?: () => void;
    toggle?: {
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    };
    info?: string;
  }[];
}

export function MenuSection({ title, items }: MenuSectionProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-1">
        {items.map((item, itemIndex) => {
          const isLanguageItem = item.label === t('settingsMenu.language');
          
          if (isLanguageItem) {
            return (
              <LanguageSelector 
                key={itemIndex}
                label={item.label}
                badge={item.badge || ""}
              />
            );
          }
          
          return (
            <MenuItem
              key={itemIndex}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              action={item.action}
              toggle={item.toggle}
              info={item.info}
            />
          );
        })}
      </div>
    </div>
  );
}