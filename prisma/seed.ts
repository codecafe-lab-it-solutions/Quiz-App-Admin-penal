import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncSection, addManualSectionStudent } from "@/lib/section-sync";
import { importRealLegacyData } from "./import-legacy-data";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";

function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// ---------------------------------------------------------------------------
// Idempotent "ensure" helpers for app-owned data - safe to call on every
// deploy. The isr_* legacy tables are handled separately, by
// importRealLegacyData() (see prisma/import-legacy-data.ts) - a full,
// destructive replace-from-the-real-dump, not an "ensure".
// ---------------------------------------------------------------------------

async function ensureAdminUser(data: { name: string; email: string; password: string; role: "super_admin" | "admin" }) {
  const existing = await prisma.admin.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.admin.create({
    data: { name: data.name, email: data.email, passwordHash: await hash(data.password), role: data.role },
  });
}

async function ensureDepartment(name: string) {
  return prisma.department.upsert({ where: { name }, update: {}, create: { name } });
}

async function ensureCourse(data: { name: string; code: string; departmentId: number; credits: number }) {
  return prisma.course.upsert({ where: { code: data.code }, update: {}, create: data });
}

async function ensureSession(name: string, startDate: Date, endDate: Date) {
  const existing = await prisma.academicSession.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.academicSession.create({ data: { name, startDate, endDate } });
}

async function ensureSection(name: string, courseIds: number[]) {
  const candidates = await prisma.section.findMany({
    where: { name, courses: { some: { courseId: { in: courseIds } } } },
    include: { courses: true },
  });
  const existing = candidates.find(
    (s) => s.courses.length === courseIds.length && courseIds.every((cid) => s.courses.some((c) => c.courseId === cid))
  );
  if (existing) return existing;
  return prisma.section.create({ data: { name, courses: { create: courseIds.map((courseId) => ({ courseId })) } } });
}

// Students whose batch has no isr_reg_<batch>_tbl in the real dump at all
// (only btechpeg23/24/25 are included - see the "legacy-db-mapping"
// artifact, section 07) have no real course registration to sync a section
// from. Rather than leave them with no section, this groups them by their
// real Major + Batch (both present on every isr_stu_main_tbl row) into a
// section named e.g. "CSE-btechcse25" - real data, just not course-level
// like the students whose batch does have a registration table.
async function ensureFallbackSectionsForUnregisteredStudents() {
  const [allStudents, coveredRolls] = await Promise.all([
    prisma.isrStuMainTbl.findMany({ select: { roll: true, major: true, batch: true } }),
    prisma.sectionStudent.findMany({ where: { source: { not: "manual_removed" } }, select: { studentRoll: true } }),
  ]);
  const covered = new Set(coveredRolls.map((r) => r.studentRoll));
  const uncovered = allStudents.filter((s) => !covered.has(s.roll));

  const byKey = new Map<string, { major: string; batch: string; rolls: string[] }>();
  for (const s of uncovered) {
    const key = `${s.major}-${s.batch}`;
    const entry = byKey.get(key) ?? { major: s.major, batch: s.batch, rolls: [] };
    entry.rolls.push(s.roll);
    byKey.set(key, entry);
  }

  let sectionCount = 0;
  let studentCount = 0;
  for (const { major, batch, rolls } of byKey.values()) {
    const section = await ensureCourselessSection(`${major}-${batch}`);
    for (const roll of rolls) {
      await addManualSectionStudent(section.id, roll);
    }
    sectionCount++;
    studentCount += rolls.length;
  }
  return { sectionCount, studentCount };
}

// ensureSection's "match on name + exact course set" logic can never find a
// zero-course section (its query filters `courses: { some: { courseId: {
// in: [] } } }`, which matches nothing) - this is the course-less variant
// fallback sections need, so re-running the seed doesn't create a fresh
// duplicate section every time.
async function ensureCourselessSection(name: string) {
  const existing = await prisma.section.findFirst({ where: { name, courses: { none: {} } } });
  if (existing) return existing;
  return prisma.section.create({ data: { name } });
}

async function ensureBuilding(data: { name: string; latitude: number; longitude: number; radiusMeters: number }) {
  const existing = await prisma.building.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.building.create({ data });
}

async function ensureSemesterConfig() {
  const existing = await prisma.semesterConfig.findFirst();
  if (existing) return existing;
  return prisma.semesterConfig.create({ data: { currentSubList: "C2" } });
}

