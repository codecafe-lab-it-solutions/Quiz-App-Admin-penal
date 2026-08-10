import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addManualSectionStudent, addManualSectionFaculty } from "@/lib/section-sync";
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

// One section per (major, semester) cohort - names are unique by construction
// (each cohort key only ever gets processed once per run), so a plain name
// match is enough; no need for the "match on exact course set" logic a
// generic reusable ensureSection would need.
async function ensureSectionByName(name: string) {
  const existing = await prisma.section.findFirst({ where: { name } });
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
// The single section model: one Section per real (Major, current Semester)
// cohort - every student, always, no exceptions and no second naming scheme.
//
// Why not "one section per course" (this app's earlier design): the real
// data's own tables have no section/slot concept at all (confirmed directly
// - isr_sub_available_tbl.slot and .sem_list are NULL on every real C2 row),
// and a real course is routinely shared across many different majors at once
// (e.g. "CDC" is taken by 9 different branches, all at semester 7 - confirmed
// against the real data). One-section-per-course would mean a course's
// entire real roster - across every major that takes it - dumps into the
// same section, which isn't what a "section" should mean.
//
// So instead: a cohort's membership comes directly from Major+Semester
// matching on isr_stu_main_tbl (never from a shared course's combined
// roster, which is exactly the cross-contamination that model would cause).
// The real courses that cohort's own students are actually registered for
// (and the real faculty teaching those courses) get linked to that same
// cohort's section - enrichment, not a second section type. A cohort with no
// real registrations (their batch has no isr_reg_<batch>_tbl in the dump)
// still gets a section, just with no linked courses/faculty - same section
// model, not a different fallback kind.
// ---------------------------------------------------------------------------

interface CohortBuildResult {
  sections: Map<string, Awaited<ReturnType<typeof ensureSectionByName>>>;
  courses: Map<string, Awaited<ReturnType<typeof ensureCourse>>>;
  coursesByRoll: Map<string, Set<string>>;
  cohortCount: number;
  studentCount: number;
  courseLinkCount: number;
  facultyLinkCount: number;
}

function pickRegisteredStudents(coursesByRoll: Map<string, Set<string>>, subCode: string, count: number): string[] {
  const rolls: string[] = [];
  for (const [roll, codes] of coursesByRoll) {
    if (codes.has(subCode)) rolls.push(roll);
  }
  return rolls.sort().slice(0, count);
}

async function buildCohortSections(subList: string): Promise<CohortBuildResult> {
  const allStudents = await prisma.isrStuMainTbl.findMany({ select: { roll: true, major: true, semNow: true } });

  // Every real registration, loaded once (not per-cohort) - roll -> the set
  // of real course codes they're actually registered for.
  const allRegs = await prisma.$queryRawUnsafe<{ stu_roll: string; sub_code: string }[]>(
    `
    SELECT stu_roll, sub_code FROM isr_reg_btechpeg23_tbl WHERE sub_list = ? AND sub_code IS NOT NULL AND stu_roll IS NOT NULL
    UNION ALL SELECT stu_roll, sub_code FROM isr_reg_btechpeg24_tbl WHERE sub_list = ? AND sub_code IS NOT NULL AND stu_roll IS NOT NULL
    UNION ALL SELECT stu_roll, sub_code FROM isr_reg_btechpeg25_tbl WHERE sub_list = ? AND sub_code IS NOT NULL AND stu_roll IS NOT NULL
    `,
    subList, subList, subList
  );
  const coursesByRoll = new Map<string, Set<string>>();
  for (const r of allRegs) {
    const set = coursesByRoll.get(r.stu_roll) ?? new Set<string>();
    set.add(r.sub_code);
    coursesByRoll.set(r.stu_roll, set);
  }

  // Every real faculty assignment, loaded once - course code -> the set of
  // real faculty rolls teaching it.
  const allFac = await prisma.isrSubAvailableTbl.findMany({
    where: { subList, facRoll: { not: null }, subCode: { not: null } },
    select: { subCode: true, facRoll: true },
  });
  const facultyByCourse = new Map<string, Set<string>>();
  for (const f of allFac) {
    const set = facultyByCourse.get(f.subCode!) ?? new Set<string>();
    set.add(f.facRoll!);
    facultyByCourse.set(f.subCode!, set);
  }

  // Course metadata, loaded once - real curriculum title/branch/credits,
  // falling back to isr_sub_available_tbl's branch for courses curriculum
  // doesn't cover (matches the same fallback getFacultyCourseCatalog uses).
  const curriculumRows = await prisma.$queryRawUnsafe<{ subCode: string; title: string; branch: string | null; credits: number }[]>(
    `SELECT bsms_code AS subCode, MIN(title) AS title, MIN(bsms_branch) AS branch, MIN(bsms_credit) AS credits
     FROM isr_curriculum_tbl WHERE sub_list = ? GROUP BY bsms_code`,
    subList
  );
  const curriculumByCode = new Map(curriculumRows.map((c) => [c.subCode, c]));
  const branchFallbackRows = await prisma.$queryRawUnsafe<{ subCode: string; branch: string }[]>(
    `SELECT sub_code AS subCode, MIN(branch) AS branch FROM isr_sub_available_tbl WHERE sub_list = ? AND branch IS NOT NULL GROUP BY sub_code`,
    subList
  );
  const branchFallback = new Map(branchFallbackRows.map((b) => [b.subCode, b.branch]));

  const byCohort = new Map<string, string[]>();
  for (const s of allStudents) {
    const key = `${s.major}-${s.semNow}`;
    const rolls = byCohort.get(key) ?? [];
    rolls.push(s.roll);
    byCohort.set(key, rolls);
  }

  const sections = new Map<string, Awaited<ReturnType<typeof ensureSectionByName>>>();
  const courses = new Map<string, Awaited<ReturnType<typeof ensureCourse>>>();
  const departmentIds = new Map<string, number>();
  let studentCount = 0;
  let courseLinkCount = 0;
  let facultyLinkCount = 0;

  for (const [key, rolls] of byCohort) {
    const section = await ensureSectionByName(key);
    sections.set(key, section);

    for (const roll of rolls) {
      await addManualSectionStudent(section.id, roll);
    }
    studentCount += rolls.length;

    const cohortCourseCodes = new Set<string>();
    for (const roll of rolls) {
      const set = coursesByRoll.get(roll);
      if (set) for (const code of set) cohortCourseCodes.add(code);
    }

    const cohortFacultyRolls = new Set<string>();
    for (const code of cohortCourseCodes) {
      let course = courses.get(code);
      if (!course) {
        const meta = curriculumByCode.get(code);
        const branch = meta?.branch ?? branchFallback.get(code) ?? "General";
        if (!departmentIds.has(branch)) {
          const dept = await ensureDepartment(branch);
          departmentIds.set(branch, dept.id);
        }
        course = await ensureCourse({
          name: meta?.title ?? code,
          code,
          departmentId: departmentIds.get(branch)!,
          // MIN() on an INT column comes back as a JS bigint via the raw
          // query driver - coerce to a plain number for the Int column.
          credits: Number(meta?.credits ?? 0),
        });
        courses.set(code, course);
      }
      await prisma.sectionCourse.create({ data: { sectionId: section.id, courseId: course.id } });
      courseLinkCount++;

      const facRolls = facultyByCourse.get(code);
      if (facRolls) for (const fr of facRolls) cohortFacultyRolls.add(fr);
    }

    for (const fr of cohortFacultyRolls) {
      await addManualSectionFaculty(section.id, fr);
      facultyLinkCount++;
    }
  }

  return { sections, courses, coursesByRoll, cohortCount: byCohort.size, studentCount, courseLinkCount, facultyLinkCount };
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

  const currentSubList = (await ensureSemesterConfig()).currentSubList;

  console.log("Clearing previously-seeded app-domain data (quizzes/sections/courses)...");
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

  console.log("Building one section per real Major+Semester cohort, with real courses/faculty linked from actual registrations (this covers every student, so it takes a minute)...");
  const cohorts = await buildCohortSections(currentSubList);
  console.log(
    `  ${cohorts.cohortCount} cohort sections, ${cohorts.studentCount} real student memberships, ` +
      `${cohorts.courses.size} real courses discovered, ${cohorts.courseLinkCount} course links, ${cohorts.facultyLinkCount} faculty memberships.`
  );

  const session = await ensureSession("C2 Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Seeding demo quizzes in every status, against real cohorts/courses/faculty/students...");

  const now = new Date();

  // PE202/PE241/ECE102 are all dominated by the real PE-3 cohort (66 real
  // registrants each - confirmed by query); PE331 is dominated by PE-5 (56
  // real registrants). Picked for the same reason as before: real faculty +
  // a healthy real roster, not because they're special otherwise.
  const pe3Section = cohorts.sections.get("PE-3");
  const pe5Section = cohorts.sections.get("PE-5");

  if (pe3Section && cohorts.courses.has("PE241")) {
    const pe241Rolls = pickRegisteredStudents(cohorts.coursesByRoll, "PE241", 3);
    await ensureCompletedDemoQuiz({
      title: "Reservoir Engineering I Midterm",
      courseId: cohorts.courses.get("PE241")!.id,
      sectionId: pe3Section.id,
      sessionId: session.id,
      facultyRoll: "RF0210",
      buildingId: mainBlock.id,
      studentRolls: pe241Rolls,
      questionText: "Which property describes a reservoir rock's ability to store fluids?",
    });
  }

  if (pe5Section && cohorts.courses.has("PE331")) {
    const draftQuiz = await ensureTimedDemoQuiz({
      title: "Offshore Technology Quiz 1 (Draft)",
      courseId: cohorts.courses.get("PE331")!.id,
      sectionIds: [pe5Section.id],
      facultyRoll: "RF0240",
      buildingId: engBlock.id,
      status: "draft",
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      durationMinutes: 45,
      totalMarks: 10,
    });
    await ensureQuestionAndAllotments({ quizId: draftQuiz.id, questionText: "What is a jack-up rig primarily used for?", marks: 10, allotRolls: [] });
  }

  if (pe3Section && cohorts.courses.has("ECE102")) {
    const ece102Rolls = pickRegisteredStudents(cohorts.coursesByRoll, "ECE102", 3);
    const scheduledQuiz = await ensureTimedDemoQuiz({
      title: "Electronics Fundamentals Pop Quiz (Scheduled)",
      courseId: cohorts.courses.get("ECE102")!.id,
      sectionIds: [pe3Section.id],
      facultyRoll: "RF0259",
      buildingId: mainBlock.id,
      status: "scheduled",
      startTime: new Date(now.getTime() + 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 90 * 60 * 1000),
      durationMinutes: 30,
      totalMarks: 10,
    });
    await ensureQuestionAndAllotments({ quizId: scheduledQuiz.id, questionText: "A NAND gate is a universal gate. True or False?", marks: 10, allotRolls: ece102Rolls });
  }

  if (pe3Section && cohorts.courses.has("PE202")) {
    const pe202Rolls = pickRegisteredStudents(cohorts.coursesByRoll, "PE202", 3);
    const liveQuiz = await ensureTimedDemoQuiz({
      title: "Mechanical Engineering Fundamentals Live Test",
      courseId: cohorts.courses.get("PE202")!.id,
      sectionIds: [pe3Section.id],
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
  }

  console.log("\nSeed complete - built on real data from quizsample_db (2).sql.\n");
  console.log(`Super admin login: ${process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"} / (see SEED_ADMIN_PASSWORD in .env)`);
  console.log(`Every imported real account's password: ${DEMO_PASSWORD} (override with SEED_DEMO_PASSWORD in .env)`);
  console.log("  Admin:   ops.admin@example.com");
  console.log("  Faculty: any real roll from isr_faculty_tbl (e.g. RF0223, teaching the live quiz below) - look up its email in isr_login_tbl");
  console.log("  Student: any real roll registered in isr_reg_btechpeg23/24/25_tbl for sub_list='C2'");
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
