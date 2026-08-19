import { NextRequest } from "next/server";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getRealSectionsForFacultyCourse } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Real per-branch sections a faculty teaches a given course under, for the
// Create/Edit Quiz section picker - sourced live from isr_sub_available_tbl
// on every call (see getRealSectionsForFacultyCourse's doc comment).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const subCode = req.nextUrl.searchParams.get("subCode");
    if (!subCode) return fail(400, "subCode is required");

    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);
    const subList = await getCurrentSubList();

    const items = await getRealSectionsForFacultyCourse(facultyRoll, subCode, subList);

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
