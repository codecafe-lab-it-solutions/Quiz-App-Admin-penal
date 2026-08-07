import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { answerSchema } from "@/lib/validators/attempt";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { id: attemptId } = idParamSchema.parse(params);
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentRoll !== String(user.sub)) throw new ApiError(404, "Attempt not found");
    if (attempt.status !== "in_progress") throw new ApiError(400, "This attempt has already been submitted");

    const body = answerSchema.parse(await req.json());

    const question = await prisma.question.findUnique({ where: { id: body.questionId } });
    if (!question || question.quizId !== attempt.quizId) {
      throw new ApiError(400, "This question does not belong to the current quiz");
    }

    const orderedIds: number[] = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : [];
    const orderIndex = orderedIds.indexOf(body.questionId);

    const answer = await prisma.studentAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: body.questionId } },
      update: {
        selectedOptionId: body.selectedOptionId ?? null,
        answerValue: body.answerValue ?? null,
        writtenAnswer: body.writtenAnswer ?? null,
        isSkipped: body.isSkipped,
      },
      create: {
        attemptId,
        questionId: body.questionId,
        selectedOptionId: body.selectedOptionId ?? null,
        answerValue: body.answerValue ?? null,
        writtenAnswer: body.writtenAnswer ?? null,
        isSkipped: body.isSkipped,
        orderIndex: orderIndex >= 0 ? orderIndex : 0,
      },
    });

    return ok(answer);
  } catch (error) {
    return handleApiError(error);
  }
}
