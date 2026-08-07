"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Only this exact path counts as active - use for a landing page that would otherwise also match every sub-route (e.g. "/faculty" vs "/faculty/quizzes/new"). */
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavSidebarProps {
  navGroups: NavGroup[];
  mobileOpen: boolean;
  onClose: () => void;
}

// Shared left-nav shell used by the Admin, Faculty and Student portals - same
// look everywhere, each portal just supplies its own `navGroups`. What a user
// can reach is still enforced server-side (middleware + role guards on every
// API route); this only decides what's *shown* to them.
export function NavSidebar({ navGroups, mobileOpen, onClose }: NavSidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");

  const nav = (
    <nav ref={navRef} className="flex-1 space-y-6 overflow-y-auto p-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={active ? activeLinkRef : undefined}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-end border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {nav}
      </aside>
    </>
  );
}
