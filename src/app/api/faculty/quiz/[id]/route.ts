import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { quizUpdateSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";

async function loadOwnedQuiz(quizId: number, facultyId: number) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.facultyId !== facultyId) throw new ApiError(404, "Quiz not found");
  return quiz;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id } = idParamSchema.parse(params);
    await loadOwnedQuiz(id, user.sub);

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        building: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { options: true, formula: true },
        },
        _count: { select: { allotments: true } },
      },
    });

    return ok(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id } = idParamSchema.parse(params);
    const existing = await loadOwnedQuiz(id, user.sub);

    if (existing.status === "completed") {
      throw new ApiError(400, "A completed quiz cannot be edited");
    }

    const body = quizUpdateSchema.parse(await req.json());
    const quiz = await prisma.quiz.update({ where: { id }, data: body });

    return ok(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id } = idParamSchema.parse(params);
    const existing = await loadOwnedQuiz(id, user.sub);

    if (existing.status === "live") {
      throw new ApiError(400, "A live quiz cannot be deleted. Stop it first.");
    }

    await prisma.quiz.delete({ where: { id } });
    return ok({ message: "Quiz deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
