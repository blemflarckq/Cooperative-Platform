import { useState } from "react";
import { Outlet } from "react-router";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { MobileSidebar } from "@/components/navigation/MobileSidebar";
import { ExperienceModeProvider } from "@/lib/experience/ExperienceModeProvider";

/**
 * Main authenticated application shell.
 * Responsive structure:
 * - persistent sidebar on desktop
 * - top header
 * - scrollable content area
 */
export function AppShellLayout() {

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  return (
    <ExperienceModeProvider>
      <div className="app-shell-bg min-h-screen">

        <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        
        <div className="flex min-h-screen">
          <AppSidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

            <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              <div className="mx-auto w-full max-w-7xl">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </ExperienceModeProvider>
  );
}