import { NextRequest } from "next/server";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getStudentsForRealSections } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Live "Allot Students" candidate list for a faculty's course, across the
// given real section names - computed fresh from isr_sub_available_tbl +
// isr_stu_main_tbl + isr_reg_<batch>_tbl (see getStudentsForRealSections).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const subCode = req.nextUrl.searchParams.get("subCode");
    if (!subCode) return fail(400, "subCode is required");

    const sectionNames = (req.nextUrl.searchParams.get("sectionNames") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sectionNames.length === 0) {
      return ok({ items: [] });
    }

    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);
    const subList = await getCurrentSubList();

    const items = await getStudentsForRealSections(facultyRoll, subCode, subList, sectionNames);

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
