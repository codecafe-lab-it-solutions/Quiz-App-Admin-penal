import { NextRequest } from "next/server";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { facultyCourseMappingCreateSchema } from "@/lib/validators/directory";
import { paginationMeta } from "@/lib/validators/common";
import {
  getFacultyCourseMappings,
  createFacultyCourseMapping,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { prisma } from "@/lib/db";
import { addManualSectionFaculty } from "@/lib/section-sync";

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
    // course each row represents, not their entire combined section list -
    // a faculty teaching both CDC and MT5213-1 should see "MT5213-1" only
    // on the MT5213-1 row, not repeated on every one of their CDC rows too.
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
        .filter((s) => s.courseCodes.includes(item.subCode))
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

    const { sectionId, ...rest } = facultyCourseMappingCreateSchema.parse(
      await req.json(),
    );
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new ApiError(404, "Section not found");

    const currentSubList = await getCurrentSubList();
    const mapping = await createFacultyCourseMapping({
      ...rest,
      subList: currentSubList,
    });
    await addManualSectionFaculty(sectionId, rest.facRoll);

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