// Rolls actually sitting in a section's roster after resync - used to pick
// real students/faculty for demo quizzes instead of guessing roll numbers.
async function pickStudentRolls(sectionId: number, count: number): Promise<string[]> {
  const rows = await prisma.sectionStudent.findMany({
    where: { sectionId, source: { not: "manual_removed" } },
    take: count,
    orderBy: { studentRoll: "asc" },
  });
  return rows.map((r) => r.studentRoll);
}

// --- Demo quiz builders (course/section/faculty/roll identity is real; the
// quiz shell, questions, and outcomes around them are still made up, since
// none of that exists in the legacy dump) -----------------------------------

async function ensureCompletedDemoQuiz(params: {
  title: string;
  courseId: number;
  sectionId: number;
  sessionId: number;
  facultyRoll: string;
  buildingId: number;
  studentRolls: string[];
  questionText: string;
}) {
  const existing = await prisma.quiz.findFirst({ where: { title: params.title } });
  if (existing) return existing;
  if (params.studentRolls.length < 2) return null;

  const start = new Date("2025-09-15T10:00:00Z");
  const end = new Date("2025-09-15T11:00:00Z");
  const attendanceDate = new Date("2025-09-15");

  const quiz = await prisma.quiz.create({
    data: {
      title: params.title,
      courseId: params.courseId,
      sections: { create: [{ sectionId: params.sectionId }] },
      sessionId: params.sessionId,
      facultyRoll: params.facultyRoll,
      buildingId: params.buildingId,
      startTime: start,
      endTime: end,
      durationMinutes: 60,
      totalMarks: 10,
      randomize: true,
      negativeMarking: false,
      allowSkipSwitch: true,
      status: "completed",
      actualStartTime: start,
      actualStopTime: end,
    },
  });

  const q = await prisma.question.create({
    data: { quizId: quiz.id, questionText: params.questionText, questionType: "mcq", marks: 10, negativeMarks: 0, orderIndex: 1 },
  });
  const options = await Promise.all([
    prisma.questionOption.create({ data: { questionId: q.id, optionText: "Option A", isCorrect: true } }),
    prisma.questionOption.create({ data: { questionId: q.id, optionText: "Option B", isCorrect: false } }),
  ]);

  const [first, second, ...rest] = params.studentRolls;

  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: first, status: "attempted" } });
  const attempt1 = await prisma.quizAttempt.create({ data: { quizId: quiz.id, studentRoll: first, startTime: start, endTime: end, status: "submitted" } });
  await prisma.studentAnswer.create({ data: { attemptId: attempt1.id, questionId: q.id, selectedOptionId: options[0].id, isCorrect: true, marksObtained: 10, orderIndex: 1 } });
  await prisma.attendance.create({ data: { studentRoll: first, courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: first, marksObtained: 10, percentage: 100, status: "published", declaredAt: end, publishedAt: end } });

  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: second, status: "attempted" } });
  const attempt2 = await prisma.quizAttempt.create({ data: { quizId: quiz.id, studentRoll: second, startTime: start, endTime: end, status: "submitted" } });
  await prisma.studentAnswer.create({ data: { attemptId: attempt2.id, questionId: q.id, selectedOptionId: options[1].id, isCorrect: false, marksObtained: 0, orderIndex: 1 } });
  await prisma.attendance.create({ data: { studentRoll: second, courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: second, marksObtained: 0, percentage: 0, status: "published", declaredAt: end, publishedAt: end } });

  for (const roll of rest.slice(0, 1)) {
    await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: roll, status: "absent" } });
    await prisma.attendance.create({ data: { studentRoll: roll, courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "absent" } });
  }

  return quiz;
}

async function ensureTimedDemoQuiz(params: {
  title: string;
  courseId: number;
  sectionIds: number[];
  facultyRoll: string;
  buildingId: number;
  status: "draft" | "scheduled" | "live";
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  totalMarks: number;
  actualStartTime?: Date;
}) {
  const existing = await prisma.quiz.findFirst({ where: { title: params.title } });
  if (existing) {
    return prisma.quiz.update({
      where: { id: existing.id },
      data: { startTime: params.startTime, endTime: params.endTime, status: params.status, actualStartTime: params.actualStartTime ?? null },
    });
  }
  return prisma.quiz.create({
    data: {
      title: params.title,
      courseId: params.courseId,
      sections: { create: params.sectionIds.map((sectionId) => ({ sectionId })) },
      facultyRoll: params.facultyRoll,
      buildingId: params.buildingId,
      startTime: params.startTime,
      endTime: params.endTime,
      durationMinutes: params.durationMinutes,
      totalMarks: params.totalMarks,
      status: params.status,
      actualStartTime: params.actualStartTime,
    },
  });
}

