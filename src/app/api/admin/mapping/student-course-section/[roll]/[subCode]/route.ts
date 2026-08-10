import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { deleteStudentCourseMapping } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Deletes a registration row from the student's real isr_reg_<batch>_tbl,
// scoped to the current cycle - the same one the mapping list is filtered
// to, so this only ever removes what's actually shown on screen.
export async function DELETE(req: NextRequest, { params }: { params: { roll: string; subCode: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const roll = decodeURIComponent(params.roll);
    const subCode = decodeURIComponent(params.subCode);
    const currentSubList = await getCurrentSubList();
    await deleteStudentCourseMapping(roll, subCode, currentSubList);

    return ok({ message: "Registration deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
