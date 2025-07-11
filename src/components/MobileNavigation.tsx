import { UserInfoCard } from "./MobileNavigation/UserInfoCard";
import { MenuSection } from "./MobileNavigation/MenuSection";
import { MobileNavigationHeader } from "./MobileNavigation/MobileNavigationHeader";
import { MobileNavigationFooter } from "./MobileNavigation/MobileNavigationFooter";
import { useMenuSections } from "./MobileNavigation/useMenuSections";

interface MobileNavigationProps {
  onNavigate: () => void;
}

export function MobileNavigation({ onNavigate }: MobileNavigationProps) {
  const menuSections = useMenuSections({ onNavigate });

  return (
    <div className="flex flex-col h-full">
      <MobileNavigationHeader />
      <UserInfoCard />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <MenuSection
              key={sectionIndex}
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