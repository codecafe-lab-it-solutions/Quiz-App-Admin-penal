import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { departmentSchema } from "@/lib/validators/master-data";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { page, pageSize, search } = paginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const where = search ? { name: { contains: search } } : {};

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: { _count: { select: { courses: true } } },
      }),
      prisma.department.count({ where }),
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

    const body = departmentSchema.parse(await req.json());
    const department = await prisma.department.create({ data: body });

    return created(department);
  } catch (error) {
    return handleApiError(error);
  }
}
