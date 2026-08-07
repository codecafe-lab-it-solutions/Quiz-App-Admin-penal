import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status !== "completed") throw new ApiError(400, "Results can only be declared for a completed quiz");

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, status: { in: ["submitted", "auto_submitted"] } },
      include: { answers: { include: { question: { select: { questionType: true } } } } },
    });

    const ungradedCount = attempts.reduce(
      (sum, a) => sum + a.answers.filter((ans) => ans.question.questionType === "subjective" && !ans.isSkipped && !ans.manuallyGraded).length,
      0
    );
    if (ungradedCount > 0) {
      throw new ApiError(400, `${ungradedCount} subjective answer(s) still need manual grading before results can be declared`);
    }

    const declaredAt = new Date();

    const results = await prisma.$transaction(
      attempts.map((attempt) => {
        const marksObtained = attempt.answers.reduce((sum, a) => sum + a.marksObtained, 0);
        const percentage = quiz.totalMarks > 0 ? (marksObtained / quiz.totalMarks) * 100 : 0;

        return prisma.result.upsert({
          where: { quizId_studentRoll: { quizId, studentRoll: attempt.studentRoll } },
          update: { marksObtained, percentage, status: "declared", declaredAt },
          create: {
            quizId,
            studentRoll: attempt.studentRoll,
            marksObtained,
            percentage,
            status: "declared",
            declaredAt,
          },
        });
      })
    );

    return ok({ declaredCount: results.length, results });
  } catch (error) {
    return handleApiError(error);
  }
}
