import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

// A student's own attendance history, auto-marked from quiz submissions
// (mirrors GET /api/faculty/attendance, scoped to the logged-in student
// instead of a faculty member's courses).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const where = { studentRoll: String(user.sub) };

    const [items, total, presentCount] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: "desc" },
        include: {
          course: { select: { id: true, name: true, code: true } },
          quiz: {
            select: {
              id: true,
              title: true,
              sections: {
                include: { section: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: "present" } }),
    ]);

    return ok({
      items,
      meta: paginationMeta(total, page, pageSize),
      summary: { total, present: presentCount, percent: total > 0 ? Math.round((presentCount / total) * 100) : null },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
