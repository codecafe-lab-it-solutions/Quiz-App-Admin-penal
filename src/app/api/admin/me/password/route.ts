import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, verifyPassword, hashPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validators/auth";

// Self-service password change for the logged-in admin - any admin role can
// change their own password (unlike /api/admin/admin-users/[id], which
// requires super admin and can only be used to manage *other* accounts).
export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = changePasswordSchema.parse(await req.json());

    const admin = await prisma.admin.findUnique({ where: { id: Number(user.sub) } });
    if (!admin) throw new ApiError(404, "Account not found");

    const validCurrent = await verifyPassword(body.currentPassword, admin.passwordHash);
    if (!validCurrent) throw new ApiError(401, "Current password is incorrect");

    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });

    return ok({ message: "Password updated" });
  } catch (error) {
    return handleApiError(error);
  }
}
