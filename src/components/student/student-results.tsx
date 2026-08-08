"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "@/lib/format-date";
import { apiClient } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";

interface StudentResult {
  id: number;
  marksObtained: number;
  percentage: number;
  publishedAt: string | null;
  quiz: {
    id: number;
    title: string;
    totalMarks: number;
    course: { name: string; code: string };
    sections: { section: { id: number; name: string } }[];
  };
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export function StudentResults() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(`/api/student/results?page=${page}&pageSize=10`, (url: string) =>
    apiClient.get<ListResponse<StudentResult>>(url)
  );
  const results = data?.items ?? [];

  const columns: DataTableColumn<StudentResult>[] = [
    { key: "title", header: "Quiz", render: (r) => <span className="font-medium">{r.quiz.title}</span> },
    { key: "course", header: "Course", render: (r) => `${r.quiz.course.name} (${r.quiz.course.code})` },
    {
      key: "section",
      header: "Section",
      render: (r) => r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
    },
    { key: "marks", header: "Marks", render: (r) => `${r.marksObtained} / ${r.quiz.totalMarks}` },
    { key: "percentage", header: "Percentage", render: (r) => `${r.percentage.toFixed(2)}%` },
    { key: "publishedAt", header: "Published", render: (r) => (r.publishedAt ? format(r.publishedAt) : "—") },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Results</h1>
        <p className="text-sm text-muted-foreground">Published results only - a declared-but-unpublished result won't show here yet.</p>
      </div>

      <DataTable columns={columns} rows={results} rowKey={(r) => r.id} loading={isLoading} emptyMessage="No results published yet." />
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
