import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.facultyId !== user.sub) throw new ApiError(404, "Quiz not found");
    if (quiz.status !== "completed") throw new ApiError(400, "Results can only be declared for a completed quiz");

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, status: { in: ["submitted", "auto_submitted"] } },
      include: { answers: true },
    });

    const declaredAt = new Date();

    const results = await prisma.$transaction(
      attempts.map((attempt) => {
        const marksObtained = attempt.answers.reduce((sum, a) => sum + a.marksObtained, 0);
        const percentage = quiz.totalMarks > 0 ? (marksObtained / quiz.totalMarks) * 100 : 0;

        return prisma.result.upsert({
          where: { quizId_studentId: { quizId, studentId: attempt.studentId } },
          update: { marksObtained, percentage, status: "declared", declaredAt },
          create: {
            quizId,
            studentId: attempt.studentId,
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
