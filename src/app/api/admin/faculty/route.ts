import { NextRequest } from "next/server";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { facultyCreateSchema } from "@/lib/validators/directory";
import { listFaculty, createFaculty } from "@/lib/legacy-db";

// Faculty master data is sourced live from the legacy isr_login_tbl /
// isr_faculty_tbl tables. POST writes directly into those tables, per an
// explicit product decision to let admins add faculty from this panel.
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

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = facultyCreateSchema.parse(await req.json());
    const faculty = await createFaculty(body);

    return created(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}
