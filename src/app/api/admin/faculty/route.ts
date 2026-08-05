import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { listFaculty } from "@/lib/legacy-db";

// Read-only: faculty master data is sourced live from the legacy isr_login_tbl
// / isr_faculty_tbl tables, not owned by this app. No POST/PATCH/DELETE.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);

    const { items, total } = await listFaculty({ search, page, pageSize });

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
