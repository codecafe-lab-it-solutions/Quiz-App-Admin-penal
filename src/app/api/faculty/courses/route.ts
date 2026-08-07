import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getFacultyCourseCatalog } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Real course list for the logged-in faculty, sourced live from
// isr_sub_available_tbl (faculty<->course mapping) joined against
// isr_curriculum_tbl for title/credits/branch - this is the fix for the
// "Prog/Dept always blank" gap in the original panel (spec §5, §8). An admin
// may pass ?facultyRoll= to see the same list on a faculty member's behalf
// (used by the admin "Create Quiz" flow).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);
    const subList = await getCurrentSubList();
    const courses = await getFacultyCourseCatalog(facultyRoll, subList);

    return ok({ items: courses, subList });
  } catch (error) {
    return handleApiError(error);
  }
}
