import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where = { studentRoll: String(user.sub), status: "published" as const };

    const [items, total] = await Promise.all([
      prisma.result.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: "desc" },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              course: { select: { id: true, name: true, code: true } },
              section: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.result.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
