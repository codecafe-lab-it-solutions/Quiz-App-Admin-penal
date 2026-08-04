import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { id: attemptId } = idParamSchema.parse(params);
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== user.sub) throw new ApiError(404, "Attempt not found");

    const orderedIds: number[] = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : [];

    const questions = await prisma.question.findMany({
      where: { id: { in: orderedIds } },
      include: {
        options: { select: { id: true, optionText: true } },
      },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const existingAnswers = await prisma.studentAnswer.findMany({ where: { attemptId } });
    const answerByQuestion = new Map(existingAnswers.map((a) => [a.questionId, a]));

    const ordered = orderedIds
      .map((qid, index) => {
        const q = questionById.get(qid);
        if (!q) return null;
        const existing = answerByQuestion.get(qid);
        return {
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          orderIndex: index,
          options: q.questionType === "mcq" ? q.options : undefined,
          myAnswer: existing
            ? {
                selectedOptionId: existing.selectedOptionId,
                answerValue: existing.answerValue,
                isSkipped: existing.isSkipped,
              }
            : null,
        };
      })
      .filter(Boolean);

    return ok({ attemptId, totalQuestions: ordered.length, questions: ordered });
  } catch (error) {
    return handleApiError(error);
  }
}
