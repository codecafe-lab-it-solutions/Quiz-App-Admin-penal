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
    if (!quiz || quiz.facultyRoll !== String(user.sub)) throw new ApiError(404, "Quiz not found");

    const declaredCount = await prisma.result.count({ where: { quizId, status: "declared" } });
    if (declaredCount === 0) throw new ApiError(400, "Declare results before publishing them");

    const publishedAt = new Date();
    const { count } = await prisma.result.updateMany({
      where: { quizId, status: "declared" },
      data: { status: "published", publishedAt },
    });

    return ok({ publishedCount: count });
  } catch (error) {
    return handleApiError(error);
  }
}
