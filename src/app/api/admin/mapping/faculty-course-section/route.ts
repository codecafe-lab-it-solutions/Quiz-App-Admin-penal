import { NextRequest } from "next/server";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { facultyCourseMappingCreateSchema } from "@/lib/validators/directory";
import { paginationMeta } from "@/lib/validators/common";
import {
  getFacultyCourseMappings,
  createFacultyCourseMapping,
  getRealMajors,
  resolveMajorFromBranch,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { prisma } from "@/lib/db";
import { assignFacultyToDefaultSection } from "@/lib/section-sync";

// Sourced live from the legacy isr_sub_available_tbl, filtered by the
// admin-configurable "current" sub_list (Settings > Semester Config). POST
// writes a new mapping row directly into that table.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { facultyRoll, page, pageSize } =
      facultyCourseMappingQuerySchema.parse(
        Object.fromEntries(req.nextUrl.searchParams),
      );

    const currentSubList = await getCurrentSubList();
    const { items, total } = await getFacultyCourseMappings(currentSubList, {
      facultyRoll,
      page,
      pageSize,
    });

    // A faculty member's Sections column must be scoped to the specific
    // course AND major each row represents, not their entire combined
    // section list - a faculty teaching CDC for 3 different branches (3
    // separate rows) should see only that row's own Major_Semester section,
    // not every section linked to CDC regardless of branch.
    const facultyRolls = [...new Set(items.map((item) => item.facRoll))];
    const sectionRows = facultyRolls.length
      ? await prisma.sectionFaculty.findMany({
          where: { facultyRoll: { in: facultyRolls } },
          include: {
            section: {
              select: {
                id: true,
                name: true,
                courses: { select: { course: { select: { code: true } } } },
              },
            },
          },
        })
      : [];

    const sectionsByFaculty = sectionRows.reduce((map, row) => {
      const existing = map.get(row.facultyRoll) ?? [];
      existing.push({
        id: row.section.id,
        name: row.section.name,
        courseCodes: row.section.courses.map((c) => c.course.code),
      });
      map.set(row.facultyRoll, existing);
      return map;
    }, new Map<string, { id: number; name: string; courseCodes: string[] }[]>());

    const itemsWithSections = items.map((item) => ({
      ...item,
      sections: (sectionsByFaculty.get(item.facRoll) ?? [])
        .filter((s) => s.courseCodes.includes(item.subCode) && s.name.split("_")[0] === item.major)
        .map((s) => ({ id: s.id, name: s.name })),
    }));

    return ok({
      items: itemsWithSections,
      currentSubList,
      meta: paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = facultyCourseMappingCreateSchema.parse(await req.json());
    const major = resolveMajorFromBranch(body.branch, await getRealMajors());

    const currentSubList = await getCurrentSubList();
    const mapping = await createFacultyCourseMapping({
      ...body,
      major,
      subList: currentSubList,
    });
    // Section is always derived from Major + Semester (Major_Semester),
    // never a manually picked existing section - see assignFacultyToDefaultSection.
    await assignFacultyToDefaultSection(major, body.sem, body.subCode, body.facRoll, currentSubList);

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
