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

// Exempts a student from this quiz's GPS/location requirement - they'll be
// able to start the attempt from anywhere, regardless of Quiz.requireLocation.
export async function POST(req: NextRequest, { params }: { params: { id: string; roll: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    await loadAllotment(quizId, params.roll, user);

    const updated = await prisma.quizAllotment.update({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
      data: { bypassLocation: true },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// Reinstates the location requirement for this student.
export async function DELETE(req: NextRequest, { params }: { params: { id: string; roll: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    await loadAllotment(quizId, params.roll, user);

    const updated = await prisma.quizAllotment.update({
      where: { quizId_studentRoll: { quizId, studentRoll: params.roll } },
      data: { bypassLocation: false },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
