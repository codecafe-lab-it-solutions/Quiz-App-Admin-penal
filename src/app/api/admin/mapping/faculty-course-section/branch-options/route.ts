import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { branchSemOptionsQuerySchema } from "@/lib/validators/mapping";
import { getRealBranchSemOptions, getRealMajors, resolveMajorFromBranch } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Real (branch, sem) options for the selected course - the Faculty <->
// Course "Add Mapping" dialog's Branch/Semester dropdowns are scoped to
// whichever course was picked, so an admin can only pick a combination that
// course is actually offered as. Each option also carries its resolved
// major (see resolveMajorFromBranch) so the dialog can preview the exact
// Major_Semester section a choice will land in, not just "Major_<sem>".
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { subCode } = branchSemOptionsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const subList = await getCurrentSubList();
    const [rows, realMajors] = await Promise.all([
      getRealBranchSemOptions(subCode, subList),
      getRealMajors(),
    ]);
    const items = rows.map((r) => ({ ...r, major: resolveMajorFromBranch(r.branch, realMajors) }));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
