import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { accountDeletionRequestStatusSchema } from "@/lib/validators/master-data";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = accountDeletionRequestStatusSchema.parse(await req.json());

    const existing = await prisma.accountDeletionRequest.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Deletion request not found");

    const request = await prisma.accountDeletionRequest.update({
      where: { id },
      data: {
        status: body.status,
        reviewedByAdminId: body.status === "pending" ? null : Number(user.sub),
        reviewedAt: body.status === "pending" ? null : new Date(),
      },
    });

    return ok(request);
  } catch (error) {
    return handleApiError(error);
  }
}
