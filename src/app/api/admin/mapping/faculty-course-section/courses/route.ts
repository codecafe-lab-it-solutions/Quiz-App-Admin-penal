import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { courseCatalogQuerySchema } from "@/lib/validators/mapping";
import { searchRealCourseCatalog } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Real course catalog for the Faculty <-> Course "Add Mapping" dialog's
// Course dropdown - searchable, sourced from the current cycle's real
// curriculum/availability data, never a typed code.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { search, pageSize } = courseCatalogQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const subList = await getCurrentSubList();
    const items = await searchRealCourseCatalog(subList, search, pageSize);

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