async function ensureQuestionAndAllotments(params: {
  quizId: number;
  questionText: string;
  marks: number;
  allotRolls: string[];
  attemptedRoll?: string;
}) {
  const existingQuestions = await prisma.question.count({ where: { quizId: params.quizId } });
  if (existingQuestions > 0) return;

  const q = await prisma.question.create({
    data: { quizId: params.quizId, questionText: params.questionText, questionType: "mcq", marks: params.marks, negativeMarks: 0, orderIndex: 1 },
  });
  const options = await Promise.all([
    prisma.questionOption.create({ data: { questionId: q.id, optionText: "Option A", isCorrect: true } }),
    prisma.questionOption.create({ data: { questionId: q.id, optionText: "Option B", isCorrect: false } }),
    prisma.questionOption.create({ data: { questionId: q.id, optionText: "Option C", isCorrect: false } }),
  ]);

  for (const roll of params.allotRolls) {
    const attempted = roll === params.attemptedRoll;
    await prisma.quizAllotment.create({ data: { quizId: params.quizId, studentRoll: roll, status: attempted ? "attempted" : "allotted" } });
    if (attempted) {
      const attempt = await prisma.quizAttempt.create({ data: { quizId: params.quizId, studentRoll: roll, status: "submitted", endTime: new Date() } });
      await prisma.studentAnswer.create({ data: { attemptId: attempt.id, questionId: q.id, selectedOptionId: options[0].id, isCorrect: true, marksObtained: params.marks, orderIndex: 1 } });
    }
  }
}

// ---------------------------------------------------------------------------
// Real courses this seed builds the app's Course/Section/Quiz layer around -
// found by querying the imported real data for isr_sub_available_tbl rows
// (sub_list='C2', the configured current cycle) that have both a real
// faculty assignment and a healthy number of real student registrations
// across the three real isr_reg_btechpeg<23|24|25>_tbl tables. See the
// "legacy-db-mapping" artifact, section 07, for the full query.
// ---------------------------------------------------------------------------

// PE241/PE331/ECE102/PE202 (used further down to build one demo quiz each)
// were picked because they have both real faculty and a healthy number of
// real registered students, so each quiz has a real roster to allot - not
// because they're special otherwise. Every other real, connectable course
// still gets a proper Course + Section (see discoverRealCourses() below),
// just without a demo quiz built on top of it.

interface DiscoveredCourse {
  subCode: string;
  title: string;
  branch: string;
  credits: number;
}

// Every course code that's actually connectable in the real, imported data
// for the active cycle (SemesterConfig.currentSubList) - has a real faculty
// assignment (isr_sub_available_tbl) and/or real student registrations
// (any of the isr_reg_btechpeg<batch>_tbl tables). This is what "every
// student/faculty row shows a real Section, not a dash" actually requires -
// a curated handful of courses leaves everyone else's real registrations
// pointing at a course this app's own catalog doesn't have yet.
async function discoverRealCourses(subList: string): Promise<DiscoveredCourse[]> {
  return prisma.$queryRawUnsafe<DiscoveredCourse[]>(
    `
    SELECT
      all_codes.sub_code AS subCode,
      COALESCE(MIN(c.title), all_codes.sub_code) AS title,
      COALESCE(MIN(c.bsms_branch), MIN(sa.branch), 'General') AS branch,
      COALESCE(MIN(c.bsms_credit), 0) AS credits
    FROM (
      SELECT sub_code FROM isr_sub_available_tbl WHERE sub_list = ? AND fac_roll IS NOT NULL AND sub_code IS NOT NULL
      UNION SELECT sub_code FROM isr_reg_btechpeg23_tbl WHERE sub_list = ? AND sub_code IS NOT NULL
      UNION SELECT sub_code FROM isr_reg_btechpeg24_tbl WHERE sub_list = ? AND sub_code IS NOT NULL
      UNION SELECT sub_code FROM isr_reg_btechpeg25_tbl WHERE sub_list = ? AND sub_code IS NOT NULL
    ) all_codes
    LEFT JOIN isr_curriculum_tbl c ON c.bsms_code = all_codes.sub_code AND c.sub_list = ?
    LEFT JOIN isr_sub_available_tbl sa ON sa.sub_code = all_codes.sub_code AND sa.sub_list = ?
    GROUP BY all_codes.sub_code
    `,
    subList, subList, subList, subList, subList, subList
  );
}

