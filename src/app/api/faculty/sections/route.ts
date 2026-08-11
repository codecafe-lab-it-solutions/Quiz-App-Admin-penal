import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { sectionSchema } from "@/lib/validators/master-data";
import { getCurrentSubList } from "@/lib/config";
import { syncSection, createOrExtendSection } from "@/lib/section-sync";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Section list for the quiz-creation section picker. Sections are primarily
// admin-managed (Master Data > Sections) but faculty may also create/edit
// one here (per requirement: faculty can create sections), optionally
// narrowed to the sections linked to a course.
//
// Always scoped to sections the requesting (or, for an admin, the named)
// faculty is actually a real member of - a `courseId` filter alone isn't
// enough, since a shared course (e.g. "CDC") can be linked to many sections
// across different branches that a given faculty has nothing to do with
// (see resolveMajorFromBranch / getDesiredFacultyRolls for the same
// real-data quirk on the mapping side). Without this, picking a shared
// course in Quiz Create would auto-include every section that course
// touches system-wide, not just the ones this faculty teaches.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const courseId = req.nextUrl.searchParams.get("courseId");
    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);

    const sections = await prisma.section.findMany({
      where: {
        faculty: { some: { facultyRoll, source: { not: "manual_removed" } } },
        ...(courseId ? { courses: { some: { courseId: Number(courseId) } } } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        courses: { include: { course: { select: { id: true, name: true, code: true } } } },
        _count: { select: { students: true, faculty: true } },
      },
    });

    return ok({ items: sections });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { courseIds } = sectionSchema.parse(await req.json());
    const section = await createOrExtendSection(courseIds, [], await getCurrentSubList());
    await syncSection(section.id);

    return created(section);
  } catch (error) {
    return handleApiError(error);
  }
}
