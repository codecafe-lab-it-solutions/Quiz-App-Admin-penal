import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationMeta } from "@/lib/validators/common";
import { z } from "zod";

const querySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  quizId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { courseId, sectionId, quizId, page, pageSize } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const where = {
      quiz: {
        facultyId: user.sub,
        ...(sectionId ? { sectionId } : {}),
      },
      ...(courseId ? { courseId } : {}),
      ...(quizId ? { quizId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: "desc" },
        include: {
          student: { select: { id: true, name: true, rollNo: true } },
          course: { select: { id: true, name: true, code: true } },
          quiz: { select: { id: true, title: true, section: { select: { id: true, name: true } } } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
