import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// Lists every subjective (open-ended) answer for a quiz's submitted attempts,
// ungraded first, so a faculty member can work through manual grading before
// publishing results (see the ungraded-answer gate in publish-result).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const answers = await prisma.studentAnswer.findMany({
      where: {
        question: { quizId, questionType: "subjective" },
        attempt: { status: { in: ["submitted", "auto_submitted"] } },
      },
      include: {
        question: { select: { id: true, questionText: true, marks: true, referenceAnswer: true } },
        attempt: { select: { studentRoll: true } },
      },
      orderBy: [{ manuallyGraded: "asc" }, { id: "asc" }],
    });

    const names = await getStudentNamesByRolls(answers.map((a) => a.attempt.studentRoll));

    const items = answers.map((a) => ({
      answerId: a.id,
      questionId: a.question.id,
      questionText: a.question.questionText,
      referenceAnswer: a.question.referenceAnswer,
      maxMarks: a.question.marks,
      studentRoll: a.attempt.studentRoll,
      studentName: names.get(a.attempt.studentRoll) ?? a.attempt.studentRoll,
      writtenAnswer: a.writtenAnswer,
      isSkipped: a.isSkipped,
      manuallyGraded: a.manuallyGraded,
      marksAwarded: a.marksObtained,
    }));

    return ok({
      items,
      total: items.length,
      ungradedCount: items.filter((i) => !i.isSkipped && !i.manuallyGraded).length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
