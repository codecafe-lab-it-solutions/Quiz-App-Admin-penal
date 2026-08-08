import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getAuthUser(req);
    // Starting a quiz is admin-only from the web panel - faculty and
    // students both start a quiz only via the mobile app.
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { questions: true } } },
    });
    if (!quiz) throw new ApiError(404, "Quiz not found");

    if (quiz.status === "live") throw new ApiError(400, "Quiz is already live");
    if (quiz.status === "completed")
      throw new ApiError(400, "A completed quiz cannot be restarted");
    if (quiz._count.questions === 0)
      throw new ApiError(
        400,
        "Add at least one question before starting the quiz",
      );

    const allottedCount = await prisma.quizAllotment.count({
      where: { quizId: id },
    });
    if (allottedCount === 0)
      throw new ApiError(400, "Allot the quiz to students before starting it");

    const updated = await prisma.quiz.update({
      where: { id },
      data: { status: "live", actualStartTime: new Date() },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
