import { prisma } from "@/lib/db";
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
 * Resolves a student's default section from Major + Section (per the
 * 2026-08-10 MOM), finding an existing section named e.g. "CSE-A" or
 * creating one, then adding the student to it as a manual member. A brand
 * new section created this way has no linked courses, so course-roster
 * resync never touches it - membership here is stable until an admin
 * changes it directly.
 */
export async function assignStudentToDefaultSection(major: string, sectionCode: string, roll: string) {
  const name = `${major.trim()}-${sectionCode.trim()}`;
  const section =
    (await prisma.section.findFirst({ where: { name } })) ??
    (await prisma.section.create({ data: { name } }));
  await addManualSectionStudent(section.id, roll);
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
