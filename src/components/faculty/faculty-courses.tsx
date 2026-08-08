"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { Users } from "lucide-react";

interface FacultyCourse {
  subCode: string;
  title: string | null;
  branch: string | null;
  credits: number | null;
  facRoll: string;
  facultyName: string | null;
  sections: { id: number; name: string }[];
}

interface RosterRow {
  roll: string;
  name: string;
  attendancePercent: number | null;
  lastScore: number | null;
}

export function FacultyCourses() {
  const [rosterCourse, setRosterCourse] = useState<FacultyCourse | null>(null);

  const { data: coursesData, isLoading: coursesLoading } = useSWR(`/api/faculty/courses`, (url: string) =>
    apiClient.get<{ items: FacultyCourse[] }>(url)
  );
  const { data: rosterData, isLoading: rosterLoading } = useSWR(
    rosterCourse ? `/api/faculty/courses/${encodeURIComponent(rosterCourse.subCode)}/students` : null,
    (url: string) => apiClient.get<{ items: RosterRow[] }>(url)
  );

  const courses = coursesData?.items ?? [];
  const roster = rosterData?.items ?? [];

  const courseColumns: DataTableColumn<FacultyCourse>[] = [
    { key: "subCode", header: "Code", render: (r) => <span className="font-medium">{r.subCode}</span> },
    { key: "title", header: "Course Name", render: (r) => r.title ?? "—" },
    { key: "section", header: "Section", render: (r) => r.sections.map((s) => s.name).join(", ") || "—" },
    { key: "credits", header: "Credits", render: (r) => r.credits ?? "—" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button variant="outline" size="sm" onClick={() => setRosterCourse(r)}>
          <Users className="mr-2 h-4 w-4" />
          View Students
        </Button>
      ),
    },
  ];

  const rosterColumns: DataTableColumn<RosterRow>[] = [
    { key: "roll", header: "Roll", render: (r) => r.roll },
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "attendance", header: "Attendance", render: (r) => (r.attendancePercent === null ? "—" : `${r.attendancePercent}%`) },
    { key: "lastScore", header: "Last Score", render: (r) => (r.lastScore === null ? "—" : r.lastScore) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="text-sm text-muted-foreground">Real course list for the current semester cycle, sourced live from the university system.</p>
      </div>

      <DataTable
        columns={courseColumns}
        rows={courses}
        rowKey={(r) => r.subCode}
        loading={coursesLoading}
        emptyMessage="You aren't mapped to any courses for the current semester cycle."
      />

      <Dialog open={rosterCourse !== null} onOpenChange={(open) => !open && setRosterCourse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {rosterCourse ? `${rosterCourse.title ?? rosterCourse.subCode} (${rosterCourse.subCode})` : "Students"}
            </DialogTitle>
          </DialogHeader>
          <DataTable
            columns={rosterColumns}
            rows={roster}
            rowKey={(r) => r.roll}
            loading={rosterLoading}
            emptyMessage="No students registered for this course yet."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
