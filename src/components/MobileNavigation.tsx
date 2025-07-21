import { UserInfoCard } from './MobileNavigation/UserInfoCard';
import { MenuSection } from './MobileNavigation/MenuSection';
import { MobileNavigationHeader } from './MobileNavigation/MobileNavigationHeader';
import { MobileNavigationFooter } from './MobileNavigation/MobileNavigationFooter';
import { useMenuSections } from './MobileNavigation/useMenuSections';

interface MobileNavigationProps {
  /** Callback function called when navigation item is selected */
  onNavigate: () => void;
}

/**
 * Mobile navigation component
 * 
 * Provides a full-screen mobile navigation experience with user info,
 * organized menu sections, and app version information. Optimized for
 * touch interfaces with proper minimum touch targets and visual feedback.
 */
export function MobileNavigation({ onNavigate }: MobileNavigationProps) {
  const menuSections = useMenuSections({ onNavigate });

  return (
    <div className="flex flex-col h-full bg-background">
      <MobileNavigationHeader />
      <UserInfoCard />

      {/* Scrollable menu sections with proper mobile spacing */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-safe-area-inset-bottom">
          {menuSections.map((section, sectionIndex) => (
            <MenuSection
              key={`section-${sectionIndex}`}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>
      </div>

      <MobileNavigationFooter />
    </div>
  );
}
