import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  label: string;
  badge: string;
}

export function LanguageSelector({ label, badge }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <DropdownMenu>
      <div className="flex items-center justify-between px-4 py-4 rounded-lg min-h-[48px]">
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-4 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 touch-manipulation active:bg-accent/70">
            <Languages className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground leading-tight">
              {label}
            </span>
          </div>
        </DropdownMenuTrigger>
        {badge && (
          <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
            {badge}
          </Badge>
        )}
      </div>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              'cursor-pointer',
              currentLanguage === lang.code && 'bg-accent'
            )}
          >
            <span className="text-sm">{lang.name}</span>
            {currentLanguage === lang.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
