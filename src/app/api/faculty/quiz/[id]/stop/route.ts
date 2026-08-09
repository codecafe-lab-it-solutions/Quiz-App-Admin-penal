import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { loadAccessibleQuiz } from "@/lib/quiz-access";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    // Stopping a quiz is a faculty action (from the mobile app, on their own
    // quiz) or an admin override; students can never stop one.
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    await loadAccessibleQuiz(user, id);
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new ApiError(404, "Quiz not found");
    if (quiz.status !== "live") throw new ApiError(400, "Only a live quiz can be stopped");

    const stopTime = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: { status: "completed", actualStopTime: stopTime },
      });

      const unattempted = await tx.quizAllotment.findMany({
        where: { quizId: id, status: "allotted" },
        select: { studentRoll: true },
      });

      if (unattempted.length > 0) {
        await tx.quizAllotment.updateMany({
          where: { quizId: id, status: "allotted" },
          data: { status: "absent" },
        });

        for (const { studentRoll } of unattempted) {
          await tx.attendance.upsert({
            where: { studentRoll_quizId: { studentRoll, quizId: id } },
            update: { status: "absent" },
            create: {
              studentRoll,
              courseId: quiz.courseId,
              quizId: id,
              date: quiz.startTime,
              status: "absent",
            },
          });
        }
      }
    });

    const updated = await prisma.quiz.findUnique({ where: { id } });
    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
