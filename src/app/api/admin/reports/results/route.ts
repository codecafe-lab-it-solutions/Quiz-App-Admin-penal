import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { resultsReportQuerySchema } from "@/lib/validators/reports";
import { paginationMeta } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";
import { buildWorkbookBuffer, excelResponseHeaders } from "@/lib/excel";
import { buildPdfTableBuffer, pdfResponseHeaders } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const query = resultsReportQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where = {
      ...(query.courseId ? { quiz: { courseId: query.courseId } } : {}),
      ...(query.sectionId
        ? { quiz: { sections: { some: { sectionId: query.sectionId } } } }
        : {}),
      ...(query.resultStatus ? { status: query.resultStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { studentRoll: { contains: query.search } },
              { quiz: { title: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            publishedAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const baseQuery = {
      where,
      orderBy: { publishedAt: query.sortOrder },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            course: { select: { id: true, name: true, code: true } },
            sections: {
              include: { section: { select: { id: true, name: true } } },
            },
          },
        },
      },
    };

    if (query.export === "excel" || query.export === "pdf") {
      const rows = await prisma.result.findMany(baseQuery);
      const names = await getStudentNamesByRolls(rows.map((r) => r.studentRoll));

      if (query.export === "excel") {
        const buffer = buildWorkbookBuffer(
          [
            { key: "studentName", label: "Student Name" },
            { key: "rollNo", label: "Roll No" },
            { key: "course", label: "Course" },
            { key: "section", label: "Section" },
            { key: "quiz", label: "Quiz" },
            { key: "marks", label: "Marks" },
            { key: "percentage", label: "Percentage" },
            { key: "status", label: "Status" },
            { key: "publishedAt", label: "Published" },
          ],
          rows.map((r) => ({
            studentName: names.get(r.studentRoll) ?? r.studentRoll,
            rollNo: r.studentRoll,
            course: `${r.quiz.course.name} (${r.quiz.course.code})`,
            section: r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
            quiz: r.quiz.title,
            marks: `${r.marksObtained} / ${r.quiz.totalMarks}`,
            percentage: `${r.percentage.toFixed(2)}%`,
            status: r.status,
            publishedAt: r.publishedAt ? r.publishedAt.toISOString().slice(0, 10) : "—",
          })),
          "Results",
        );
        return new Response(new Uint8Array(buffer), { headers: excelResponseHeaders("results-report.xlsx") });
      }

      const buffer = buildPdfTableBuffer(
        "Quiz Results Report",
        ["Student", "Roll No", "Course", "Section", "Quiz", "Marks", "%", "Status", "Published"],
        rows.map((r) => [
          names.get(r.studentRoll) ?? r.studentRoll,
          r.studentRoll,
          `${r.quiz.course.name} (${r.quiz.course.code})`,
          r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
          r.quiz.title,
          `${r.marksObtained} / ${r.quiz.totalMarks}`,
          `${r.percentage.toFixed(2)}%`,
          r.status,
          r.publishedAt ? r.publishedAt.toISOString().slice(0, 10) : "—",
        ]),
      );
      return new Response(new Uint8Array(buffer), { headers: pdfResponseHeaders("results-report.pdf") });
    }

    const [items, total] = await Promise.all([
      prisma.result.findMany({ ...baseQuery, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.result.count({ where }),
    ]);

    const names = await getStudentNamesByRolls(
      items.map((item) => item.studentRoll),
    );

    return ok({
      items: items.map((item) => ({
        id: item.id,
        studentRoll: item.studentRoll,
        studentName: names.get(item.studentRoll) ?? item.studentRoll,
        marksObtained: item.marksObtained,
        percentage: item.percentage,
        status: item.status,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        quiz: item.quiz,
      })),
      meta: paginationMeta(total, query.page, query.pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
