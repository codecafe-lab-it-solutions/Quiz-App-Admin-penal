import { LayoutDashboard, FileBarChart, Award } from "lucide-react";
import type { NavGroup } from "@/components/shell/nav-sidebar";

export const STUDENT_NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "My Tests", href: "/student", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Reports",
    items: [
      { label: "Attendance", href: "/student/attendance", icon: FileBarChart },
      { label: "Results", href: "/student/results", icon: Award },
    ],
  },
];
