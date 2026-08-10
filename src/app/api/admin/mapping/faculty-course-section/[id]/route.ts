import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { deleteFacultyCourseMapping } from "@/lib/legacy-db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    await deleteFacultyCourseMapping(id);

    return ok({ message: "Mapping deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
