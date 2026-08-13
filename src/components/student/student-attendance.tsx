"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, todayInputValue } from "@/lib/format-date";
import { apiClient, downloadFile } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { FileSpreadsheet, FileText } from "lucide-react";

interface AttendanceRow {
  id: number;
  status: "present" | "absent";
  date: string;
  course: { name: string; code: string };
  quiz: { title: string; sections: { section: { id: number; name: string } }[] };
}

interface FilterOption {
  id: number;
  name: string;
  code?: string;
}

interface AttendanceResponse {
  items: AttendanceRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
  summary: { total: number; present: number; percent: number | null };
  filterOptions: { courses: FilterOption[]; sections: FilterOption[] };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  present: "success",
  absent: "destructive",
};

export function StudentAttendance() {
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(todayInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const buildParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (courseId !== "all") params.set("courseId", courseId);
    if (sectionId !== "all") params.set("sectionId", sectionId);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("sortOrder", sortOrder);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  const { data, isLoading } = useSWR(`/api/student/attendance?${buildParams().toString()}`, (url: string) =>
    apiClient.get<AttendanceResponse>(url)
  );
  const attendance = data?.items ?? [];
  const filterOptions = data?.filterOptions ?? { courses: [], sections: [] };

  const handleExport = (type: "excel" | "pdf") => {
    const params = buildParams({ export: type });
    downloadFile(`/api/student/attendance?${params.toString()}`, `my-attendance.${type === "excel" ? "xlsx" : "pdf"}`);
  };

  const clearFilters = () => {
    setCourseId("all");
    setSectionId("all");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const columns: DataTableColumn<AttendanceRow>[] = [
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    {
      key: "section",
      header: "Section",
      render: (r) => r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
    },
    { key: "quiz", header: "Quiz", render: (r) => r.quiz.title },
    { key: "date", header: "Date", render: (r) => format(r.date) },
    { key: "status", header: "Status", render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Auto-marked whenever you submit a quiz. Showing today by default.</p>
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

      {data?.summary && (
        <Card>
          <CardContent className="flex items-center gap-8 py-4 text-sm">
            <div>
              <p className="text-muted-foreground">Attendance (filtered)</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <SearchableSelect
              value={courseId}
              onValueChange={(v) => { setCourseId(v); setSectionId("all"); setPage(1); }}
              options={[
                { value: "all", label: "All courses" },
                ...filterOptions.courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
              ]}
              searchPlaceholder="Search courses..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <SearchableSelect
              value={sectionId}
              onValueChange={(v) => { setSectionId(v); setPage(1); }}
              options={[
                { value: "all", label: "All sections" },
                ...filterOptions.sections.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
              searchPlaceholder="Search sections..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quiz search</Label>
            <Input placeholder="Search quiz title" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Sort by date</Label>
            <SearchableSelect
              value={sortOrder}
              onValueChange={(v) => { setSortOrder(v as "asc" | "desc"); setPage(1); }}
              options={[
                { value: "desc", label: "Newest first" },
                { value: "asc", label: "Oldest first" },
              ]}
              searchPlaceholder="Search..."
            />
          </div>
          <div className="sm:col-span-5">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters (show all-time)
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} rows={attendance} rowKey={(r) => r.id} loading={isLoading} emptyMessage="No attendance records for this filter." />
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
