import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { studentSchema } from "@/lib/validators/student";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const status = params.status as "active" | "inactive" | undefined;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { rollNo: { contains: search } },
              { enrollmentNo: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          rollNo: true,
          enrollmentNo: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.student.count({ where }),
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

    const body = studentSchema.parse(await req.json());
    if (!body.password) {
      throw new ApiError(400, "Password is required", { password: ["Password is required"] });
    }

    const passwordHash = await hashPassword(body.password);
    const student = await prisma.student.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        rollNo: body.rollNo,
        enrollmentNo: body.enrollmentNo,
        status: body.status,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rollNo: true,
        enrollmentNo: true,
        status: true,
      },
    });

    return created(student);
  } catch (error) {
    return handleApiError(error);
  }
}
