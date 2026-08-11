import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { getCurrentSubList } from "@/lib/config";
import { getCourseRegistrations } from "@/lib/legacy-db";

/**
 * Keeps SectionStudent/SectionFaculty in step with the legacy rosters of a
 * section's linked courses, without ever clobbering a manual override:
 *  - rows with source "auto" are pure system state, freely added/removed
 *    as the roster changes.
 *  - "manual_added" rows are kept even if the roster drops them.
 *  - "manual_removed" rows are kept (i.e. not resurrected) even if the
 *    roster still lists that roll — they record an explicit exclusion.
 * Re-running sync is therefore idempotent and override-preserving.
 */

async function getDesiredStudentRolls(sectionId: number): Promise<Set<string>> {
  const courses = await prisma.sectionCourse.findMany({
    where: { sectionId },
    include: { course: { select: { code: true } } },
  });
  if (courses.length === 0) return new Set();

  const subList = await getCurrentSubList();
  const rolls = new Set<string>();
  for (const { course } of courses) {
    const registrations = await getCourseRegistrations(course.code, subList);
    for (const reg of registrations) rolls.add(reg.roll);
  }
  return rolls;
}

async function getDesiredFacultyRolls(sectionId: number): Promise<Set<string>> {
  const courses = await prisma.sectionCourse.findMany({
    where: { sectionId },
    include: { course: { select: { code: true } } },
  });
  if (courses.length === 0) return new Set();

  const subList = await getCurrentSubList();
  const codes = courses.map((c) => c.course.code);
  const mappings = await prisma.isrSubAvailableTbl.findMany({
    where: { subCode: { in: codes }, subList, facRoll: { not: null } },
    select: { facRoll: true },
  });
  return new Set(mappings.map((m) => m.facRoll!));
}

async function reconcile(
  sectionId: number,
  desired: Set<string>,
  existing: { studentRoll?: string; facultyRoll?: string; source: string }[],
  rollKey: "studentRoll" | "facultyRoll",
  create: (roll: string) => Promise<unknown>,
  removeAuto: (roll: string) => Promise<unknown>
) {
  const existingRolls = new Set(existing.map((row) => row[rollKey] as string));

  const toCreate = [...desired].filter((roll) => !existingRolls.has(roll));
  await Promise.all(toCreate.map((roll) => create(roll)));

  const staleAuto = existing.filter(
    (row) => row.source === "auto" && !desired.has(row[rollKey] as string)
  );
  await Promise.all(staleAuto.map((row) => removeAuto(row[rollKey] as string)));
}

export async function syncSectionStudents(sectionId: number): Promise<void> {
  const [desired, existing] = await Promise.all([
    getDesiredStudentRolls(sectionId),
    prisma.sectionStudent.findMany({ where: { sectionId } }),
  ]);

  await reconcile(
    sectionId,
    desired,
    existing,
    "studentRoll",
    (roll) => prisma.sectionStudent.create({ data: { sectionId, studentRoll: roll, source: "auto" } }),
    (roll) => prisma.sectionStudent.deleteMany({ where: { sectionId, studentRoll: roll, source: "auto" } })
  );
}

export async function syncSectionFaculty(sectionId: number): Promise<void> {
  const [desired, existing] = await Promise.all([
    getDesiredFacultyRolls(sectionId),
    prisma.sectionFaculty.findMany({ where: { sectionId } }),
  ]);

  await reconcile(
    sectionId,
    desired,
    existing,
    "facultyRoll",
    (roll) => prisma.sectionFaculty.create({ data: { sectionId, facultyRoll: roll, source: "auto" } }),
    (roll) => prisma.sectionFaculty.deleteMany({ where: { sectionId, facultyRoll: roll, source: "auto" } })
  );
}

export async function syncSection(sectionId: number): Promise<void> {
  await Promise.all([syncSectionStudents(sectionId), syncSectionFaculty(sectionId)]);
}

/**
 * Resolves a student's default section from their real Major + current
 * Semester (e.g. "CE-13") - the same Major-SemesterNumber cohort naming the
 * seed's real-data sync uses (see ensureSectionByName in prisma/seed.ts) -
 * finding an existing section with that name or creating one, then adding
 * the student to it as a manual member. Deliberately not a typed/free-text
 * code: an admin-invented label ("A") isn't grounded in anything real once
 * you check the legacy dump (no section concept exists there at all - see
 * the 2026-08-10 root-cause note), so the name always comes from the
 * student's own major/semNow columns instead. A brand new section created
 * this way has no linked courses, so course-roster resync never touches it -
 * membership here is stable until an admin changes it directly.
 */
export async function assignStudentToDefaultSection(major: string, semNow: string, roll: string) {
  const name = `${major.trim()}-${semNow.trim()}`;
  const section =
    (await prisma.section.findFirst({ where: { name } })) ??
    (await prisma.section.create({ data: { name } }));
  await addManualSectionStudent(section.id, roll);
  return section;
}

