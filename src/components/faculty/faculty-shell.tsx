"use client";

import { PortalShell } from "@/components/shell/portal-shell";
import { FACULTY_NAV_GROUPS } from "@/components/faculty/faculty-nav";

interface FacultyShellProps {
  name: string;
  email: string;
  children: React.ReactNode;
}

export function FacultyShell({ name, email, children }: FacultyShellProps) {
  return (
    <PortalShell
      name={name}
      email={email}
      roleLabel="Faculty"
      brandLines={["Quiz & Attendance", "Faculty Portal"]}
      navGroups={FACULTY_NAV_GROUPS}
    >
      {children}
    </PortalShell>
  );
}
