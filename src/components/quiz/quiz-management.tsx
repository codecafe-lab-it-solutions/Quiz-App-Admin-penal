"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError, downloadFile } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  QuestionEditorDialog,
  QuestionRow,
} from "@/components/quiz/question-editor-dialog";
import { RichTextDisplay } from "@/components/quiz/rich-text-display";
import { Copy, Pencil, Play, Plus, Square, Trash2, Upload } from "lucide-react";

interface QuizDetail {
  id: number;
  title: string;
  status: "draft" | "scheduled" | "live" | "completed";
  startTime: string;
  endTime: string;
  totalMarks: number;
  randomize: boolean;
  negativeMarking: boolean;
  course: { id: number; name: string; code: string };
  sections: { section: { id: number; name: string } }[];
  building: { name: string };
  questions: (QuestionRow & { id: number })[];
  _count: { allotments: number };
}

interface AttemptEntry {
  student: { roll: string; name: string };
  allotmentStatus: "allotted" | "attempted" | "absent";
  isProxy: boolean;
  attempt: {
    status: "in_progress" | "submitted" | "auto_submitted";
    startTime: string;
    endTime: string | null;
    autoSubmitted: boolean;
  } | null;
}

interface AttemptsResponse {
  totalAllotted: number;
  attemptedCount: number;
  notAttemptedCount: number;
  attempted: AttemptEntry[];
  notAttempted: AttemptEntry[];
}

interface SubjectiveAnswer {
  answerId: number;
  questionText: string;
  referenceAnswer: string | null;
  maxMarks: number;
  studentRoll: string;
  studentName: string;
  writtenAnswer: string | null;
  isSkipped: boolean;
  manuallyGraded: boolean;
  marksAwarded: number;
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  draft: "secondary",
  scheduled: "warning",
  live: "success",
  completed: "outline",
};

const typeLabel: Record<string, string> = {
  mcq: "MCQ",
  formula: "Formula",
  subjective: "Subjective",
};
const typeVariant: Record<string, "default" | "secondary" | "outline"> = {
  mcq: "default",
  formula: "secondary",
  subjective: "outline",
};

const fetcher = <T,>(url: string) => apiClient.get<T>(url);

