import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { parseWorkbookRows } from "@/lib/excel";
import { escapePlainText } from "@/lib/sanitize-html";

interface ImportRow {
  Question?: string;
  OptionA?: string;
  OptionB?: string;
  OptionC?: string;
  OptionD?: string;
  Answer?: string;
  Marks?: string | number;
  NegativeMarks?: string | number;
}

interface RowResult {
  row: number;
  question: string;
  status: "added" | "skipped";
  reason?: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

// Bulk question import from an .xlsx/.csv upload matching the template from
// GET /api/faculty/questions/import-template. No `Type` column - a row is
// OBJECTIVE if it has any option or an Answer filled in, SUBJECTIVE
// otherwise (kept this way rather than requiring the faculty to type
// OBJECTIVE/SUBJECTIVE correctly on every row, which was a common source of
// rows silently defaulting to the wrong type and failing validation).
// Validates each row independently and reports a per-row status - duplicate
// detection, required-field checks, answer must match a filled option.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "live" || quiz.status === "completed") {
      throw new ApiError(400, "Cannot edit questions on a live or completed quiz");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") throw new ApiError(400, "Upload an Excel file under the 'file' field");

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseWorkbookRows<ImportRow>(buffer);
    if (rows.length === 0) throw new ApiError(400, "The uploaded file has no rows");

    const existing = await prisma.question.findMany({ where: { quizId }, select: { questionText: true } });
    const seenQuestionTexts = new Set(existing.map((q) => q.questionText.trim().toLowerCase()));

    const maxOrder = await prisma.question.aggregate({ where: { quizId }, _max: { orderIndex: true } });
    let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const results: RowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2; // header is row 1
      const questionText = (r.Question ?? "").trim();

      if (!questionText) {
        results.push({ row: rowNum, question: "", status: "skipped", reason: "Question text is required" });
        continue;
      }

      const marks = Number(r.Marks);
      if (!Number.isInteger(marks) || marks <= 0) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Marks must be a positive whole number" });
        continue;
      }

      const dedupeKey = questionText.toLowerCase();
      if (seenQuestionTexts.has(dedupeKey)) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Duplicate question (already in this test)" });
        continue;
      }

      const rawOptions = [r.OptionA, r.OptionB, r.OptionC, r.OptionD].map((o) => (o ?? "").toString().trim());
      const answerLetter = (r.Answer ?? "").toString().trim().toUpperCase();
      const isObjective = rawOptions.some(Boolean) || answerLetter !== "";

      if (!isObjective) {
        await prisma.question.create({
          data: {
            quizId,
            questionText: escapePlainText(questionText),
            questionType: "subjective",
            marks,
            negativeMarks: 0,
            orderIndex: nextOrder++,
          },
        });

        seenQuestionTexts.add(dedupeKey);
        results.push({ row: rowNum, question: questionText, status: "added" });
        continue;
      }

      // OBJECTIVE - kept keyed by letter (not compacted by array position) so
      // a gap (e.g. OptionB left blank but OptionC filled) can't desync which
      // option Answer=C actually points at.
      const filledOptions = OPTION_LETTERS.map((letter, idx) => ({ letter, text: rawOptions[idx] })).filter(
        (o) => o.text !== "",
      );
      if (filledOptions.length < 2) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "At least two options (OptionA, OptionB, ...) are required" });
        continue;
      }

      const correctOption = filledOptions.find((o) => o.letter === answerLetter);
      if (!correctOption) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Answer must be one of A, B, C, D, matching a filled option" });
        continue;
      }

      const negativeMarks = Number(r.NegativeMarks ?? 0);
      if (!Number.isInteger(negativeMarks) || negativeMarks < 0) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Negative marks must be zero or a positive whole number" });
        continue;
      }

      await prisma.question.create({
        data: {
          quizId,
          questionText: escapePlainText(questionText),
          questionType: "mcq",
          marks,
          negativeMarks,
          orderIndex: nextOrder++,
          options: {
            create: filledOptions.map((o) => ({
              optionText: escapePlainText(o.text),
              isCorrect: o.letter === answerLetter,
            })),
          },
        },
      });

      seenQuestionTexts.add(dedupeKey);
      results.push({ row: rowNum, question: questionText, status: "added" });
    }

    const addedCount = results.filter((r) => r.status === "added").length;
    if (addedCount > 0) {
      const totalMarks = await prisma.question.aggregate({ where: { quizId }, _sum: { marks: true } });
      await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: totalMarks._sum.marks ?? quiz.totalMarks } });
    }

    return ok({ addedCount, skippedCount: results.length - addedCount, results });
  } catch (error) {
    return handleApiError(error);
  }
}
