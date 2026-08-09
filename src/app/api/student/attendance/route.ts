import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { attendanceReportQuerySchema } from "@/lib/validators/reports";
import { paginationMeta } from "@/lib/validators/common";
import { buildWorkbookBuffer, excelResponseHeaders } from "@/lib/excel";
import { buildPdfTableBuffer, pdfResponseHeaders } from "@/lib/pdf";

// A student's own attendance history, auto-marked from quiz submissions
// (mirrors GET /api/faculty/attendance, scoped to the logged-in student
// instead of a faculty member's courses).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const query = attendanceReportQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const studentRoll = String(user.sub);

    const where = {
      studentRoll,
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.sectionId ? { quiz: { sections: { some: { sectionId: query.sectionId } } } } : {}),
      ...(query.search ? { quiz: { title: { contains: query.search } } } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const baseQuery = {
      where,
      orderBy: { date: "desc" as const },
      include: {
        course: { select: { id: true, name: true, code: true } },
        quiz: {
          select: {
            id: true,
            title: true,
            sections: { include: { section: { select: { id: true, name: true } } } },
          },
        },
      },
    };

    if (query.export === "excel") {
      const rows = await prisma.attendance.findMany(baseQuery);
      const buffer = buildWorkbookBuffer(
        [
          { key: "course", label: "Course" },
          { key: "section", label: "Section" },
          { key: "quiz", label: "Quiz" },
          { key: "date", label: "Date" },
          { key: "status", label: "Status" },
        ],
        rows.map((r) => ({
          course: `${r.course.name} (${r.course.code})`,
          section: r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
          quiz: r.quiz.title,
          date: r.date.toISOString().slice(0, 10),
          status: r.status,
        })),
        "Attendance",
      );
      return new Response(new Uint8Array(buffer), { headers: excelResponseHeaders("my-attendance.xlsx") });
    }

    if (query.export === "pdf") {
      const rows = await prisma.attendance.findMany(baseQuery);
      const buffer = buildPdfTableBuffer(
        "My Attendance",
        ["Course", "Section", "Quiz", "Date", "Status"],
        rows.map((r) => [
          `${r.course.name} (${r.course.code})`,
          r.quiz.sections.map((s) => s.section.name).join(", ") || "—",
          r.quiz.title,
          r.date.toISOString().slice(0, 10),
          r.status,
        ]),
      );
      return new Response(new Uint8Array(buffer), { headers: pdfResponseHeaders("my-attendance.pdf") });
    }

    const [items, total, presentCount, own] = await Promise.all([
      prisma.attendance.findMany({ ...baseQuery, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: "present" } }),
      // Unfiltered-by-date list of every course/section this student has ever
      // had attendance in, so the filter dropdowns aren't limited to today.
      prisma.attendance.findMany({
        where: { studentRoll },
        select: {
          course: { select: { id: true, name: true, code: true } },
          quiz: { select: { sections: { select: { section: { select: { id: true, name: true } } } } } },
        },
      }),
    ]);

    const courseOptions = [...new Map(own.map((r) => [r.course.id, r.course])).values()];
    const sectionOptions = [
      ...new Map(
        own.flatMap((r) => r.quiz.sections.map((s) => [s.section.id, s.section] as const)),
      ).values(),
    ];

    return ok({
      items,
      meta: paginationMeta(total, query.page, query.pageSize),
      summary: { total, present: presentCount, percent: total > 0 ? Math.round((presentCount / total) * 100) : null },
      filterOptions: { courses: courseOptions, sections: sectionOptions },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
