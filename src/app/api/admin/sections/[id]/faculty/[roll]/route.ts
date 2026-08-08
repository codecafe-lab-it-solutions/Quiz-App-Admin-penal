import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { removeManualSectionFaculty } from "@/lib/section-sync";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; roll: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse({ id: params.id });
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new ApiError(404, "Section not found");

    await removeManualSectionFaculty(id, params.roll);

    return ok({ message: "Faculty removed from section" });
  } catch (error) {
    return handleApiError(error);
  }
}
