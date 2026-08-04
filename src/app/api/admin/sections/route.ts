import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { sectionSchema } from "@/lib/validators/master-data";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const courseId = params.courseId ? Number(params.courseId) : undefined;
    const sessionId = params.sessionId ? Number(params.sessionId) : undefined;

    const where = {
      ...(search ? { name: { contains: search } } : {}),
      ...(courseId ? { courseId } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.section.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: {
          course: { select: { id: true, name: true, code: true } },
          session: { select: { id: true, name: true } },
        },
      }),
      prisma.section.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = sectionSchema.parse(await req.json());
    const section = await prisma.section.create({ data: body });

    return created(section);
  } catch (error) {
    return handleApiError(error);
  }
}