export function QuizManagement({
  quizId,
  role,
}: {
  quizId: number;
  role: "faculty" | "admin";
}) {
  const router = useRouter();
  const basePath = role === "faculty" ? "/faculty/quizzes" : "/admin/tests";
  const listPath = role === "faculty" ? "/faculty/quizzes" : "/admin/tests";
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(
    null,
  );
  const [checkedRolls, setCheckedRolls] = useState<Set<string> | null>(null);
  const [allotting, setAllotting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: quiz,
    isLoading,
    mutate,
  } = useSWR(`/api/faculty/quiz/${quizId}`, (url: string) =>
    fetcher<QuizDetail>(url),
  );
  const { data: subjectiveData, mutate: mutateSubjective } = useSWR(
    quiz?.status === "completed"
      ? `/api/faculty/quiz/${quizId}/subjective-answers`
      : null,
    (url: string) =>
      fetcher<{ items: SubjectiveAnswer[]; ungradedCount: number }>(url),
  );
  const { data: resultsData } = useSWR(
    quiz?.status === "completed" ? `/api/faculty/quiz/${quizId}/results` : null,
    (url: string) =>
      fetcher<{
        quiz: {
          id: number;
          title: string;
          totalMarks: number;
          status: string;
          course: { name: string; code: string };
          building: { name: string };
        };
        summary: {
          totalAllotted: number;
          attemptedCount: number;
          submittedCount: number;
          notAttemptedCount: number;
          absentCount: number;
          declaredCount: number;
          publishedCount: number;
          ungradedCount: number;
        };
        questionBreakdown: Array<{
          id: number;
          questionText: string;
          questionType: string;
          marks: number;
          answerKey: string;
          attemptedCount: number;
          correctCount: number;
          wrongCount: number;
          skippedCount: number;
        }>;
        studentResults: Array<{
          roll: string;
          name: string;
          attendanceStatus: string;
          attemptStatus: string | null;
          marksObtained: number;
          percentage: number;
          resultStatus: string;
        }>;
      }>(url),
  );
  const { data: candidatesData, mutate: mutateCandidates } = useSWR(
    `/api/faculty/quiz/${quizId}/allot/candidates`,
    (url: string) =>
      fetcher<{ items: { roll: string; name: string; allotted: boolean }[] }>(
        url,
      ),
  );
  const candidates = candidatesData?.items ?? [];
  // Default: everyone checked. Once the faculty/admin touches a box, their
  // selection takes over instead of re-defaulting on every refetch.
  const effectiveChecked =
    checkedRolls ?? new Set(candidates.map((c) => c.roll));

  // Polls only while the quiz is actually live, so submission status/proxy
  // state on screen tracks what's really happening in real time.
  const { data: attemptsData, mutate: mutateAttempts } = useSWR(
    quiz?.status === "live" ? `/api/faculty/quiz/${quizId}/attempts` : null,
    (url: string) => fetcher<AttemptsResponse>(url),
    { refreshInterval: 8000 },
  );

  if (isLoading || !quiz) {
    return <p className="text-sm text-muted-foreground">Loading quiz...</p>;
  }

  const handleStart = async () => {
    try {
      await apiClient.post(`/api/faculty/quiz/${quizId}/start`);
      toast.success("Quiz is now live");
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to start quiz",
      );
    }
  };

  const handleStop = async () => {
    try {
      await apiClient.post(`/api/faculty/quiz/${quizId}/stop`);
      toast.success("Quiz stopped");
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Failed to stop quiz",
      );
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await apiClient.post<{ id: number }>(
        `/api/faculty/quiz/${quizId}/duplicate`,
      );
      toast.success("Quiz duplicated");
      router.push(`${basePath}/${copy.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to duplicate quiz",
      );
    }
  };

  const handleDeleteQuiz = async () => {
    try {
      await apiClient.delete(`/api/faculty/quiz/${quizId}`);
      toast.success("Quiz deleted");
      router.push(listPath);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to delete quiz",
      );
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      // No single-question delete endpoint - re-post the remaining question set.
      const remaining = quiz.questions.filter((q) => q.id !== id);
      await apiClient.post(`/api/faculty/quiz/${quizId}/questions`, {
        questions: remaining.map((q) => {
          const base = {
            id: q.id,
            questionText: q.questionText,
            marks: q.marks,
            orderIndex: q.orderIndex,
          };
          if (q.questionType === "mcq") {
            return {
              ...base,
              questionType: "mcq",
              negativeMarks: q.negativeMarks,
              options: q.options,
            };
          }
          if (q.questionType === "formula") {
            return {
              ...base,
              questionType: "formula",
              negativeMarks: q.negativeMarks,
              correctValue: q.formula?.correctValue ?? 0,
              tolerance: q.formula?.tolerance ?? 0,
            };
          }
          return {
            ...base,
            questionType: "subjective",
            referenceAnswer: q.referenceAnswer ?? undefined,
          };
        }),
      });
      toast.success("Question removed");
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to remove question",
      );
    }
  };

  const toggleCandidate = (roll: string, checked: boolean) => {
    const next = new Set(effectiveChecked);
    if (checked) next.add(roll);
    else next.delete(roll);
    setCheckedRolls(next);
  };

  const handleAllot = async () => {
    const studentRolls = [...effectiveChecked];
    if (studentRolls.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    setAllotting(true);
    try {
      const result = await apiClient.post<{
        allottedCount: number;
        totalAllotted: number;
      }>(`/api/faculty/quiz/${quizId}/allot`, { studentRolls });
      toast.success(
        `Allotted ${result.allottedCount} student(s) - ${result.totalAllotted} total`,
      );
      setCheckedRolls(null);
      mutate();
      mutateCandidates();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to allot quiz",
      );
    } finally {
      setAllotting(false);
    }
  };

  const handleToggleProxy = async (roll: string, currentlyProxy: boolean) => {
    try {
      if (currentlyProxy) {
        await apiClient.delete(
          `/api/faculty/quiz/${quizId}/allotments/${encodeURIComponent(roll)}/proxy`,
        );
        toast.success(`${roll} restored to real attendance`);
      } else {
        await apiClient.post(
          `/api/faculty/quiz/${quizId}/allotments/${encodeURIComponent(roll)}/proxy`,
        );
        toast.success(`${roll} flagged as proxy - counted as absent`);
      }
      mutateAttempts();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to update proxy flag",
      );
    }
  };

  const handleImportFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    try {
      const result = await apiClient.post<{
        addedCount: number;
        skippedCount: number;
      }>(`/api/faculty/quiz/${quizId}/questions/import`, formData);
      toast.success(
        `Imported ${result.addedCount} question(s), skipped ${result.skippedCount}`,
      );
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Import failed",
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGrade = async (answerId: number, marksAwarded: number) => {
    try {
      await apiClient.patch(
        `/api/faculty/quiz/${quizId}/subjective-answers/${answerId}`,
        { marksAwarded },
      );
      toast.success("Grade saved");
      mutateSubjective();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to save grade",
      );
    }
  };

  const handleDeclareResult = async () => {
    try {
      const result = await apiClient.post<{ declaredCount: number }>(
        `/api/faculty/quiz/${quizId}/declare-result`,
      );
      toast.success(`Declared results for ${result.declaredCount} student(s)`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to declare results",
      );
    }
  };

  const handlePublishResult = async () => {
    try {
      const result = await apiClient.post<{ publishedCount: number }>(
        `/api/faculty/quiz/${quizId}/publish-result`,
      );
      toast.success(
        `Published results for ${result.publishedCount} student(s)`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to publish results",
      );
    }
  };

  const questionColumns: DataTableColumn<QuestionRow & { id: number }>[] = [
    {
      key: "questionText",
      header: "Question",
      render: (r) => (
        <RichTextDisplay
          html={r.questionText}
          className="line-clamp-2 max-w-md"
        />
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={typeVariant[r.questionType]}>
          {typeLabel[r.questionType]}
        </Badge>
      ),
    },
    { key: "marks", header: "Marks", render: (r) => r.marks },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canEditQuestions}
            onClick={() => {
              setEditingQuestion(r);
              setQuestionDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" disabled={!canEditQuestions}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Remove question?"
            description="This removes it from the quiz. This cannot be undone."
            confirmLabel="Remove"
            onConfirm={() => handleDeleteQuestion(r.id)}
          />
        </div>
      ),
    },
  ];

  const canEditQuestions =
    quiz.status === "draft" || quiz.status === "scheduled";
  const canDeleteQuiz = quiz.status !== "live" && quiz.status !== "completed";
  const allottedCount = quiz._count.allotments;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {quiz.course.name} ({quiz.course.code}) · Section:{" "}
              {quiz.sections.map((s) => s.section.name).join(", ") || "—"} ·{" "}
              {quiz.building.name} · {formatDateTime(quiz.startTime)} –{" "}
              {formatDateTime(quiz.endTime)} · {quiz.totalMarks} marks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[quiz.status]}>{quiz.status}</Badge>
            {role === "admin" &&
              (quiz.status === "draft" || quiz.status === "scheduled") && (
                <Button size="sm" onClick={handleStart}>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              )}
            {role === "admin" && quiz.status === "live" && (
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            {quiz.status !== "live" && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" disabled={!canDeleteQuiz}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Delete
                  </Button>
                }
                title="Delete this quiz?"
                description="This removes the quiz and its questions. This cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleDeleteQuiz}
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {quiz.status === "live" && (
        <LiveMonitoringCard
          data={attemptsData}
          onToggleProxy={handleToggleProxy}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Questions</CardTitle>
          {canEditQuestions && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadFile(
                    "/api/faculty/questions/import-template",
                    "question-import-template.xlsx",
                  )
                }
              >
                Download Template
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : "Bulk Import"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingQuestion(null);
                  setQuestionDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={questionColumns}
            rows={quiz.questions}
            rowKey={(r) => r.id}
            emptyMessage="No questions yet - add one or bulk import from Excel."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Allot Students ({allottedCount} allotted)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students found in this quiz&apos;s linked section(s) yet -
              check section membership under Master Data → Sections.
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {candidates.map((c) => (
                <div
                  key={c.roll}
                  className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={effectiveChecked.has(c.roll)}
                      onCheckedChange={(checked) =>
                        toggleCandidate(c.roll, checked === true)
                      }
                      id={`student-${c.roll}`}
                    />
                    <label htmlFor={`student-${c.roll}`} className="text-sm">
                      {c.name}{" "}
                      <span className="text-muted-foreground">({c.roll})</span>
                    </label>
                  </div>
                  {c.allotted && (
                    <Badge variant="secondary">already allotted</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={handleAllot}
            disabled={allotting || candidates.length === 0}
          >
            {allotting ? "Allotting..." : "Allot Quiz"}
          </Button>
        </CardContent>
      </Card>

      {quiz.status === "completed" && resultsData && (
        <ResultsReportCard data={resultsData} />
      )}

      {quiz.status === "completed" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">
              Grading{" "}
              {subjectiveData && subjectiveData.ungradedCount > 0 && (
                <Badge variant="warning" className="ml-2">
                  {subjectiveData.ungradedCount} need grading
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDeclareResult}>
                Declare Result
              </Button>
              <Button size="sm" onClick={handlePublishResult}>
                Publish Result
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(subjectiveData?.items ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No subjective answers to grade for this quiz.
              </p>
            )}
            {(subjectiveData?.items ?? []).map((a) => (
              <SubjectiveAnswerRow
                key={a.answerId}
                answer={a}
                onGrade={handleGrade}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <QuestionEditorDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        quizId={quizId}
        nextOrderIndex={quiz.questions.length}
        editing={editingQuestion}
        onSaved={mutate}
      />
    </div>
  );
}

function attemptStatusLabel(entry: AttemptEntry): string {
  if (!entry.attempt) return "Not started";
  if (entry.attempt.status === "in_progress") return "In progress";
  if (entry.attempt.status === "auto_submitted") return "Auto-submitted";
  return "Submitted";
}

function attemptStatusVariant(
  entry: AttemptEntry,
): "secondary" | "warning" | "success" {
  if (!entry.attempt) return "secondary";
  if (entry.attempt.status === "in_progress") return "warning";
  return "success";
}

function LiveMonitoringCard({
  data,
  onToggleProxy,
}: {
  data: AttemptsResponse | undefined;
  onToggleProxy: (roll: string, currentlyProxy: boolean) => void;
}) {
  const entries = [
    ...(data?.attempted ?? []),
    ...(data?.notAttempted ?? []),
  ].sort((a, b) => a.student.name.localeCompare(b.student.name));
  const inProgressCount = entries.filter(
    (e) => e.attempt?.status === "in_progress",
  ).length;
  const submittedCount = entries.filter(
    (e) =>
      e.attempt?.status === "submitted" ||
      e.attempt?.status === "auto_submitted",
  ).length;
  const notStartedCount = entries.filter((e) => !e.attempt).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Live Monitoring</CardTitle>
        <p className="text-sm text-muted-foreground">
          {notStartedCount} not started · {inProgressCount} in progress ·{" "}
          {submittedCount} submitted. Refreshes every 8 seconds.
        </p>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No students allotted to this quiz yet.
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border p-2">
            {entries.map((entry) => (
              <div
                key={entry.student.roll}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{entry.student.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({entry.student.roll})
                  </span>
                  <Badge variant={attemptStatusVariant(entry)}>
                    {attemptStatusLabel(entry)}
                  </Badge>
                  {entry.isProxy && (
                    <Badge variant="destructive">Proxy (absent)</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={entry.isProxy ? "outline" : "destructive"}
                  onClick={() =>
                    onToggleProxy(entry.student.roll, entry.isProxy)
                  }
                >
                  {entry.isProxy ? "Remove Proxy" : "Mark Proxy"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsReportCard({
  data,
}: {
  data: {
    quiz: {
      id: number;
      title: string;
      totalMarks: number;
      status: string;
      course: { name: string; code: string };
      building: { name: string };
    };
    summary: {
      totalAllotted: number;
      attemptedCount: number;
      submittedCount: number;
      notAttemptedCount: number;
      absentCount: number;
      declaredCount: number;
      publishedCount: number;
      ungradedCount: number;
    };
    questionBreakdown: Array<{
      id: number;
      questionText: string;
      questionType: string;
      marks: number;
      answerKey: string;
      attemptedCount: number;
      correctCount: number;
      wrongCount: number;
      skippedCount: number;
    }>;
    studentResults: Array<{
      roll: string;
      name: string;
      attendanceStatus: string;
      attemptStatus: string | null;
      marksObtained: number;
      percentage: number;
      resultStatus: string;
    }>;
  };
}) {
  const summaryItems = [
    { label: "Allotted", value: data.summary.totalAllotted },
    { label: "Submitted", value: data.summary.submittedCount },
    { label: "Not attempted", value: data.summary.notAttemptedCount },
    { label: "Absent", value: data.summary.absentCount },
    { label: "Declared", value: data.summary.declaredCount },
    { label: "Published", value: data.summary.publishedCount },
    { label: "Needs grading", value: data.summary.ungradedCount },
  ];

  const resultColumns: DataTableColumn<(typeof data.studentResults)[number]>[] =
    [
      {
        key: "name",
        header: "Student",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      { key: "roll", header: "Roll", render: (row) => row.roll },
      {
        key: "attendanceStatus",
        header: "Attendance",
        render: (row) => (
          <Badge variant="secondary">{row.attendanceStatus}</Badge>
        ),
      },
      {
        key: "marks",
        header: "Marks",
        render: (row) =>
          `${row.marksObtained.toFixed(0)} / ${data.quiz.totalMarks}`,
      },
      {
        key: "percentage",
        header: "%",
        render: (row) => `${row.percentage.toFixed(2)}%`,
      },
      {
        key: "resultStatus",
        header: "Result",
        render: (row) => <Badge variant="outline">{row.resultStatus}</Badge>,
      },
    ];

  const questionColumns: DataTableColumn<
    (typeof data.questionBreakdown)[number]
  >[] = [
    {
      key: "question",
      header: "Question",
      render: (row) => (
        <div className="max-w-md">
          <RichTextDisplay html={row.questionText} className="line-clamp-3" />
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant="secondary">
          {typeLabel[row.questionType] ?? row.questionType}
        </Badge>
      ),
    },
    { key: "marks", header: "Marks", render: (row) => row.marks },
    {
      key: "attempted",
      header: "Attempted",
      render: (row) => row.attemptedCount,
    },
    { key: "correct", header: "Correct", render: (row) => row.correctCount },
    { key: "wrong", header: "Wrong", render: (row) => row.wrongCount },
    { key: "skipped", header: "Skipped", render: (row) => row.skippedCount },
    {
      key: "answerKey",
      header: "Answer key",
      render: (row) => (
        <span className="max-w-xs whitespace-pre-wrap text-sm">
          {row.answerKey}
        </span>
      ),
    },
  ];

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle className="text-lg">Results & Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.quiz.course.name} ({data.quiz.course.code}) ·{" "}
          {data.quiz.building.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Question-wise breakdown</h3>
          <DataTable
            columns={questionColumns}
            rows={data.questionBreakdown}
            rowKey={(row) => row.id}
            emptyMessage="No question breakdown available yet."
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Student result summary</h3>
          <DataTable
            columns={resultColumns}
            rows={data.studentResults}
            rowKey={(row) => row.roll}
            emptyMessage="No students have results yet."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectiveAnswerRow({
  answer,
  onGrade,
}: {
  answer: SubjectiveAnswer;
  onGrade: (answerId: number, marksAwarded: number) => void;
}) {
  const [value, setValue] = useState(String(answer.marksAwarded));

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {answer.studentName} ({answer.studentRoll})
        </p>
        {answer.manuallyGraded && <Badge variant="success">Graded</Badge>}
        {answer.isSkipped && <Badge variant="secondary">Skipped</Badge>}
      </div>
      <RichTextDisplay
        html={answer.questionText}
        className="mt-1 text-muted-foreground"
      />
      <p className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-sm">
        {answer.writtenAnswer || (
          <span className="italic text-muted-foreground">
            No answer written
          </span>
        )}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={answer.maxMarks}
          step="0.5"
          className="w-24"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          / {answer.maxMarks}
        </span>
        <Button
          size="sm"
          onClick={() => onGrade(answer.answerId, Number(value))}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
