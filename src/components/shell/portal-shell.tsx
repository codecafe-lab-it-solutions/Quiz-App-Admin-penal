"use client";

import { useState } from "react";
import { NavSidebar, type NavGroup } from "@/components/shell/nav-sidebar";
import { PortalTopbar } from "@/components/shell/portal-topbar";

interface PortalShellProps {
  name: string;
  email: string;
  roleLabel: string;
  brandLines: [string, string];
  navGroups: NavGroup[];
  extraMenuItems?: React.ReactNode;
  children: React.ReactNode;
}

// Sidebar + topbar + content shell shared by the Admin, Faculty and Student
// portals - identical layout everywhere; each portal supplies its own brand
// text and nav items. Access control is enforced server-side regardless of
// what's shown here (see middleware.ts and each API route's requireRole()).
export function PortalShell({ name, email, roleLabel, brandLines, navGroups, extraMenuItems, children }: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <PortalTopbar
        name={name}
        email={email}
        roleLabel={roleLabel}
        brandLines={brandLines}
        onMenuClick={() => setMobileNavOpen(true)}
        extraMenuItems={extraMenuItems}
      />
      <div className="flex flex-1 overflow-hidden">
        <NavSidebar navGroups={navGroups} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
