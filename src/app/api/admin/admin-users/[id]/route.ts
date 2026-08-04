import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, requireSuperAdmin, hashPassword } from "@/lib/auth";
import { adminUserSchema } from "@/lib/validators/master-data";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!admin) throw new ApiError(404, "Admin user not found");

    return ok(admin);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireSuperAdmin(user);

    const { id } = idParamSchema.parse(params);
    const body = adminUserSchema.partial().parse(await req.json());

    const data: Record<string, unknown> = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.role ? { role: body.role } : {}),
    };
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const admin = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return ok(admin);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireSuperAdmin(user);

    const { id } = idParamSchema.parse(params);
    if (id === user.sub) throw new ApiError(400, "You cannot delete your own account");

    await prisma.admin.delete({ where: { id } });
    return ok({ message: "Admin user deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
