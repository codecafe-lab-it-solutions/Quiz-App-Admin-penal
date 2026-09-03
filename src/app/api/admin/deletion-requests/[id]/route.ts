import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { accountDeletionRequestStatusSchema } from "@/lib/validators/master-data";
import { resolveAccountByIdentifier, deleteStudent, deleteFaculty, setLoginStatus } from "@/lib/legacy-db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = accountDeletionRequestStatusSchema.parse(await req.json());

    const existing = await prisma.accountDeletionRequest.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Deletion request not found");

    // Approving a request is the actual point of this queue - it must act on
    // the real legacy account, not just relabel the request row, or the
    // account never actually gets deleted/deactivated.
    if (body.status === "completed" && body.accountAction) {
      const matched = await resolveAccountByIdentifier(existing.identifier);
      if (!matched) throw new ApiError(404, "No matching account found for this identifier");

      if (body.accountAction === "delete") {
        if (matched.type === "student") await deleteStudent(matched.roll);
        else await deleteFaculty(matched.roll);
      } else {
        await setLoginStatus(matched.roll, matched.type === "student" ? "STU" : "FAC", false);
      }
    }

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
