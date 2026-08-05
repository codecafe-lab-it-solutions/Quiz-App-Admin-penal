import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id } = idParamSchema.parse(params);
    const source = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: { include: { options: true, formula: true } } },
    });
    if (!source || source.facultyRoll !== String(user.sub)) throw new ApiError(404, "Quiz not found");

    const duplicate = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: {
          title: `${source.title} (Copy)`,
          courseId: source.courseId,
          sectionId: source.sectionId,
          facultyRoll: source.facultyRoll,
          buildingId: source.buildingId,
          startTime: source.startTime,
          endTime: source.endTime,
          durationMinutes: source.durationMinutes,
          totalMarks: source.totalMarks,
          randomize: source.randomize,
          negativeMarking: source.negativeMarking,
          allowSkipSwitch: source.allowSkipSwitch,
          status: "draft",
        },
      });

      for (const q of source.questions) {
        const newQuestion = await tx.question.create({
          data: {
            quizId: newQuiz.id,
            questionText: q.questionText,
            questionType: q.questionType,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            orderIndex: q.orderIndex,
          },
        });

        if (q.questionType === "mcq") {
          await tx.questionOption.createMany({
            data: q.options.map((o) => ({
              questionId: newQuestion.id,
              optionText: o.optionText,
              isCorrect: o.isCorrect,
            })),
          });
        } else if (q.formula) {
          await tx.questionFormula.create({
            data: {
              questionId: newQuestion.id,
              correctValue: q.formula.correctValue,
              tolerance: q.formula.tolerance,
            },
          });
        }
      }

      return newQuiz;
    });

    return created(duplicate);
  } catch (error) {
    return handleApiError(error);
  }
}
