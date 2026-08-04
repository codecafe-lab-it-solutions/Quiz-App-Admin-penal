import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { courseSchema } from "@/lib/validators/master-data";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const departmentId = params.departmentId ? Number(params.departmentId) : undefined;

    const where = {
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
      ...(departmentId ? { departmentId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: { department: { select: { id: true, name: true } } },
      }),
      prisma.course.count({ where }),
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

    const body = courseSchema.parse(await req.json());
    const course = await prisma.course.create({ data: body });

    return created(course);
  } catch (error) {
    return handleApiError(error);
  }
}
