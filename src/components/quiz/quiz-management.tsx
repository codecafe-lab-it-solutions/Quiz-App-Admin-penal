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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { QuestionEditorDialog, QuestionRow } from "@/components/quiz/question-editor-dialog";
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
  building: { name: string };
  questions: (QuestionRow & { id: number })[];
  _count: { allotments: number };
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

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "warning",
  live: "success",
  completed: "outline",
};

const typeLabel: Record<string, string> = { mcq: "MCQ", formula: "Formula", subjective: "Subjective" };
const typeVariant: Record<string, "default" | "secondary" | "outline"> = {
  mcq: "default",
  formula: "secondary",
  subjective: "outline",
};

const fetcher = <T,>(url: string) => apiClient.get<T>(url);

export function QuizManagement({ quizId, role }: { quizId: number; role: "faculty" | "admin" }) {
  const router = useRouter();
  const basePath = role === "faculty" ? "/faculty/quizzes" : "/admin/tests";
  const listPath = role === "faculty" ? "/faculty" : "/admin/tests";
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);
  const [allotMode, setAllotMode] = useState<"course" | "custom">("course");
  const [customRolls, setCustomRolls] = useState("");
  const [allotting, setAllotting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: quiz, isLoading, mutate } = useSWR(`/api/faculty/quiz/${quizId}`, (url: string) => fetcher<QuizDetail>(url));
  const { data: subjectiveData, mutate: mutateSubjective } = useSWR(
    quiz?.status === "completed" ? `/api/faculty/quiz/${quizId}/subjective-answers` : null,
    (url: string) => fetcher<{ items: SubjectiveAnswer[]; ungradedCount: number }>(url)
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
      toast.error(error instanceof ApiClientError ? error.message : "Failed to start quiz");
    }
  };

  const handleStop = async () => {
    try {
      await apiClient.post(`/api/faculty/quiz/${quizId}/stop`);
      toast.success("Quiz stopped");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to stop quiz");
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await apiClient.post<{ id: number }>(`/api/faculty/quiz/${quizId}/duplicate`);
      toast.success("Quiz duplicated");
      router.push(`${basePath}/${copy.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to duplicate quiz");
    }
  };

  const handleDeleteQuiz = async () => {
    try {
      await apiClient.delete(`/api/faculty/quiz/${quizId}`);
      toast.success("Quiz deleted");
      router.push(listPath);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to delete quiz");
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      // No single-question delete endpoint - re-post the remaining question set.
      const remaining = quiz.questions.filter((q) => q.id !== id);
      await apiClient.post(`/api/faculty/quiz/${quizId}/questions`, {
        questions: remaining.map((q) => {
          const base = { id: q.id, questionText: q.questionText, marks: q.marks, orderIndex: q.orderIndex };
          if (q.questionType === "mcq") {
            return { ...base, questionType: "mcq", negativeMarks: q.negativeMarks, options: q.options };
          }
          if (q.questionType === "formula") {
            return { ...base, questionType: "formula", negativeMarks: q.negativeMarks, correctValue: q.formula?.correctValue ?? 0, tolerance: q.formula?.tolerance ?? 0 };
          }
          return { ...base, questionType: "subjective", referenceAnswer: q.referenceAnswer ?? undefined };
        }),
      });
      toast.success("Question removed");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to remove question");
    }
  };

  const handleAllot = async () => {
    setAllotting(true);
    try {
      const body =
        allotMode === "course"
          ? { mode: "course" as const }
          : { mode: "custom" as const, studentRolls: customRolls.split(/[,\n]/).map((r) => r.trim()).filter(Boolean) };
      const result = await apiClient.post<{ allottedCount: number; totalAllotted: number }>(
        `/api/faculty/quiz/${quizId}/allot`,
        body
      );
      toast.success(`Allotted ${result.allottedCount} student(s) - ${result.totalAllotted} total`);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to allot quiz");
    } finally {
      setAllotting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    try {
      const result = await apiClient.post<{ addedCount: number; skippedCount: number }>(
        `/api/faculty/quiz/${quizId}/questions/import`,
        formData
      );
      toast.success(`Imported ${result.addedCount} question(s), skipped ${result.skippedCount}`);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGrade = async (answerId: number, marksAwarded: number) => {
    try {
      await apiClient.patch(`/api/faculty/quiz/${quizId}/subjective-answers/${answerId}`, { marksAwarded });
      toast.success("Grade saved");
      mutateSubjective();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to save grade");
    }
  };

  const handleDeclareResult = async () => {
    try {
      const result = await apiClient.post<{ declaredCount: number }>(`/api/faculty/quiz/${quizId}/declare-result`);
      toast.success(`Declared results for ${result.declaredCount} student(s)`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to declare results");
    }
  };

  const handlePublishResult = async () => {
    try {
      const result = await apiClient.post<{ publishedCount: number }>(`/api/faculty/quiz/${quizId}/publish-result`);
      toast.success(`Published results for ${result.publishedCount} student(s)`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to publish results");
    }
  };

  const questionColumns: DataTableColumn<QuestionRow & { id: number }>[] = [
    {
      key: "questionText",
      header: "Question",
      render: (r) => <RichTextDisplay html={r.questionText} className="line-clamp-2 max-w-md" />,
    },
    {
      key: "type",
      header: "Type",
      render: (r) => <Badge variant={typeVariant[r.questionType]}>{typeLabel[r.questionType]}</Badge>,
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
            onClick={() => {
              setEditingQuestion(r);
              setQuestionDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
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

  const canEditQuestions = quiz.status === "draft" || quiz.status === "scheduled";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {quiz.course.name} ({quiz.course.code}) · {quiz.building.name} · {formatDateTime(quiz.startTime)} –{" "}
              {formatDateTime(quiz.endTime)} · {quiz.totalMarks} marks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[quiz.status]}>{quiz.status}</Badge>
            {(quiz.status === "draft" || quiz.status === "scheduled") && (
              <Button size="sm" onClick={handleStart}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
            {quiz.status === "live" && (
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
                  <Button size="sm" variant="outline">
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
                onClick={() => downloadFile("/api/faculty/questions/import-template", "question-import-template.xlsx")}
              >
                Download Template
              </Button>
              <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
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
          <CardTitle className="text-lg">Allot Students ({quiz._count.allotments} allotted)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={allotMode} onValueChange={(v) => setAllotMode(v as "course" | "custom")}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="course">Every student registered for this course</SelectItem>
              <SelectItem value="custom">Custom list of roll numbers</SelectItem>
            </SelectContent>
          </Select>
          {allotMode === "custom" && (
            <div className="space-y-1.5">
              <Label>Roll numbers (comma or newline separated)</Label>
              <Textarea value={customRolls} onChange={(e) => setCustomRolls(e.target.value)} rows={3} />
            </div>
          )}
          <Button onClick={handleAllot} disabled={allotting}>
            {allotting ? "Allotting..." : "Allot Quiz"}
          </Button>
        </CardContent>
      </Card>

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
              <p className="text-sm text-muted-foreground">No subjective answers to grade for this quiz.</p>
            )}
            {(subjectiveData?.items ?? []).map((a) => (
              <SubjectiveAnswerRow key={a.answerId} answer={a} onGrade={handleGrade} />
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
      <RichTextDisplay html={answer.questionText} className="mt-1 text-muted-foreground" />
      <p className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-sm">
        {answer.writtenAnswer || <span className="italic text-muted-foreground">No answer written</span>}
      </p>
      {answer.referenceAnswer && (
        <div className="mt-1 text-xs text-muted-foreground">
          Reference: <RichTextDisplay html={answer.referenceAnswer} className="inline" />
        </div>
      )}
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
        <span className="text-sm text-muted-foreground">/ {answer.maxMarks}</span>
        <Button size="sm" onClick={() => onGrade(answer.answerId, Number(value))}>
          Save
        </Button>
      </div>
    </div>
  );
}
