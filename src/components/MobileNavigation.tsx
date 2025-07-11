import { useState } from "react";
import { UserInfoCard } from "./MobileNavigation/UserInfoCard";
import { MenuSection } from "./MobileNavigation/MenuSection";
import { MobileNavigationHeader } from "./MobileNavigation/MobileNavigationHeader";
import { MobileNavigationFooter } from "./MobileNavigation/MobileNavigationFooter";
import { useMenuSections } from "./MobileNavigation/useMenuSections";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackgroundRecordingControl } from "@/components/BackgroundRecordingControl";
import { AutoContextControl } from "@/components/AutoContextControl";

interface MobileNavigationProps {
  onNavigate: () => void;
}

export function MobileNavigation({ onNavigate }: MobileNavigationProps) {
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [isAutoContextDialogOpen, setIsAutoContextDialogOpen] = useState(false);
  
  const handleBackgroundRecording = () => {
    setIsBackgroundDialogOpen(true);
  };

  const handleAutoContext = () => {
    setIsAutoContextDialogOpen(true);
  };

  const menuSections = useMenuSections({ 
    onNavigate, 
    onBackgroundRecording: handleBackgroundRecording,
    onAutoContext: handleAutoContext
  });

  return (
    <>
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

      <Dialog open={isBackgroundDialogOpen} onOpenChange={setIsBackgroundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Background Recording</DialogTitle>
          </DialogHeader>
          <BackgroundRecordingControl />
        </DialogContent>
      </Dialog>

      <Dialog open={isAutoContextDialogOpen} onOpenChange={setIsAutoContextDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Auto Context Detection</DialogTitle>
          </DialogHeader>
          <AutoContextControl />
        </DialogContent>
      </Dialog>
    </>
  );
}