"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { apiClient, downloadFile } from "@/lib/api-client";
import { dedupeByCourseCode, hasRealTitle } from "@/lib/course-catalog";
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
import { ArrowRight, FileSpreadsheet, FileText } from "lucide-react";

interface CourseCatalogEntry {
  subCode: string;
  title: string | null;
  courseId: number | null;
  sections: { id: number; name: string }[];
}
interface Section {
  id: number;
  name: string;
}
interface ResultRow {
  id: number;
  studentRoll: string;
  studentName: string;
  marksObtained: number;
  percentage: number;
  status: "pending" | "declared" | "published";
  publishedAt: string | null;
  quiz: {
    id: number;
    title: string;
    totalMarks: number;
    course: { id: number; name: string; code: string };
    sections: { section: { id: number; name: string } }[];
  };
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  declared: "warning",
  published: "success",
};

const fetcher = (url: string) => apiClient.get<ListResponse<ResultRow>>(url);

export function FacultyResults() {
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string>("all");
  const [sectionId, setSectionId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: courseData } = useSWR("/api/faculty/courses", (url) =>
    apiClient.get<{ items: CourseCatalogEntry[] }>(url),
  );
  const { data: sectionData } = useSWR(
    courseId !== "all" ? `/api/faculty/sections?courseId=${courseId}` : "/api/faculty/sections",
    (url: string) => apiClient.get<{ items: Section[] }>(url),
  );

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (courseId !== "all") params.set("courseId", courseId);
    if (sectionId !== "all") params.set("sectionId", sectionId);
    if (status !== "all") params.set("resultStatus", status);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("sortOrder", sortOrder);
    return params;
  };

  const { data, isLoading } = useSWR(
    `/api/faculty/reports/results?${buildParams().toString()}`,
    fetcher,
  );

  const handleExport = (type: "excel" | "pdf") => {
    const params = buildParams();
    params.set("export", type);
    downloadFile(
      `/api/faculty/reports/results?${params.toString()}`,
      `results-report.${type === "excel" ? "xlsx" : "pdf"}`,
    );
  };

  const courses = dedupeByCourseCode(
    (courseData?.items ?? []).filter((c) => c.courseId !== null && hasRealTitle(c)),
  );

  const columns: DataTableColumn<ResultRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => `${row.studentName} (${row.studentRoll})`,
    },
    {
      key: "course",
      header: "Course",
      render: (row) => `${row.quiz.course.name} (${row.quiz.course.code})`,
    },
    {
      key: "section",
      header: "Section",
      render: (row) => row.quiz.sections.map((s) => s.section.name).join(", ") || "—",
    },
    { key: "quiz", header: "Quiz", render: (row) => row.quiz.title },
    {
      key: "marks",
      header: "Marks",
      render: (row) => `${row.marksObtained.toFixed(0)} / ${row.quiz.totalMarks}`,
    },
    {
      key: "percentage",
      header: "%",
      render: (row) => `${row.percentage.toFixed(2)}%`,
    },
    {
      key: "status",
      header: "Result",
      render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
    },
    {
      key: "publishedAt",
      header: "Published",
      render: (row) => (row.publishedAt ? format(row.publishedAt) : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/faculty/results/${row.quiz.id}/${encodeURIComponent(row.studentRoll)}`}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            View Answer Sheet
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results</h1>
          <p className="text-sm text-muted-foreground">
            Filter result records across your quizzes and open a student&apos;s full answer sheet against the answer key.
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
              onValueChange={(value) => {
                setCourseId(value);
                setSectionId("all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.courseId} value={String(course.courseId)}>
                    {course.title ?? course.subCode} ({course.subCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select
              value={sectionId}
              onValueChange={(value) => {
                setSectionId(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sectionData?.items.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Result status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Student / quiz</Label>
            <Input
              placeholder="Search roll or quiz title"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sort by published date</Label>
            <Select value={sortOrder} onValueChange={(value) => { setSortOrder(value as "asc" | "desc"); setPage(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(row) => row.id} loading={isLoading} />

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