async function main() {
  await ensureAdminUser({
    name: "Super Admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
    role: "super_admin",
  });
  await ensureAdminUser({ name: "Ops Admin", email: "ops.admin@example.com", password: DEMO_PASSWORD, role: "admin" });
  await ensureAdminUser({ name: "Registrar Admin", email: "registrar.admin@example.com", password: DEMO_PASSWORD, role: "admin" });
  await ensureAdminUser({ name: "IT Support Admin", email: "it.support@example.com", password: DEMO_PASSWORD, role: "admin" });

  console.log("Importing real legacy data from quizsample_db (2).sql...");
  const importResult = await importRealLegacyData(prisma);
  if (importResult.imported) {
    console.log("  Loaded:", importResult.counts);
  }

  console.log("Clearing previously-seeded app-domain data (quizzes/sections/courses tied to the old synthetic rolls)...");
  // Quiz cascades to Question/QuestionOption/QuestionFormula/QuizAllotment/
  // QuizAttempt/StudentAnswer/AntiCheatEvent/GeofenceLog/Attendance/Result/
  // QuizSection (all onDelete: Cascade in schema.prisma). Section cascades
  // to SectionCourse/SectionStudent/SectionFaculty. Order matters: Quiz
  // before Section/Course (Quiz.courseId and QuizSection.sectionId aren't
  // cascade-deletable from the other direction).
  await prisma.quiz.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.academicSession.deleteMany({});

  console.log("Discovering every real, connectable course for the active cycle...");
  const currentSubList = (await ensureSemesterConfig()).currentSubList;
  const discovered = await discoverRealCourses(currentSubList);
  console.log(`  Found ${discovered.length} real course codes with a real faculty assignment and/or real student registrations.`);

  console.log("Building the Course/Department catalog from every one of them (not a curated sample)...");

  const departmentIds = new Map<string, number>();
  for (const branch of new Set(discovered.map((c) => c.branch))) {
    const row = await ensureDepartment(branch);
    departmentIds.set(branch, row.id);
  }

  const courses = new Map<string, Awaited<ReturnType<typeof ensureCourse>>>();
  for (const c of discovered) {
    const course = await ensureCourse({
      name: c.title,
      code: c.subCode,
      departmentId: departmentIds.get(c.branch)!,
      // MIN() on an INT column comes back as a JS bigint via the raw query
      // driver - coerce to a plain number for the Int column.
      credits: Number(c.credits),
    });
    courses.set(c.subCode, course);
  }

  const session = await ensureSession("C2 Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Creating one section per real course and syncing rosters from the real legacy data (this covers all of them, so it takes a minute)...");

  // The real dump has no section/slot concept at all (isr_sub_available_tbl's
  // `slot` and `sem_list` columns are NULL on every real row for the active
  // cycle - checked directly) - Section is purely this app's own construct.
  // With exactly one section per real course, the honest name is the real
  // course code itself, not an invented "A" that implies a B that doesn't exist.
  const sections = new Map<string, Awaited<ReturnType<typeof ensureSection>>>();
  for (const c of discovered) {
    const course = courses.get(c.subCode)!;
    const section = await ensureSection(c.subCode, [course.id]);
    sections.set(c.subCode, section);
    // syncSection reads SemesterConfig.currentSubList + BatchTableRegistry -
    // both now pointed at the real data - and pulls the real faculty (from
    // isr_sub_available_tbl) and real registered students (from the three
    // isr_reg_btechpeg<batch>_tbl tables) into SectionFaculty/SectionStudent.
    await syncSection(section.id);
  }

  const totalRostered = await prisma.sectionStudent.count({ where: { source: { not: "manual_removed" } } });
  const totalFacultyLinked = await prisma.sectionFaculty.count({ where: { source: { not: "manual_removed" } } });
  console.log(`  Synced ${courses.size} sections from real data - ${totalRostered} real student memberships, ${totalFacultyLinked} real faculty memberships.`);

  console.log("Grouping students with no registration table (batches other than btechpeg23/24/25) into Major+Batch fallback sections...");
  const fallback = await ensureFallbackSectionsForUnregisteredStudents();
  console.log(`  ${fallback.studentCount} students across ${fallback.sectionCount} fallback sections (e.g. "CSE-btechcse25") - real major/batch data, no course-level registration available for them in the dump.`);

  console.log("Seeding demo quizzes in every status, against real courses/sections/faculty/students...");

  const now = new Date();

  const pe241Section = sections.get("PE241")!;
  const pe241Rolls = await pickStudentRolls(pe241Section.id, 3);
  await ensureCompletedDemoQuiz({
    title: "Reservoir Engineering I Midterm",
    courseId: courses.get("PE241")!.id,
    sectionId: pe241Section.id,
    sessionId: session.id,
    facultyRoll: "RF0210",
    buildingId: mainBlock.id,
    studentRolls: pe241Rolls,
    questionText: "Which property describes a reservoir rock's ability to store fluids?",
  });

  const pe331Section = sections.get("PE331")!;
  const pe331Rolls = await pickStudentRolls(pe331Section.id, 3);
  const draftQuiz = await ensureTimedDemoQuiz({
    title: "Offshore Technology Quiz 1 (Draft)",
    courseId: courses.get("PE331")!.id,
    sectionIds: [pe331Section.id],
    facultyRoll: "RF0240",
    buildingId: engBlock.id,
    status: "draft",
    startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    durationMinutes: 45,
    totalMarks: 10,
  });
  await ensureQuestionAndAllotments({ quizId: draftQuiz.id, questionText: "What is a jack-up rig primarily used for?", marks: 10, allotRolls: [] });

  const ece102Section = sections.get("ECE102")!;
  const ece102Rolls = await pickStudentRolls(ece102Section.id, 3);
  const scheduledQuiz = await ensureTimedDemoQuiz({
    title: "Electronics Fundamentals Pop Quiz (Scheduled)",
    courseId: courses.get("ECE102")!.id,
    sectionIds: [ece102Section.id],
    facultyRoll: "RF0259",
    buildingId: mainBlock.id,
    status: "scheduled",
    startTime: new Date(now.getTime() + 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 90 * 60 * 1000),
    durationMinutes: 30,
    totalMarks: 10,
  });
  await ensureQuestionAndAllotments({ quizId: scheduledQuiz.id, questionText: "A NAND gate is a universal gate. True or False?", marks: 10, allotRolls: ece102Rolls });

  const pe202Section = sections.get("PE202")!;
  const pe202Rolls = await pickStudentRolls(pe202Section.id, 3);
  const liveQuiz = await ensureTimedDemoQuiz({
    title: "Mechanical Engineering Fundamentals Live Test",
    courseId: courses.get("PE202")!.id,
    sectionIds: [pe202Section.id],
    facultyRoll: "RF0223",
    buildingId: mainBlock.id,
    status: "live",
    startTime: now,
    endTime: new Date(now.getTime() + 40 * 60 * 1000),
    durationMinutes: 40,
    totalMarks: 10,
    actualStartTime: now,
  });
  await ensureQuestionAndAllotments({
    quizId: liveQuiz.id,
    questionText: "Which law relates pressure, volume, and temperature of an ideal gas?",
    marks: 10,
    allotRolls: pe202Rolls,
    attemptedRoll: pe202Rolls[0],
  });

  console.log("\nSeed complete - built on real data from quizsample_db (2).sql.\n");
  console.log(`Super admin login: ${process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"} / (see SEED_ADMIN_PASSWORD in .env)`);
  console.log(`Every imported real account's password: ${DEMO_PASSWORD} (override with SEED_DEMO_PASSWORD in .env)`);
  console.log("  Admin:   ops.admin@example.com");
  console.log("  Faculty: any real roll from isr_faculty_tbl (e.g. RF0223, teaching the live quiz below) - look up its email in isr_login_tbl");
  console.log(`  Student: any real roll registered in isr_reg_btechpeg23/24/25_tbl for sub_list='C2'`);
  console.log("  Live now: \"Mechanical Engineering Fundamentals Live Test\" - visible on Admin > Live Tracking");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
