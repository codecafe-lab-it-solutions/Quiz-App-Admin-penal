import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { submitAttemptSchema } from "@/lib/validators/attempt";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { id: attemptId } = idParamSchema.parse(params);
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentRoll !== String(user.sub)) throw new ApiError(404, "Attempt not found");
    if (attempt.status !== "in_progress") throw new ApiError(400, "This attempt has already been submitted");

    const body = submitAttemptSchema.parse(await req.json());

    const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId } });
    if (!quiz) throw new ApiError(404, "Quiz not found");

    const orderedIds: number[] = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : [];

    const [questions, options, formulas, existingAnswers] = await Promise.all([
      prisma.question.findMany({ where: { id: { in: orderedIds } } }),
      prisma.questionOption.findMany({ where: { questionId: { in: orderedIds } } }),
      prisma.questionFormula.findMany({ where: { questionId: { in: orderedIds } } }),
      prisma.studentAnswer.findMany({ where: { attemptId } }),
    ]);

    const questionById = new Map(questions.map((q) => [q.id, q]));
    const optionsByQuestion = new Map<number, typeof options>();
    for (const opt of options) {
      const list = optionsByQuestion.get(opt.questionId) ?? [];
      list.push(opt);
      optionsByQuestion.set(opt.questionId, list);
    }
    const formulaByQuestion = new Map(formulas.map((f) => [f.questionId, f]));
    const answerByQuestion = new Map(existingAnswers.map((a) => [a.questionId, a]));

    let totalMarksObtained = 0;

    const scoredAnswers = orderedIds.map((questionId, orderIndex) => {
      const question = questionById.get(questionId);
      const existing = answerByQuestion.get(questionId);

      if (!question) {
        return { questionId, orderIndex, isSkipped: true, isCorrect: null, marksObtained: 0, selectedOptionId: null, answerValue: null };
      }

      const isSkipped = !existing || existing.isSkipped || (existing.selectedOptionId == null && existing.answerValue == null);

      if (isSkipped) {
        return {
          questionId,
          orderIndex,
          isSkipped: true,
          isCorrect: null,
          marksObtained: 0,
          selectedOptionId: existing?.selectedOptionId ?? null,
          answerValue: existing?.answerValue ?? null,
        };
      }

      let isCorrect = false;

      if (question.questionType === "mcq") {
        const correctOption = (optionsByQuestion.get(questionId) ?? []).find((o) => o.isCorrect);
        isCorrect = !!correctOption && correctOption.id === existing!.selectedOptionId;
      } else {
        const formula = formulaByQuestion.get(questionId);
        if (formula && existing!.answerValue != null) {
          isCorrect = Math.abs(existing!.answerValue - formula.correctValue) <= formula.tolerance;
        }
      }

      const marksObtained = isCorrect
        ? question.marks
        : quiz.negativeMarking
          ? -question.negativeMarks
          : 0;

      totalMarksObtained += marksObtained;

      return {
        questionId,
        orderIndex,
        isSkipped: false,
        isCorrect,
        marksObtained,
        selectedOptionId: existing!.selectedOptionId,
        answerValue: existing!.answerValue,
      };
    });

    const percentage = quiz.totalMarks > 0 ? (totalMarksObtained / quiz.totalMarks) * 100 : 0;
    const submittedAt = new Date();
    const status = body.autoSubmitted ? "auto_submitted" : "submitted";

    await prisma.$transaction(async (tx) => {
      for (const answer of scoredAnswers) {
        await tx.studentAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
          update: {
            isCorrect: answer.isCorrect,
            marksObtained: answer.marksObtained,
            isSkipped: answer.isSkipped,
            orderIndex: answer.orderIndex,
          },
          create: {
            attemptId,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            answerValue: answer.answerValue,
            isCorrect: answer.isCorrect,
            marksObtained: answer.marksObtained,
            isSkipped: answer.isSkipped,
            orderIndex: answer.orderIndex,
          },
        });
      }

      await tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          endTime: submittedAt,
          autoSubmitted: body.autoSubmitted,
          autoSubmitReason: body.autoSubmitted ? body.reason ?? "auto_submitted" : null,
        },
      });

      await tx.quizAllotment.update({
        where: { quizId_studentRoll: { quizId: attempt.quizId, studentRoll: String(user.sub) } },
        data: { status: "attempted" },
      });

      await tx.attendance.upsert({
        where: { studentRoll_quizId: { studentRoll: String(user.sub), quizId: attempt.quizId } },
        update: { status: "present" },
        create: {
          studentRoll: String(user.sub),
          courseId: quiz.courseId,
          quizId: attempt.quizId,
          date: quiz.startTime,
          status: "present",
        },
      });

      await tx.result.upsert({
        where: { quizId_studentRoll: { quizId: attempt.quizId, studentRoll: String(user.sub) } },
        update: { marksObtained: totalMarksObtained, percentage },
        create: {
          quizId: attempt.quizId,
          studentRoll: String(user.sub),
          marksObtained: totalMarksObtained,
          percentage,
          status: "pending",
        },
      });
    });

    return ok({
      attemptId,
      status,
      marksObtained: totalMarksObtained,
      totalMarks: quiz.totalMarks,
      percentage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
