import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const status = params.status as "draft" | "scheduled" | "live" | "completed" | undefined;

    const where = {
      facultyRoll: String(user.sub),
      ...(status ? { status } : {}),
      ...(search ? { title: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          course: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          building: { select: { id: true, name: true } },
          _count: { select: { questions: true, allotments: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
