import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNavigation } from "./MobileNavigation";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border z-50">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Burger Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-accent"
                aria-label="Menu principal"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-80 p-0">
              <MobileNavigation onNavigate={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* App Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">PMSCAN</h1>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              Temps réel
            </Badge>
          </div>
        </div>

        {/* Right side - connection status */}
        <div className="flex items-center gap-2">
          {/* Connection status will be shown in page content */}
        </div>
      </div>
    </header>
  );
}