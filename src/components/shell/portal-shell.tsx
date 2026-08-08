"use client";

import { useEffect, useState } from "react";
import { NavSidebar, type NavGroup } from "@/components/shell/nav-sidebar";
import { PortalTopbar } from "@/components/shell/portal-topbar";

// Access-token cookie lives 15m (src/lib/cookies.ts); renewing it every 10m
// keeps it from ever fully expiring while a portal tab is open, so a quiet
// page doesn't get bounced to /login by middleware on the next navigation.
// api-client.ts's reactive 401-retry is the backstop for everything else
// (closed laptop lid, missed interval, etc).
const SESSION_KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;

function useSessionKeepAlive() {
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => {});
    }, SESSION_KEEPALIVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}

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
  useSessionKeepAlive();

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
