"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, formatDateTime } from "@/lib/format-date";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";

interface StudentUser {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface StudentQuiz {
  id: number;
  title: string;
  status: "draft" | "scheduled" | "live" | "completed";
  startTime: string;
  endTime: string;
  totalMarks: number;
  myAllotmentStatus: "allotted" | "attempted" | "absent";
  course: { name: string; code: string };
  section: { name: string } | null;
  faculty: { name: string };
}

interface StudentResult {
  id: number;
  marksObtained: number;
  percentage: number;
  publishedAt: string | null;
  quiz: { id: number; title: string; totalMarks: number; course: { name: string; code: string } };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "warning",
  live: "success",
  completed: "outline",
  allotted: "secondary",
  attempted: "success",
  absent: "destructive",
};

const fetcher = (url: string) => apiClient.get<ListResponse<unknown>>(url);

export function StudentDashboard({ user }: { user: StudentUser }) {
  const router = useRouter();
  const [quizPage, setQuizPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);

  const { data: quizData, isLoading: quizLoading } = useSWR(
    `/api/student/quizzes?page=${quizPage}&pageSize=10`,
    fetcher
  );
  const { data: resultData, isLoading: resultLoading } = useSWR(
    `/api/student/results?page=${resultPage}&pageSize=10`,
    fetcher
  );

  const quizzes = (quizData?.items ?? []) as StudentQuiz[];
  const results = (resultData?.items ?? []) as StudentResult[];

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // ignore - cookies are cleared server-side regardless
    } finally {
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    }
  };

  const quizColumns: DataTableColumn<StudentQuiz>[] = [
    { key: "title", header: "Quiz", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "section", header: "Section", render: (r) => r.section?.name ?? "—" },
    { key: "faculty", header: "Faculty", render: (r) => r.faculty.name },
    {
      key: "startTime",
      header: "Start",
      render: (r) => formatDateTime(r.startTime),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
    },
    {
      key: "myAllotmentStatus",
      header: "My Status",
      render: (r) => <Badge variant={statusVariant[r.myAllotmentStatus]}>{r.myAllotmentStatus}</Badge>,
    },
  ];

  const resultColumns: DataTableColumn<StudentResult>[] = [
    { key: "title", header: "Quiz", render: (r) => <span className="font-medium">{r.quiz.title}</span> },
    { key: "course", header: "Course", render: (r) => `${r.quiz.course.name} (${r.quiz.course.code})` },
    { key: "marks", header: "Marks", render: (r) => `${r.marksObtained} / ${r.quiz.totalMarks}` },
    { key: "percentage", header: "Percentage", render: (r) => `${r.percentage.toFixed(2)}%` },
    {
      key: "publishedAt",
      header: "Published",
      render: (r) => (r.publishedAt ? format(r.publishedAt) : "—"),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user.email} · Roll: {user.roll}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Major</dt>
              <dd className="font-medium">{user.major || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Batch</dt>
              <dd className="font-medium">{user.batch || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current Semester</dt>
              <dd className="font-medium">{user.semNow || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="quizzes">
        <TabsList>
          <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
          <TabsTrigger value="results">My Results</TabsTrigger>
        </TabsList>
        <TabsContent value="quizzes" className="space-y-3">
          <DataTable
            columns={quizColumns}
            rows={quizzes}
            rowKey={(r) => r.id}
            loading={quizLoading}
            emptyMessage="No quizzes allotted yet."
          />
          {quizData?.meta && (
            <PaginationBar
              page={quizData.meta.page}
              totalPages={quizData.meta.totalPages}
              total={quizData.meta.total}
              pageSize={quizData.meta.pageSize}
              onPageChange={setQuizPage}
            />
          )}
        </TabsContent>
        <TabsContent value="results" className="space-y-3">
          <DataTable
            columns={resultColumns}
            rows={results}
            rowKey={(r) => r.id}
            loading={resultLoading}
            emptyMessage="No results published yet."
          />
          {resultData?.meta && (
            <PaginationBar
              page={resultData.meta.page}
              totalPages={resultData.meta.totalPages}
              total={resultData.meta.total}
              pageSize={resultData.meta.pageSize}
              onPageChange={setResultPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
