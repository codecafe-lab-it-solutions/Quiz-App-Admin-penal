import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const allotments = await prisma.quizAllotment.findMany({
      where: { quizId },
      orderBy: { studentRoll: "asc" },
    });

    const names = await getStudentNamesByRolls(allotments.map((a) => a.studentRoll));

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      select: { studentRoll: true, status: true, startTime: true, endTime: true, autoSubmitted: true },
    });
    const attemptByStudent = new Map(attempts.map((a) => [a.studentRoll, a]));

    const attempted = [];
    const notAttempted = [];

    for (const allotment of allotments) {
      const attempt = attemptByStudent.get(allotment.studentRoll);
      const entry = {
        student: { roll: allotment.studentRoll, name: names.get(allotment.studentRoll) ?? allotment.studentRoll },
        allotmentStatus: allotment.status,
        isProxy: allotment.isProxy,
        attempt: attempt ?? null,
      };
      if (attempt) attempted.push(entry);
      else notAttempted.push(entry);
    }

    return ok({
      totalAllotted: allotments.length,
      attemptedCount: attempted.length,
      notAttemptedCount: notAttempted.length,
      attempted,
      notAttempted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
