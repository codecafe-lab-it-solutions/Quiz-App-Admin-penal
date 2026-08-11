import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { studentCourseMappingCreateSchema } from "@/lib/validators/directory";
import {
  getStudentByRoll,
  getStudentCourses,
  getCourseRegistrations,
  getRecentRegistrations,
  getBatchRegistrations,
  createStudentCourseMapping,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Sourced live from the legacy per-batch isr_reg_<batch>_tbl tables. GET
// never returns an unfiltered dump - a roll/course code search, or a
// batch/section browse filter, keeps every branch bounded to a small number
// of specific batch tables instead of fanning out across all ~60 at once.
// POST writes a new registration row into the table for the student's batch.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const parsed = studentCourseMappingQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return fail(400, "Provide either roll or courseCode to search");
    }
    const { roll, courseCode, batch, sectionId } = parsed.data;
    const subList = await getCurrentSubList();

    // Section browse filter - resolves once, reused by both the courseCode
    // branch (as a post-filter) and the batch/section browse branch (as the
    // roll scope for whichever batch tables those members are actually in).
    const sectionRolls = sectionId
      ? new Set(
          (
            await prisma.sectionStudent.findMany({
              where: { sectionId },
              select: { studentRoll: true },
            })
          ).map((r) => r.studentRoll),
        )
      : null;

    // A student's Sections column must be scoped to the specific course each
    // row represents, not their entire combined section list - a student
    // registered for both CS201 and CS301 should see their CS301 section
    // only on the CS301 row, not repeated on every one of their rows. Major
    // + Semester (the real isr_stu_main_tbl columns each row's Section is
    // itself derived from - see assignStudentToDefaultSection) are attached
    // alongside so the mapping reads clearly without decoding the section name.
    const attachSections = async <T extends { roll: string; subCode: string }>(items: T[]) => {
      const studentRolls = [...new Set(items.map((item) => item.roll))];
      if (studentRolls.length === 0) {
        return items.map((item) => ({ ...item, sections: [], major: null, semNow: null }));
      }

      const [sectionRows, studentInfoRows] = await Promise.all([
        prisma.sectionStudent.findMany({
          where: { studentRoll: { in: studentRolls } },
          include: {
            section: {
              select: {
                id: true,
                name: true,
                courses: { select: { course: { select: { code: true } } } },
              },
            },
          },
        }),
        prisma.isrStuMainTbl.findMany({
          where: { roll: { in: studentRolls } },
          select: { roll: true, major: true, semNow: true },
        }),
      ]);

      const sectionsByRoll = sectionRows.reduce((map, row) => {
        const existing = map.get(row.studentRoll) ?? [];
        existing.push({
          id: row.section.id,
          name: row.section.name,
          courseCodes: row.section.courses.map((c) => c.course.code),
        });
        map.set(row.studentRoll, existing);
        return map;
      }, new Map<string, { id: number; name: string; courseCodes: string[] }[]>());
      const infoByRoll = new Map(studentInfoRows.map((s) => [s.roll, s]));

      return items.map((item) => {
        const info = infoByRoll.get(item.roll);
        return {
          ...item,
          sections: (sectionsByRoll.get(item.roll) ?? [])
            .filter((s) => s.courseCodes.includes(item.subCode))
            .map((s) => ({ id: s.id, name: s.name })),
          major: info?.major ?? null,
          semNow: info?.semNow != null ? String(info.semNow) : null,
        };
      });
    };

    if (roll) {
      const student = await getStudentByRoll(roll);
      if (!student || !student.batch) {
        return ok({ items: [] });
      }
      const courses = await getStudentCourses(roll, student.batch, subList);
      const rows = courses.map((c) => ({
        roll: c.roll,
        subCode: c.subCode,
        batch: student.batch,
      }));
      return ok({ items: await attachSections(rows), isDefault: false });
    }

    if (courseCode) {
      let items = await getCourseRegistrations(courseCode, subList);
      if (batch) items = items.filter((i) => i.batch === batch);
      if (sectionRolls) items = items.filter((i) => sectionRolls.has(i.roll));
      return ok({ items: await attachSections(items), isDefault: false });
    }

    // Browse mode - a batch and/or section picked from a dropdown, with no
    // exact roll/course code typed. Each branch below only ever queries the
    // specific batch table(s) those choices actually point at, never all ~60.
    if (batch) {
      const rows = await getBatchRegistrations(batch, subList, {
        rolls: sectionRolls ? [...sectionRolls] : undefined,
        limit: 50,
      });
      const items = rows.map((r) => ({ ...r, batch }));
      return ok({ items: await attachSections(items), isDefault: false });
    }

    if (sectionRolls) {
      // No batch chosen - resolve each section member's real batch so only
      // the handful of batch tables its members actually belong to get hit.
      const members = await prisma.isrStuMainTbl.findMany({
        where: { roll: { in: [...sectionRolls] } },
        select: { roll: true, batch: true },
      });
      const rollsByBatch = new Map<string, string[]>();
      for (const m of members) {
        if (!m.batch) continue;
        const list = rollsByBatch.get(m.batch) ?? [];
        list.push(m.roll);
        rollsByBatch.set(m.batch, list);
      }
      const items: { roll: string; subCode: string; batch: string }[] = [];
      for (const [b, rolls] of rollsByBatch) {
        const rows = await getBatchRegistrations(b, subList, { rolls });
        items.push(...rows.map((r) => ({ ...r, batch: b })));
      }
      return ok({ items: await attachSections(items), isDefault: false });
    }

    // No search or filter yet - show a bounded "recently registered" default
    // list (see getRecentRegistrations) so the page reads as live and
    // connected rather than blank.
    const recent = await getRecentRegistrations(subList, 20);
    return ok({ items: await attachSections(recent), isDefault: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = studentCourseMappingCreateSchema.parse(await req.json());
    const mapping = await createStudentCourseMapping({
      ...body,
      subList: await getCurrentSubList(),
    });

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
