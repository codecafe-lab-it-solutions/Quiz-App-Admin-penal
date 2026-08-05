import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { questionsBulkSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.facultyRoll !== String(user.sub)) throw new ApiError(404, "Quiz not found");

    const questions = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { orderIndex: "asc" },
      include: { options: true, formula: true },
    });

    return ok(questions);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.facultyRoll !== String(user.sub)) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "live" || quiz.status === "completed") {
      throw new ApiError(400, "Cannot edit questions on a live or completed quiz");
    }

    const body = questionsBulkSchema.parse(await req.json());

    const questions = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const q of body.questions) {
        let question;
        if (q.id) {
          question = await tx.question.update({
            where: { id: q.id },
            data: {
              questionText: q.questionText,
              questionType: q.questionType,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              orderIndex: q.orderIndex,
            },
          });
          await tx.questionOption.deleteMany({ where: { questionId: question.id } });
          await tx.questionFormula.deleteMany({ where: { questionId: question.id } });
        } else {
          question = await tx.question.create({
            data: {
              quizId,
              questionText: q.questionText,
              questionType: q.questionType,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              orderIndex: q.orderIndex,
            },
          });
        }

        if (q.questionType === "mcq") {
          await tx.questionOption.createMany({
            data: q.options.map((o) => ({
              questionId: question.id,
              optionText: o.optionText,
              isCorrect: o.isCorrect,
            })),
          });
        } else {
          await tx.questionFormula.create({
            data: {
              questionId: question.id,
              correctValue: q.correctValue,
              tolerance: q.tolerance,
            },
          });
        }

        results.push(question);
      }

      return results;
    });

    const totalMarks = await prisma.question.aggregate({
      where: { quizId },
      _sum: { marks: true },
    });
    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalMarks: totalMarks._sum.marks ?? quiz.totalMarks },
    });

    return ok(questions);
  } catch (error) {
    return handleApiError(error);
  }
}
