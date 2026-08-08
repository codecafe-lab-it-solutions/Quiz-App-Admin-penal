"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
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
import { ArrowRight } from "lucide-react";

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
interface AnswerSheetQuestion {
  id: number;
  questionText: string;
  questionType: string;
  marks: number;
  options?: { id: number; optionText: string; isCorrect: boolean }[];
  correctValue?: number | null;
  tolerance?: number | null;
  referenceAnswer?: string | null;
  yourAnswer: {
    selectedOptionId: number | null;
    answerValue: number | null;
    writtenAnswer: string | null;
    isSkipped: boolean;
  };
  isCorrect: boolean | null;
  marksObtained: number;
}
interface AnswerSheetDetail {
  quizTitle: string;
  studentName: string;
  studentRoll: string;
  totalMarks: number;
  marksObtained: number;
  questions: AnswerSheetQuestion[];
}

function correctAnswerLabel(q: AnswerSheetQuestion): string {
  if (q.questionType === "mcq") {
    const correct = q.options?.find((o) => o.isCorrect);
    return correct
      ? correct.optionText.replace(/<[^>]+>/g, "").trim()
      : "No correct option";
  }
  if (q.questionType === "formula") {
    return `${q.correctValue ?? 0} ± ${q.tolerance ?? 0}`;
  }
  return q.referenceAnswer?.trim() || "Subjective response";
}

function studentAnswerLabel(q: AnswerSheetQuestion): string {
  if (q.yourAnswer.isSkipped) return "Not attempted";
  if (q.questionType === "mcq") {
    const chosen = q.options?.find(
      (o) => o.id === q.yourAnswer.selectedOptionId,
    );
    return chosen ? chosen.optionText.replace(/<[^>]+>/g, "").trim() : "—";
  }
  if (q.questionType === "formula") {
    return q.yourAnswer.answerValue !== null
      ? String(q.yourAnswer.answerValue)
      : "—";
  }
  return q.yourAnswer.writtenAnswer?.trim() || "—";
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline"
> = {
  pending: "secondary",
  declared: "warning",
  published: "success",
};

const fetcher = (url: string) => apiClient.get<ListResponse<ResultRow>>(url);
const fetchAnswerSheet = (url: string) => apiClient.get<AnswerSheetDetail>(url);

export default function AdminResultsPage() {
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string>("all");
  const [sectionId, setSectionId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedResult, setSelectedResult] = useState<{
    quizId: number;
    roll: string;
  } | null>(null);

  const { data: courseData } = useSWR(
    "/api/admin/courses?pageSize=200",
    (url) => apiClient.get<{ items: Course[] }>(url),
  );
  const { data: sectionData } = useSWR(
    courseId !== "all"
      ? `/api/admin/sections?pageSize=200&courseId=${courseId}`
      : "/api/admin/sections?pageSize=200",
    (url: string) => apiClient.get<{ items: Section[] }>(url),
  );

  const buildParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (courseId !== "all") params.set("courseId", courseId);
    if (sectionId !== "all") params.set("sectionId", sectionId);
    if (status !== "all") params.set("resultStatus", status);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  const { data, isLoading } = useSWR(
    `/api/admin/reports/results?${buildParams().toString()}`,
    fetcher,
  );

  const { data: answerSheet, isLoading: answerSheetLoading } = useSWR(
    selectedResult
      ? `/api/faculty/quiz/${selectedResult.quizId}/results/${selectedResult.roll}`
      : null,
    fetchAnswerSheet,
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
      render: (row) =>
        row.quiz.sections.map((s) => s.section.name).join(", ") || "—",
    },
    { key: "quiz", header: "Quiz", render: (row) => row.quiz.title },
    {
      key: "marks",
      header: "Marks",
      render: (row) =>
        `${row.marksObtained.toFixed(0)} / ${row.quiz.totalMarks}`,
    },
    {
      key: "percentage",
      header: "%",
      render: (row) => `${row.percentage.toFixed(2)}%`,
    },
    {
      key: "status",
      header: "Result",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
      ),
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
        <Button
          variant={
            selectedResult?.quizId === row.quiz.id &&
            selectedResult.roll === row.studentRoll
              ? "secondary"
              : "outline"
          }
          size="sm"
          onClick={() =>
            setSelectedResult({ quizId: row.quiz.id, roll: row.studentRoll })
          }
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          View Answer Sheet
        </Button>
      ),
    },
  ];

  const answerSheetColumns: DataTableColumn<AnswerSheetQuestion>[] = [
    {
      key: "question",
      header: "Question",
      render: (row) => (
        <div className="max-w-md whitespace-pre-wrap">{row.questionText}</div>
      ),
    },
    { key: "type", header: "Type", render: (row) => row.questionType },
    {
      key: "yourAnswer",
      header: "Student answer",
      render: (row) => (
        <span className="whitespace-pre-wrap text-sm">
          {studentAnswerLabel(row)}
        </span>
      ),
    },
    {
      key: "correctAnswer",
      header: "Correct answer",
      render: (row) => (
        <span className="whitespace-pre-wrap text-sm">
          {correctAnswerLabel(row)}
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      render: (row) =>
        row.yourAnswer.isSkipped ? (
          <Badge variant="secondary">Skipped</Badge>
        ) : row.isCorrect === null ? (
          <Badge variant="outline">Ungraded</Badge>
        ) : row.isCorrect ? (
          <Badge variant="success">Correct</Badge>
        ) : (
          <Badge variant="destructive">Wrong</Badge>
        ),
    },
    {
      key: "marks",
      header: "Marks",
      render: (row) => `${row.marksObtained.toFixed(1)} / ${row.marks}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
        <p className="text-sm text-muted-foreground">
          Filter result records and open a student&apos;s full answer sheet
          against the answer key.
        </p>
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
                {courseData?.items.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.name} ({course.code})
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
                <SelectItem value="declared">Declared</SelectItem>
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
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
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

      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {answerSheet
                ? `Answer sheet — ${answerSheet.studentName} (${answerSheet.studentRoll}) — ${answerSheet.quizTitle}`
                : "Answer sheet"}
            </CardTitle>
            {answerSheet && (
              <p className="text-sm text-muted-foreground">
                Total: {answerSheet.marksObtained.toFixed(1)} /{" "}
                {answerSheet.totalMarks}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              columns={answerSheetColumns}
              rows={answerSheet?.questions ?? []}
              rowKey={(row) => row.id}
              loading={answerSheetLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
