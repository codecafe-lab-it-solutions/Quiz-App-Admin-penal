import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

async function loadAllotment(quizId: number, roll: string, user: { role: string; sub: string | number }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) {
    throw new ApiError(404, "Quiz not found");
  }
  const allotment = await prisma.quizAllotment.findUnique({
    where: { quizId_studentRoll: { quizId, studentRoll: roll } },
  });
  if (!allotment) throw new ApiError(404, "This student is not allotted to this quiz");
  return allotment;
}

// Flags a student's attempt as a proxy (someone else appears to be taking
// it). A proxy always counts as absent, regardless of what they've submitted
// so far - see the field comment on QuizAllotment.isProxy.
export async function POST(req: NextRequest, { params }: { params: { id: string; roll: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    await loadAllotment(quizId, params.roll, user);

    const updated = await prisma.quizAllotment.update({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
      data: { isProxy: true, status: "absent" },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// Reverts a proxy flag, restoring the student's real attendance: "attempted"
// if they have a submitted attempt, otherwise back to "allotted".
export async function DELETE(req: NextRequest, { params }: { params: { id: string; roll: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    await loadAllotment(quizId, params.roll, user);

    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
    });
    const restoredStatus = attempt && (attempt.status === "submitted" || attempt.status === "auto_submitted")
      ? "attempted"
      : "allotted";

    const updated = await prisma.quizAllotment.update({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
      data: { isProxy: false, status: restoredStatus },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
