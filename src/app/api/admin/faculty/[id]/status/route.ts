import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { loginStatusUpdateSchema } from "@/lib/validators/directory";
import { setLoginStatus, getFacultyByRoll } from "@/lib/legacy-db";

// Activate/deactivate a faculty login (isr_login_tbl.status: 1-Active, 2-Inactive).
// Deactivated accounts are rejected at /api/auth/faculty/login regardless of a
// correct password.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { active } = loginStatusUpdateSchema.parse(await req.json());
    await setLoginStatus(params.id, "FAC", active);

    const faculty = await getFacultyByRoll(params.id);
    return ok(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}
