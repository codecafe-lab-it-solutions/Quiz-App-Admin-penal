import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { facultySchema } from "@/lib/validators/faculty";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const departmentId = params.departmentId ? Number(params.departmentId) : undefined;
    const status = params.status as "active" | "inactive" | undefined;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { employeeCode: { contains: search } },
            ],
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employeeCode: true,
          status: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.faculty.count({ where }),
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

    const body = facultySchema.parse(await req.json());
    if (!body.password) {
      throw new ApiError(400, "Password is required", { password: ["Password is required"] });
    }

    const passwordHash = await hashPassword(body.password);
    const faculty = await prisma.faculty.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        employeeCode: body.employeeCode,
        departmentId: body.departmentId,
        status: body.status,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeCode: true,
        status: true,
        department: { select: { id: true, name: true } },
      },
    });

    return created(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}
