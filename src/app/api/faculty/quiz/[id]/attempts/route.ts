import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.facultyId !== user.sub) throw new ApiError(404, "Quiz not found");

    const allotments = await prisma.quizAllotment.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, rollNo: true, enrollmentNo: true } },
      },
      orderBy: { student: { name: "asc" } },
    });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      select: { studentId: true, status: true, startTime: true, endTime: true, autoSubmitted: true },
    });
    const attemptByStudent = new Map(attempts.map((a) => [a.studentId, a]));

    const attempted = [];
    const notAttempted = [];

    for (const allotment of allotments) {
      const attempt = attemptByStudent.get(allotment.studentId);
      const entry = {
        student: allotment.student,
        allotmentStatus: allotment.status,
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
