import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { parseWorkbookRows } from "@/lib/excel";

interface ImportRow {
  Type?: string;
  Question?: string;
  OptionA?: string;
  OptionB?: string;
  OptionC?: string;
  OptionD?: string;
  Answer?: string;
  ReferenceAnswer?: string;
  Marks?: string | number;
  NegativeMarks?: string | number;
}

interface RowResult {
  row: number;
  question: string;
  status: "added" | "skipped";
  reason?: string;
}

const ANSWER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

// Bulk question import from an .xlsx/.csv upload matching the template from
// GET /api/faculty/questions/import-template. A `Type` column (OBJECTIVE /
// SUBJECTIVE) branches validation per row: OBJECTIVE keeps the original
// options+answer requirements, SUBJECTIVE allows options/Answer to be blank.
// Validates each row independently and reports a per-row status - duplicate
// detection, required-field checks, answer must be one of A-D for OBJECTIVE.
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
      const rawType = (r.Type ?? "OBJECTIVE").trim().toUpperCase();

      if (!questionText) {
        results.push({ row: rowNum, question: "", status: "skipped", reason: "Question text is required" });
        continue;
      }

      if (rawType !== "OBJECTIVE" && rawType !== "SUBJECTIVE") {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Type must be OBJECTIVE or SUBJECTIVE" });
        continue;
      }

      const marks = Number(r.Marks);
      if (!Number.isFinite(marks) || marks <= 0) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Marks must be a positive number" });
        continue;
      }

      const dedupeKey = questionText.toLowerCase();
      if (seenQuestionTexts.has(dedupeKey)) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Duplicate question (already in this test)" });
        continue;
      }

      if (rawType === "SUBJECTIVE") {
        await prisma.question.create({
          data: {
            quizId,
            questionText,
            questionType: "subjective",
            marks,
            negativeMarks: 0,
            referenceAnswer: (r.ReferenceAnswer ?? "").trim() || null,
            orderIndex: nextOrder++,
          },
        });

        seenQuestionTexts.add(dedupeKey);
        results.push({ row: rowNum, question: questionText, status: "added" });
        continue;
      }

      // OBJECTIVE
      const options = [r.OptionA, r.OptionB, r.OptionC, r.OptionD].map((o) => (o ?? "").trim()).filter(Boolean);
      if (options.length < 2) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "At least two options (OptionA, OptionB, ...) are required" });
        continue;
      }

      const answer = (r.Answer ?? "").trim().toUpperCase();
      if (!(answer in ANSWER_TO_INDEX) || ANSWER_TO_INDEX[answer] >= options.length) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Answer must be one of A, B, C, D, matching a filled option" });
        continue;
      }

      const negativeMarks = Number(r.NegativeMarks ?? 0);
      if (!Number.isFinite(negativeMarks) || negativeMarks < 0) {
        results.push({ row: rowNum, question: questionText, status: "skipped", reason: "Negative marks must be zero or a positive number" });
        continue;
      }

      await prisma.question.create({
        data: {
          quizId,
          questionText,
          questionType: "mcq",
          marks,
          negativeMarks,
          orderIndex: nextOrder++,
          options: {
            create: options.map((optionText, idx) => ({
              optionText,
              isCorrect: idx === ANSWER_TO_INDEX[answer],
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
