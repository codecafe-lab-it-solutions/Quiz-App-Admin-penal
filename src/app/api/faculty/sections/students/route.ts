import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getStudentNamesByRolls, narrowToCourseRegistrants } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { syncSection } from "@/lib/section-sync";

// Union of section membership across the given sections, narrowed down to
// students actually registered for the given course where that can be
// verified - powers the "Allot Students" checkbox list shown directly on the
// quiz-creation form, before a quiz (and therefore a QuizAllotment) even
// exists yet.
//
// Section membership alone isn't enough: SectionCourse is many-to-many (one
// merged section can cover several courses/batches at once), so a section's
// full member list can include students who registered for a *different*
// course than the one this quiz is actually for. courseId is required so
// that list gets narrowed against real per-course registration
// (isr_reg_<batch>_tbl, via narrowToCourseRegistrants) - see that function's
// doc comment for why this is a narrow (exclude only with real evidence)
// rather than a strict intersection (only 3 of the real batches have a
// registration table at all; intersecting everyone against that would wipe
// out the ~94% of students in every other batch).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const sectionIds = (req.nextUrl.searchParams.get("sectionIds") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    const courseId = Number(req.nextUrl.searchParams.get("courseId"));
    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new ApiError(400, "courseId is required");
    }

    if (sectionIds.length === 0) {
      return ok({ items: [] });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { code: true } });
    if (!course) throw new ApiError(404, "Course not found");

    // Sync membership from the legacy rosters before reading it, so this list
    // is never stale/empty just because a section's roster changed (or it was
    // created) since the last sync - reconcile() is idempotent and preserves
    // manual add/remove overrides either way.
    await Promise.all(sectionIds.map((id) => syncSection(id)));

    const subList = await getCurrentSubList();
    const members = await prisma.sectionStudent.findMany({
      where: { sectionId: { in: sectionIds }, source: { not: "manual_removed" } },
    });
    const memberRolls = [...new Set(members.map((m) => m.studentRoll))];
    const rolls = await narrowToCourseRegistrants(memberRolls, course.code, subList);
    const names = await getStudentNamesByRolls(rolls);

    const items = rolls
      .map((roll) => ({ roll, name: names.get(roll) ?? roll }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
