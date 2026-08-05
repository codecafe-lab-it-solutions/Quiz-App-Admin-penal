"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Link2,
  Building2,
  BookOpen,
  CalendarRange,
  LayoutGrid,
  MapPin,
  Radio,
  FileBarChart,
  ShieldCheck,
  CalendarClock,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "People",
    items: [
      { label: "Faculty", href: "/admin/faculty", icon: GraduationCap },
      { label: "Students", href: "/admin/students", icon: Users },
    ],
  },
  {
    title: "Mapping",
    items: [
      { label: "Faculty ↔ Course/Section", href: "/admin/mapping/faculty-course-section", icon: Link2 },
      { label: "Student ↔ Course/Section", href: "/admin/mapping/student-course-section", icon: Link2 },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Departments", href: "/admin/master-data/departments", icon: Building2 },
      { label: "Courses", href: "/admin/master-data/courses", icon: BookOpen },
      { label: "Sessions", href: "/admin/master-data/sessions", icon: CalendarRange },
      { label: "Sections", href: "/admin/master-data/sections", icon: LayoutGrid },
      { label: "Buildings", href: "/admin/master-data/buildings", icon: MapPin },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Live Tracking", href: "/admin/reports/live-tracking", icon: Radio },
      { label: "Attendance", href: "/admin/reports/attendance", icon: FileBarChart },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Admin Users", href: "/admin/settings/admin-users", icon: ShieldCheck },
      { label: "Semester Config", href: "/admin/settings/semester-config", icon: CalendarClock },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const nav = (
    <nav ref={navRef} className="flex-1 space-y-6 overflow-y-auto p-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
      {/* Mobile overlay */}
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
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold leading-tight">
            Quiz &amp; Attendance
            <br />
            Admin Panel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
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
