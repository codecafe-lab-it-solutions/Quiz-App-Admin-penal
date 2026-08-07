"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

export interface QuestionOptionRow {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionRow {
  id?: number;
  questionType: "mcq" | "formula" | "subjective";
  questionText: string;
  marks: number;
  negativeMarks: number;
  referenceAnswer?: string | null;
  orderIndex: number;
  options?: QuestionOptionRow[];
  formula?: { correctValue: number; tolerance: number } | null;
}

interface QuestionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: number;
  nextOrderIndex: number;
  editing: QuestionRow | null;
  onSaved: () => void;
}

const EMPTY_OPTIONS: QuestionOptionRow[] = [
  { optionText: "", isCorrect: true },
  { optionText: "", isCorrect: false },
];

export function QuestionEditorDialog({
  open,
  onOpenChange,
  quizId,
  nextOrderIndex,
  editing,
  onSaved,
}: QuestionEditorDialogProps) {
  const [type, setType] = useState<"mcq" | "subjective">("mcq");
  const [questionText, setQuestionText] = useState("");
  const [marks, setMarks] = useState("1");
  const [negativeMarks, setNegativeMarks] = useState("0");
  const [referenceAnswer, setReferenceAnswer] = useState("");
  const [options, setOptions] = useState<QuestionOptionRow[]>(EMPTY_OPTIONS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.questionType === "subjective" ? "subjective" : "mcq");
      setQuestionText(editing.questionText);
      setMarks(String(editing.marks));
      setNegativeMarks(String(editing.negativeMarks ?? 0));
      setReferenceAnswer(editing.referenceAnswer ?? "");
      setOptions(editing.options && editing.options.length >= 2 ? editing.options : EMPTY_OPTIONS);
    } else {
      setType("mcq");
      setQuestionText("");
      setMarks("1");
      setNegativeMarks("0");
      setReferenceAnswer("");
      setOptions(EMPTY_OPTIONS);
    }
  }, [open, editing]);

  const updateOption = (index: number, patch: Partial<QuestionOptionRow>) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const setCorrectOption = (index: number) => {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  };

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [...prev, { optionText: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    const marksNum = Number(marks);
    if (!Number.isFinite(marksNum) || marksNum <= 0) {
      toast.error("Marks must be greater than 0");
      return;
    }

    let payload: Record<string, unknown>;

    if (type === "subjective") {
      payload = {
        id: editing?.id,
        questionType: "subjective",
        questionText: questionText.trim(),
        marks: marksNum,
        orderIndex: editing?.orderIndex ?? nextOrderIndex,
        referenceAnswer: referenceAnswer.trim() || undefined,
      };
    } else {
      const filled = options.filter((o) => o.optionText.trim());
      if (filled.length < 2) {
        toast.error("Provide at least two options");
        return;
      }
      if (!filled.some((o) => o.isCorrect)) {
        toast.error("Mark one option as correct");
        return;
      }
      const negNum = Number(negativeMarks);
      if (!Number.isFinite(negNum) || negNum < 0) {
        toast.error("Negative marks must be zero or a positive number");
        return;
      }
      payload = {
        id: editing?.id,
        questionType: "mcq",
        questionText: questionText.trim(),
        marks: marksNum,
        negativeMarks: negNum,
        orderIndex: editing?.orderIndex ?? nextOrderIndex,
        options: filled.map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })),
      };
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/api/faculty/quiz/${quizId}/questions`, { questions: [payload] });
      toast.success(editing ? "Question updated" : "Question added");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to save question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            Objective questions are auto-graded. Subjective questions are graded manually after submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as "mcq" | "subjective")}>
            <TabsList>
              <TabsTrigger value="mcq">Objective (MCQ)</TabsTrigger>
              <TabsTrigger value="subjective">Subjective (Open-ended)</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="questionText">Question</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Supports plain text and formulas/equations"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="marks">Marks</Label>
              <Input id="marks" type="number" min={0} step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
            {type === "mcq" && (
              <div className="space-y-1.5">
                <Label htmlFor="negativeMarks">Negative Marks</Label>
                <Input
                  id="negativeMarks"
                  type="number"
                  min={0}
                  step="0.5"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(e.target.value)}
                />
              </div>
            )}
          </div>

          {type === "mcq" ? (
            <div className="space-y-2">
              <Label>Options (mark the correct one)</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={() => setCorrectOption(index)}
                    aria-label={`Mark option ${index + 1} correct`}
                  />
                  <Input
                    value={option.optionText}
                    onChange={(e) => updateOption(index, { optionText: e.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {options.length < 4 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add option
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="referenceAnswer">Reference Answer (optional)</Label>
              <Textarea
                id="referenceAnswer"
                value={referenceAnswer}
                onChange={(e) => setReferenceAnswer(e.target.value)}
                placeholder="Grading guide for whoever grades this manually - leave blank if there's no single correct answer"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
