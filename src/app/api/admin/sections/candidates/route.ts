import { NextRequest } from "next/server";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getSectionStudentCandidates, getRealMajors, resolveMajorFromBranch } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Live preview for the Create Section dialog - every real student in the
// chosen branch/semester's Major_Semester, each tagged with whether they'd
// actually be registered for the course. Lets the admin see and pick exactly
// who gets allotted before creating the section, instead of finding out
// after the fact.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const subCode = req.nextUrl.searchParams.get("subCode")?.trim();
    const branch = req.nextUrl.searchParams.get("branch")?.trim();
    const sem = req.nextUrl.searchParams.get("sem")?.trim();
    if (!subCode || !branch || !sem) {
      return fail(400, "subCode, branch and sem are required");
    }

    const major = resolveMajorFromBranch(branch, await getRealMajors());
    const subList = await getCurrentSubList();
    const items = await getSectionStudentCandidates({ subCode, subList, major, sem });

    return ok({ items, major, sem });
  } catch (error) {
    return handleApiError(error);
  }
}
