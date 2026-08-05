"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDateTime, format } from "@/lib/format-date";
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

interface FacultyUser {
  roll: string;
  name: string;
  email: string;
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface FacultyQuiz {
  id: number;
  title: string;
  status: "draft" | "scheduled" | "live" | "completed";
  startTime: string;
  endTime: string;
  totalMarks: number;
  course: { name: string; code: string };
  section: { name: string } | null;
  building: { name: string };
  _count: { questions: number; allotments: number };
}

interface AttendanceRow {
  id: number;
  studentRoll: string;
  studentName: string;
  status: "present" | "absent";
  date: string;
  course: { name: string; code: string };
  quiz: { title: string };
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "warning",
  live: "success",
  completed: "outline",
  present: "success",
  absent: "destructive",
};

const fetcher = (url: string) => apiClient.get<ListResponse<unknown>>(url);

export function FacultyDashboard({ user }: { user: FacultyUser }) {
  const router = useRouter();
  const [quizPage, setQuizPage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);

  const { data: quizData, isLoading: quizLoading } = useSWR(
    `/api/faculty/quizzes?page=${quizPage}&pageSize=10`,
    fetcher
  );
  const { data: attendanceData, isLoading: attendanceLoading } = useSWR(
    `/api/faculty/attendance?page=${attendancePage}&pageSize=10`,
    fetcher
  );

  const quizzes = (quizData?.items ?? []) as FacultyQuiz[];
  const attendance = (attendanceData?.items ?? []) as AttendanceRow[];

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

  const quizColumns: DataTableColumn<FacultyQuiz>[] = [
    { key: "title", header: "Quiz", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "section", header: "Section", render: (r) => r.section?.name ?? "—" },
    { key: "building", header: "Building", render: (r) => r.building.name },
    { key: "startTime", header: "Start", render: (r) => formatDateTime(r.startTime) },
    { key: "questions", header: "Questions", render: (r) => r._count.questions },
    { key: "allotted", header: "Allotted", render: (r) => r._count.allotments },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
    },
  ];

  const attendanceColumns: DataTableColumn<AttendanceRow>[] = [
    { key: "student", header: "Student", render: (r) => `${r.studentName} (${r.studentRoll})` },
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "quiz", header: "Quiz", render: (r) => r.quiz.title },
    { key: "date", header: "Date", render: (r) => format(r.date) },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
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
      </Card>

      <Tabs defaultValue="quizzes">
        <TabsList>
          <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="quizzes" className="space-y-3">
          <DataTable
            columns={quizColumns}
            rows={quizzes}
            rowKey={(r) => r.id}
            loading={quizLoading}
            emptyMessage="You haven't created any quizzes yet."
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
        <TabsContent value="attendance" className="space-y-3">
          <DataTable
            columns={attendanceColumns}
            rows={attendance}
            rowKey={(r) => r.id}
            loading={attendanceLoading}
            emptyMessage="No attendance records yet."
          />
          {attendanceData?.meta && (
            <PaginationBar
              page={attendanceData.meta.page}
              totalPages={attendanceData.meta.totalPages}
              total={attendanceData.meta.total}
              pageSize={attendanceData.meta.pageSize}
              onPageChange={setAttendancePage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
