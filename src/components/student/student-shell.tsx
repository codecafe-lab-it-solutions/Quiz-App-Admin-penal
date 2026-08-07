"use client";

import { PortalShell } from "@/components/shell/portal-shell";
import { STUDENT_NAV_GROUPS } from "@/components/student/student-nav";

interface StudentShellProps {
  name: string;
  email: string;
  children: React.ReactNode;
}

export function StudentShell({ name, email, children }: StudentShellProps) {
  return (
    <PortalShell
      name={name}
      email={email}
      roleLabel="Student"
      brandLines={["Quiz & Attendance", "Student Portal"]}
      navGroups={STUDENT_NAV_GROUPS}
    >
      {children}
    </PortalShell>
  );
}
