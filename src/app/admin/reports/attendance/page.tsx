"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { downloadFile } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "@/lib/format-date";
import { FileSpreadsheet, FileText } from "lucide-react";

interface Course {
  id: number;
  name: string;
  code: string;
}
interface Section {
  id: number;
  name: string;
  courseId: number;
}
interface AttendanceRow {
  id: number;
  date: string;
  status: "present" | "absent";
  studentRoll: string;
  studentName: string;
  course: { id: number; name: string; code: string };
  quiz: {
    id: number;
    title: string;
    sections: { section: { id: number; name: string } }[];
  };
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const listFetcher = <T,>(url: string) => apiClient.get<{ items: T[] }>(url);
const fetcher = (url: string) =>
  apiClient.get<ListResponse<AttendanceRow>>(url);

export default function AttendanceReportPage() {
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string>("all");
  const [sectionId, setSectionId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: courseData } = useSWR(
    "/api/admin/courses?pageSize=200",
    listFetcher<Course>,
  );
  const { data: sectionData } = useSWR(
    courseId !== "all"
      ? `/api/admin/sections?pageSize=200&courseId=${courseId}`
      : "/api/admin/sections?pageSize=200",
    listFetcher<Section>,
  );

  const buildParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (courseId !== "all") params.set("courseId", courseId);
    if (sectionId !== "all") params.set("sectionId", sectionId);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  const { data, isLoading } = useSWR(
    `/api/admin/reports/attendance?${buildParams().toString()}`,
    fetcher,
  );

  const handleExport = (type: "excel" | "pdf") => {
    const params = buildParams({ export: type });
    downloadFile(
      `/api/admin/reports/attendance?${params.toString()}`,
      `attendance-report.${type === "excel" ? "xlsx" : "pdf"}`,
    );
  };

  const columns: DataTableColumn<AttendanceRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => `${r.studentName} (${r.studentRoll})`,
    },
    {
      key: "course",
      header: "Course",
      render: (r) => `${r.course.name} (${r.course.code})`,
    },
    {
      key: "section",
      header: "Section",
      render: (r) =>
        r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
    },
    { key: "quiz", header: "Quiz", render: (r) => r.quiz.title },
    { key: "date", header: "Date", render: (r) => format(r.date) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.status === "present" ? "success" : "destructive"}>
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Course-wise Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter and export attendance records.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setSectionId("all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courseData?.items.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select
              value={sectionId}
              onValueChange={(v) => {
                setSectionId(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sectionData?.items.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Search</Label>
            <Input
              placeholder="Roll / quiz"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
      />

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
