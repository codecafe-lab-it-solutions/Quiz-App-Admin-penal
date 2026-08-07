import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { gradeSubjectiveAnswerSchema } from "@/lib/validators/quiz";

// Manually grades one subjective (open-ended) student answer. `marksAwarded`
// is clamped to [0, question.marks] - the question's max marks is the ceiling
// regardless of what the caller sends.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; answerId: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    const answerId = Number(params.answerId);
    if (!Number.isInteger(answerId) || answerId <= 0) throw new ApiError(400, "Invalid answer id");

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const answer = await prisma.studentAnswer.findUnique({
      where: { id: answerId },
      include: { question: true },
    });
    if (!answer || answer.question.quizId !== quizId || answer.question.questionType !== "subjective") {
      throw new ApiError(404, "Subjective answer not found for this quiz");
    }

    const { marksAwarded } = gradeSubjectiveAnswerSchema.parse(await req.json());
    const clamped = Math.min(marksAwarded, answer.question.marks);

    const updated = await prisma.studentAnswer.update({
      where: { id: answerId },
      data: { marksObtained: clamped, manuallyGraded: true },
    });

    return ok({
      answerId: updated.id,
      marksAwarded: updated.marksObtained,
      manuallyGraded: updated.manuallyGraded,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
