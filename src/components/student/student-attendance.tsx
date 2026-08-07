"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "@/lib/format-date";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";

interface AttendanceRow {
  id: number;
  status: "present" | "absent";
  date: string;
  course: { name: string; code: string };
  quiz: { title: string };
}

interface AttendanceResponse {
  items: AttendanceRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
  summary: { total: number; present: number; percent: number | null };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  present: "success",
  absent: "destructive",
};

export function StudentAttendance() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(`/api/student/attendance?page=${page}&pageSize=10`, (url: string) =>
    apiClient.get<AttendanceResponse>(url)
  );
  const attendance = data?.items ?? [];

  const columns: DataTableColumn<AttendanceRow>[] = [
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "quiz", header: "Quiz", render: (r) => r.quiz.title },
    { key: "date", header: "Date", render: (r) => format(r.date) },
    { key: "status", header: "Status", render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Auto-marked whenever you submit a quiz.</p>
      </div>

      {data?.summary && (
        <Card>
          <CardContent className="flex items-center gap-8 py-4 text-sm">
            <div>
              <p className="text-muted-foreground">Overall attendance</p>
              <p className="text-2xl font-bold">{data.summary.percent === null ? "—" : `${data.summary.percent}%`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Present</p>
              <p className="text-lg font-semibold">{data.summary.present}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total sessions</p>
              <p className="text-lg font-semibold">{data.summary.total}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
