import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, requireSuperAdmin, hashPassword } from "@/lib/auth";
import { adminUserSchema } from "@/lib/validators/master-data";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { page, pageSize, search } = paginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const [items, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.admin.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireSuperAdmin(user);

    const body = adminUserSchema.parse(await req.json());
    if (!body.password) throw new ApiError(400, "Password is required for new admin accounts", {
      password: ["Password is required"],
    });

    const passwordHash = await hashPassword(body.password);
    const admin = await prisma.admin.create({
      data: { name: body.name, email: body.email, role: body.role, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return created(admin);
  } catch (error) {
    return handleApiError(error);
  }
}
