"use client";

import { usePathname } from "next/navigation";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AppProvider } from "@/contexts/AppContext";
import { AppShell } from "@/components/AppShell";
import { PwaInstallProvider } from "@/components/PwaInstall";

const PUBLIC = new Set(["/login", "/signup"]);

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC.has(pathname);

  return (
    <ConvexClientProvider>
      <PwaInstallProvider>
        <AppProvider>
          {isPublic ? children : <AppShell>{children}</AppShell>}
        </AppProvider>
      </PwaInstallProvider>
    </ConvexClientProvider>
  );
}
