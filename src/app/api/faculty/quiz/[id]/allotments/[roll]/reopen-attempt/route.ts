import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// Reopens an auto-submitted attempt so the student can resume where they left
// off. Only flips the attempt back to in_progress - saved answers are never
// touched, and only an auto-submitted attempt qualifies (a manual "submitted"
// is left alone).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; roll: string } },
) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) {
      throw new ApiError(404, "Quiz not found");
    }

    const allotment = await prisma.quizAllotment.findUnique({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
    });
    if (!allotment) throw new ApiError(404, "This student is not allotted to this quiz");

    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
    });
    if (!attempt) throw new ApiError(404, "This student has no attempt for this quiz");
    if (attempt.status !== "auto_submitted") {
      throw new ApiError(400, "Only an auto-submitted attempt can be reopened");
    }

    const [updatedAttempt, updatedAllotment] = await prisma.$transaction([
      prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "in_progress",
          endTime: null,
          autoSubmitted: false,
          autoSubmitReason: null,
        },
      }),
      prisma.quizAllotment.update({
        where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
        data: { status: "allotted" },
      }),
    ]);

    const names = await getStudentNamesByRolls([params.roll]);

    return ok({
      student: {
        roll: params.roll,
        name: names.get(params.roll) ?? params.roll,
      },
      allotmentStatus: updatedAllotment.status,
      isProxy: updatedAllotment.isProxy,
      bypassLocation: updatedAllotment.bypassLocation,
      attempt: {
        status: updatedAttempt.status,
        startTime: updatedAttempt.startTime,
        endTime: updatedAttempt.endTime,
        autoSubmitted: updatedAttempt.autoSubmitted,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
