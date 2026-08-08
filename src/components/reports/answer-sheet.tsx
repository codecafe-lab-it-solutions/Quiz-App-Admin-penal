"use client";

import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface AnswerSheetQuestion {
  id: number;
  questionText: string;
  questionType: string;
  marks: number;
  negativeMarks: number;
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
  manuallyGraded: boolean;
}

interface AnswerSheetDetail {
  quizTitle: string;
  studentName: string;
  studentRoll: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  resultStatus: "pending" | "declared" | "published";
  negativeMarking: boolean;
  questions: AnswerSheetQuestion[];
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  declared: "warning",
  published: "success",
};

const fetchAnswerSheet = (url: string) => apiClient.get<AnswerSheetDetail>(url);

function correctAnswerLabel(q: AnswerSheetQuestion): string {
  if (q.questionType === "mcq") {
    const correct = q.options?.find((o) => o.isCorrect);
    return correct ? correct.optionText.replace(/<[^>]+>/g, "").trim() : "No correct option";
  }
  if (q.questionType === "formula") {
    return `${q.correctValue ?? 0} ± ${q.tolerance ?? 0}`;
  }
  return q.referenceAnswer?.trim() || "Subjective response";
}

function studentAnswerLabel(q: AnswerSheetQuestion): string {
  if (q.yourAnswer.isSkipped) return "Not attempted";
  if (q.questionType === "mcq") {
    const chosen = q.options?.find((o) => o.id === q.yourAnswer.selectedOptionId);
    return chosen ? chosen.optionText.replace(/<[^>]+>/g, "").trim() : "—";
  }
  if (q.questionType === "formula") {
    return q.yourAnswer.answerValue !== null ? String(q.yourAnswer.answerValue) : "—";
  }
  return q.yourAnswer.writtenAnswer?.trim() || "—";
}

export function AnswerSheet({
  quizId,
  roll,
  backHref,
}: {
  quizId: number;
  roll: string;
  backHref: string;
}) {
  const { data, isLoading } = useSWR(
    `/api/faculty/quiz/${quizId}/results/${roll}`,
    fetchAnswerSheet,
  );

  const columns: DataTableColumn<AnswerSheetQuestion>[] = [
    {
      key: "question",
      header: "Question",
      render: (row) => <div className="max-w-md whitespace-pre-wrap">{row.questionText}</div>,
    },
    { key: "type", header: "Type", render: (row) => row.questionType },
    {
      key: "yourAnswer",
      header: "Student answer",
      render: (row) => <span className="whitespace-pre-wrap text-sm">{studentAnswerLabel(row)}</span>,
    },
    {
      key: "correctAnswer",
      header: "Correct answer",
      render: (row) => <span className="whitespace-pre-wrap text-sm">{correctAnswerLabel(row)}</span>,
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
      render: (row) => `+${row.marks}`,
    },
    {
      key: "negativeMarks",
      header: "Negative marking",
      render: (row) =>
        data?.negativeMarking && row.negativeMarks > 0 ? `-${row.negativeMarks}` : "—",
    },
    {
      key: "marksObtained",
      header: "Marks obtained",
      render: (row) => (
        <span className={row.marksObtained < 0 ? "text-destructive" : ""}>
          {row.marksObtained > 0 ? "+" : ""}
          {row.marksObtained.toFixed(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Results
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {data ? `${data.studentName} (${data.studentRoll})` : "Loading…"}
          </CardTitle>
          {data && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{data.quizTitle}</span>
              <Badge variant={statusVariant[data.resultStatus]}>{data.resultStatus}</Badge>
              <span>
                Total: {data.marksObtained.toFixed(1)} / {data.totalMarks} ({data.percentage.toFixed(2)}%)
              </span>
              {data.negativeMarking && <Badge variant="outline">Negative marking enabled</Badge>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={data?.questions ?? []}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage="No questions found for this attempt."
          />
        </CardContent>
      </Card>
    </div>
  );
}
