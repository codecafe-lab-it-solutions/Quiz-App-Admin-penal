import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { sectionBulkMemberSchema } from "@/lib/validators/master-data";
import { addManualSectionStudent } from "@/lib/section-sync";

// Bulk add for the Select All / Unselect All student picker (2026-08-10 MOM)
// - the single-roll POST at ../students stays as-is for the add-by-roll flow.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new ApiError(404, "Section not found");

    const { rolls } = sectionBulkMemberSchema.parse(await req.json());
    await Promise.all(rolls.map((roll) => addManualSectionStudent(id, roll)));

    return ok({ added: rolls.length });
  } catch (error) {
    return handleApiError(error);
  }
}
