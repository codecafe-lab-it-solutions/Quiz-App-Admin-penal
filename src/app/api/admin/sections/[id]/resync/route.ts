import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { syncSection } from "@/lib/section-sync";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new ApiError(404, "Section not found");

    await syncSection(id);

    return ok({ message: "Section membership re-synced from course rosters" });
  } catch (error) {
    return handleApiError(error);
  }
}
