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
  FileText,
  ShieldCheck,
  CalendarClock,
  ClipboardList,
} from "lucide-react";
import type { NavGroup } from "@/components/shell/nav-sidebar";

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Faculty", href: "/admin/faculty", icon: GraduationCap },
      { label: "Students", href: "/admin/students", icon: Users },
    ],
  },
  {
    title: "Tests",
    items: [{ label: "Tests", href: "/admin/tests", icon: ClipboardList }],
  },
  {
    title: "Mapping",
    items: [
      {
        label: "Faculty ↔ Course/Section",
        href: "/admin/mapping/faculty-course-section",
        icon: Link2,
      },
      {
        label: "Student ↔ Course",
        href: "/admin/mapping/student-course-section",
        icon: Link2,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Courses", href: "/admin/master-data/courses", icon: BookOpen },
      {
        label: "Sessions",
        href: "/admin/master-data/sessions",
        icon: CalendarRange,
      },
      {
        label: "Sections",
        href: "/admin/master-data/sections",
        icon: LayoutGrid,
      },
      {
        label: "Buildings",
        href: "/admin/master-data/buildings",
        icon: MapPin,
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Live Tracking",
        href: "/admin/reports/live-tracking",
        icon: Radio,
      },
      {
        label: "Attendance",
        href: "/admin/reports/attendance",
        icon: FileBarChart,
      },
      {
        label: "Results",
        href: "/admin/reports/results",
        icon: FileText,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Admin Users",
        href: "/admin/settings/admin-users",
        icon: ShieldCheck,
      },
      {
        label: "Semester Config",
        href: "/admin/settings/semester-config",
        icon: CalendarClock,
      },
    ],
  },
];
