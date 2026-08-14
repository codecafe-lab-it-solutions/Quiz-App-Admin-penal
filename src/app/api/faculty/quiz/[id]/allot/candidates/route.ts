import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentsForRealSections } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";

// The section-derived roster a faculty/admin can allot this quiz to, plus
// which of those students are already allotted - powers the "Add More
// Students" checkbox list in the Edit Details dialog (default: everyone
// checked). Must use the exact same real-registration source as the
// original Create Quiz picker and the /allot endpoint's own eligibility
// check (getStudentsForRealSections) - this route used to build its roster
// from the cached section_students snapshot + the looser
// narrowToCourseRegistrants, which is a broader set than the real
// registrants those two now use. That mismatch meant this list showed
// students as "not yet allotted" who were never real candidates in the
// first place (already excluded, correctly, when the quiz was created) -
// looking exactly like a duplicate of the original creation-time list
// instead of genuinely new joiners.
//
// Optional ?subCode=&sectionIds=&facultyRoll= query params let the Edit
// dialog preview the roster for a course/section (and, for admins, faculty)
// the operator has picked but not yet saved - same live remap the Create
// Quiz picker does. Falls back to the quiz's persisted course/sections when
// omitted, so opening the dialog before touching those fields still shows
// today's real roster.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: { select: { code: true } } } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const overrideSubCode = req.nextUrl.searchParams.get("subCode");
    const overrideSectionIds = (req.nextUrl.searchParams.get("sectionIds") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    const overrideFacultyRoll = req.nextUrl.searchParams.get("facultyRoll");

    const subCode = overrideSubCode || quiz.course.code;
    const facultyRoll =
      user.role === "admin" && overrideFacultyRoll ? overrideFacultyRoll : quiz.facultyRoll;

    let sectionNames: string[];
    if (overrideSubCode && overrideSectionIds.length > 0) {
      const sections = await prisma.section.findMany({
        where: { id: { in: overrideSectionIds } },
        select: { name: true },
      });
      sectionNames = sections.map((s) => s.name);
    } else {
      const quizSections = await prisma.quizSection.findMany({ where: { quizId }, include: { section: { select: { name: true } } } });
      sectionNames = quizSections.map((qs) => qs.section.name);
    }

    const subList = await getCurrentSubList();
    const [students, allotments] = await Promise.all([
      getStudentsForRealSections(facultyRoll, subCode, subList, sectionNames),
      prisma.quizAllotment.findMany({ where: { quizId }, select: { studentRoll: true } }),
    ]);
    const allottedRolls = new Set(allotments.map((a) => a.studentRoll));

    const items = students
      .map((s) => ({ roll: s.roll, name: s.name, allotted: allottedRolls.has(s.roll) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
