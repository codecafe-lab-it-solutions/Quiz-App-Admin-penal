"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "@/lib/format-date";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";

interface AttendanceRow {
  id: number;
  studentRoll: string;
  studentName: string;
  status: "present" | "absent";
  date: string;
  course: { name: string; code: string };
  quiz: { title: string };
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  present: "success",
  absent: "destructive",
};

export function FacultyAttendance() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(`/api/faculty/attendance?page=${page}&pageSize=10`, (url: string) =>
    apiClient.get<ListResponse<AttendanceRow>>(url)
  );
  const attendance = data?.items ?? [];

  const columns: DataTableColumn<AttendanceRow>[] = [
    { key: "student", header: "Student", render: (r) => `${r.studentName} (${r.studentRoll})` },
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "quiz", header: "Quiz", render: (r) => r.quiz.title },
    { key: "date", header: "Date", render: (r) => format(r.date) },
    { key: "status", header: "Status", render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Auto-marked from quiz submissions across every course you teach.</p>
      </div>

      <DataTable columns={columns} rows={attendance} rowKey={(r) => r.id} loading={isLoading} emptyMessage="No attendance records yet." />
      {data?.meta && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
