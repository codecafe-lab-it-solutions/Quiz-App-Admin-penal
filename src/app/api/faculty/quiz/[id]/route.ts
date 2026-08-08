import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { quizUpdateSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";
import { loadAccessibleQuiz } from "@/lib/quiz-access";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    await loadAccessibleQuiz(user, id);

    const quiz = await prisma.quiz.findFirst({
      where: { id, deletedAt: null },
      include: {
        course: { select: { id: true, name: true, code: true } },
        sections: { include: { section: { select: { id: true, name: true } } } },
        session: { select: { id: true, name: true } },
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
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    const existing = await loadAccessibleQuiz(user, id);

    if (existing.status === "completed") {
      throw new ApiError(400, "A completed quiz cannot be edited");
    }

    const { sectionIds, ...rest } = quizUpdateSchema.parse(await req.json());

    const quiz = await prisma.$transaction(async (tx) => {
      if (sectionIds) {
        await tx.quizSection.deleteMany({ where: { quizId: id, sectionId: { notIn: sectionIds } } });
        const existing = await tx.quizSection.findMany({ where: { quizId: id } });
        const existingIds = new Set(existing.map((s) => s.sectionId));
        const toAdd = sectionIds.filter((sid) => !existingIds.has(sid));
        if (toAdd.length) {
          await tx.quizSection.createMany({ data: toAdd.map((sectionId) => ({ quizId: id, sectionId })) });
        }
      }
      return tx.quiz.update({ where: { id }, data: rest });
    });

    return ok(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    const existing = await loadAccessibleQuiz(user, id);

    if (existing.status === "live") {
      throw new ApiError(400, "A live quiz cannot be deleted. Stop it first.");
    }

    await prisma.quiz.update({ where: { id }, data: { deletedAt: new Date() } });
    return ok({ message: "Quiz deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
