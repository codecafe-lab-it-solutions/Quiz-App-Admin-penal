import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { paginationMeta } from "@/lib/validators/common";
import { getFacultyCourseMappings } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Read-only: sourced live from the legacy isr_sub_available_tbl, filtered by
// the admin-configurable "current" sub_list (Settings > Semester Config).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { facultyRoll, page, pageSize } = facultyCourseMappingQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const currentSubList = await getCurrentSubList();
    const { items, total } = await getFacultyCourseMappings(currentSubList, { facultyRoll, page, pageSize });

    return ok({ items, currentSubList, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
