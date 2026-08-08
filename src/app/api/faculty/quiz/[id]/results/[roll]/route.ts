import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; roll: string } },
) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin", "faculty");

    const { id: quizId } = idParamSchema.parse({ id: params.id });
    const studentRoll = params.roll;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, title: true, totalMarks: true, facultyRoll: true },
    });
    if (
      !quiz ||
      (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))
    ) {
      throw new ApiError(404, "Quiz not found");
    }

    const attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentRoll },
    });
    if (!attempt) throw new ApiError(404, "This student has no attempt for this quiz");

    const orderedIds: number[] = attempt.questionOrder
      ? JSON.parse(attempt.questionOrder)
      : [];

    const [questions, options, formulas, answers, result, names] = await Promise.all([
      prisma.question.findMany({ where: { id: { in: orderedIds } } }),
      prisma.questionOption.findMany({ where: { questionId: { in: orderedIds } } }),
      prisma.questionFormula.findMany({ where: { questionId: { in: orderedIds } } }),
      prisma.studentAnswer.findMany({ where: { attemptId: attempt.id } }),
      prisma.result.findUnique({
        where: { quizId_studentRoll: { quizId, studentRoll } },
      }),
      getStudentNamesByRolls([studentRoll]),
    ]);

    const questionById = new Map(questions.map((q) => [q.id, q]));
    const optionsByQuestion = new Map<number, typeof options>();
    for (const opt of options) {
      const list = optionsByQuestion.get(opt.questionId) ?? [];
      list.push(opt);
      optionsByQuestion.set(opt.questionId, list);
    }
    const formulaByQuestion = new Map(formulas.map((f) => [f.questionId, f]));
    const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

    const questions_ = orderedIds
      .map((qid, orderIndex) => {
        const question = questionById.get(qid);
        if (!question) return null;
        const answer = answerByQuestion.get(qid);

        return {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          marks: question.marks,
          negativeMarks: question.negativeMarks,
          orderIndex,
          options:
            question.questionType === "mcq"
              ? (optionsByQuestion.get(qid) ?? []).map((o) => ({
                  id: o.id,
                  optionText: o.optionText,
                  isCorrect: o.isCorrect,
                }))
              : undefined,
          correctValue:
            question.questionType === "formula"
              ? formulaByQuestion.get(qid)?.correctValue ?? null
              : undefined,
          tolerance:
            question.questionType === "formula"
              ? formulaByQuestion.get(qid)?.tolerance ?? null
              : undefined,
          referenceAnswer:
            question.questionType === "subjective"
              ? question.referenceAnswer ?? null
              : undefined,
          yourAnswer: {
            selectedOptionId: answer?.selectedOptionId ?? null,
            answerValue: answer?.answerValue ?? null,
            writtenAnswer: answer?.writtenAnswer ?? null,
            isSkipped: answer?.isSkipped ?? true,
          },
          isCorrect: answer?.isCorrect ?? null,
          marksObtained: answer?.marksObtained ?? 0,
          manuallyGraded: answer?.manuallyGraded ?? false,
        };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    return ok({
      attemptId: attempt.id,
      quizId,
      quizTitle: quiz.title,
      studentRoll,
      studentName: names.get(studentRoll) ?? studentRoll,
      attemptStatus: attempt.status,
      totalMarks: quiz.totalMarks,
      marksObtained: result?.marksObtained ?? 0,
      percentage: result?.percentage ?? 0,
      resultStatus: result?.status ?? "pending",
      questions: questions_,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