/**
 * Derives a real-data section name for the Master Data > Sections page's
 * manual "Add Section" flow, which (unlike assignStudentToDefaultSection)
 * starts from courses/students rather than a single student record. Prefers
 * the first selected student's own Major-SemesterNumber (most direct real
 * data); when no students are selected yet, falls back to the first
 * selected course's branch (its department, itself sourced from real
 * curriculum/availability data - see prisma/seed.ts) and semester (looked up
 * from the real isr_curriculum_tbl, falling back to isr_sub_available_tbl
 * the same way getFacultyCourseCatalog does).
 */
export async function deriveSectionName(
  courseIds: number[],
  studentRolls: string[],
  subList: string
): Promise<string> {
  if (studentRolls.length > 0) {
    const student = await prisma.isrStuMainTbl.findUnique({
      where: { roll: studentRolls[0] },
      select: { major: true, semNow: true },
    });
    if (student) return `${student.major}-${student.semNow}`;
  }

  if (courseIds.length > 0) {
    const course = await prisma.course.findUnique({
      where: { id: courseIds[0] },
      select: { code: true, department: { select: { name: true } } },
    });
    if (course) {
      const curriculum = await prisma.isrCurriculumTbl.findFirst({
        where: { bsmsCode: course.code, subList },
        select: { bsmsBranch: true, sem: true },
      });
      const branch = curriculum?.bsmsBranch ?? course.department.name;
      const sem =
        curriculum?.sem ??
        (
          await prisma.isrSubAvailableTbl.findFirst({
            where: { subCode: course.code, subList },
            select: { sem: true },
          })
        )?.sem;
      if (sem) return `${branch}-${sem}`;
      return branch;
    }
  }

  throw new ApiError(
    400,
    "Can't determine a section name from real data - select at least one course or student first"
  );
}

/**
 * Backs the admin and faculty "Add Section" flows: names the section from
 * real data (deriveSectionName), then reuses an existing section with that
 * name rather than creating a duplicate - e.g. picking a course already
 * covered by the real "PE-7" cohort section just adds this course/students
 * to that section, matching how the seed's cohort sync treats section names
 * as unique-by-construction.
 */
export async function createOrExtendSection(courseIds: number[], studentRolls: string[], subList: string) {
  const name = await deriveSectionName(courseIds, studentRolls, subList);

  const existing = await prisma.section.findFirst({ where: { name } });
  const section =
    existing ??
    (await prisma.section.create({
      data: { name, courses: { create: courseIds.map((courseId) => ({ courseId })) } },
    }));

  if (existing) {
    const existingCourseIds = new Set(
      (await prisma.sectionCourse.findMany({ where: { sectionId: existing.id } })).map((c) => c.courseId)
    );
    const toAdd = courseIds.filter((id) => !existingCourseIds.has(id));
    if (toAdd.length) {
      await prisma.sectionCourse.createMany({ data: toAdd.map((courseId) => ({ sectionId: existing.id, courseId })) });
    }
  }

  await Promise.all(studentRolls.map((roll) => addManualSectionStudent(section.id, roll)));
  return section;
}

/** Manually add a roll to a section, overriding any future auto-sync. */
export async function addManualSectionStudent(sectionId: number, roll: string) {
  return prisma.sectionStudent.upsert({
    where: { sectionId_studentRoll: { sectionId, studentRoll: roll } },
    update: { source: "manual_added" },
    create: { sectionId, studentRoll: roll, source: "manual_added" },
  });
}

/** Manually remove a roll from a section; records the exclusion if the roll is still on the roster, otherwise just deletes the row. */
export async function removeManualSectionStudent(sectionId: number, roll: string) {
  const desired = await getDesiredStudentRolls(sectionId);
  if (desired.has(roll)) {
    return prisma.sectionStudent.upsert({
      where: { sectionId_studentRoll: { sectionId, studentRoll: roll } },
      update: { source: "manual_removed" },
      create: { sectionId, studentRoll: roll, source: "manual_removed" },
    });
  }
  return prisma.sectionStudent.deleteMany({ where: { sectionId, studentRoll: roll } });
}

export async function addManualSectionFaculty(sectionId: number, roll: string) {
  return prisma.sectionFaculty.upsert({
    where: { sectionId_facultyRoll: { sectionId, facultyRoll: roll } },
    update: { source: "manual_added" },
    create: { sectionId, facultyRoll: roll, source: "manual_added" },
  });
}

export async function removeManualSectionFaculty(sectionId: number, roll: string) {
  const desired = await getDesiredFacultyRolls(sectionId);
  if (desired.has(roll)) {
    return prisma.sectionFaculty.upsert({
      where: { sectionId_facultyRoll: { sectionId, facultyRoll: roll } },
      update: { source: "manual_removed" },
      create: { sectionId, facultyRoll: roll, source: "manual_removed" },
    });
  }
  return prisma.sectionFaculty.deleteMany({ where: { sectionId, facultyRoll: roll } });
}
