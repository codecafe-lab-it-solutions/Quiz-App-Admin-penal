import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncSection } from "@/lib/section-sync";
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

const REAL_COURSES = [
  { code: "MA222", name: "Applied Mathematics-III", department: "Common Engineering (Core)", credits: 11, facRoll: "RF0009" },
  { code: "ECE102", name: "Fundamentals of Electronics Engineering", department: "Common Engineering (Core)", credits: 13, facRoll: "RF0259" },
  { code: "ME211", name: "Fluid Machinery", department: "Mechanical Engineering", credits: 9, facRoll: "RF0205" },
  { code: "PE202", name: "Fundamentals of Mechanical Engineering", department: "Petroleum Engineering", credits: 9, facRoll: "RF0223" },
  { code: "PE221", name: "Introductory Geosciences", department: "Petroleum Engineering", credits: 6, facRoll: "RF0028" },
  { code: "PE241", name: "Reservoir Engineering I", department: "Petroleum Engineering", credits: 11, facRoll: "RF0210" },
  { code: "PE331", name: "Offshore Oil and Gas Technology", department: "Petroleum Engineering", credits: 9, facRoll: "RF0240" },
  { code: "PE402", name: "Health, Safety and Environment", department: "Petroleum Engineering", credits: 2, facRoll: "RF0141" },
] as const;

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

  await ensureSemesterConfig();

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

  console.log("Building the Course/Department catalog from real, verified-interconnected courses...");

  const departmentIds = new Map<string, number>();
  for (const dept of new Set(REAL_COURSES.map((c) => c.department))) {
    const row = await ensureDepartment(dept);
    departmentIds.set(dept, row.id);
  }

  const courses = new Map<string, Awaited<ReturnType<typeof ensureCourse>>>();
  for (const c of REAL_COURSES) {
    const course = await ensureCourse({
      name: c.name,
      code: c.code,
      departmentId: departmentIds.get(c.department)!,
      credits: c.credits,
    });
    courses.set(c.code, course);
  }

  const session = await ensureSession("C2 Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Creating one section per real course and syncing rosters from the real legacy data...");

  const sections = new Map<string, Awaited<ReturnType<typeof ensureSection>>>();
  for (const c of REAL_COURSES) {
    const course = courses.get(c.code)!;
    const section = await ensureSection("A", [course.id]);
    sections.set(c.code, section);
    // syncSection reads SemesterConfig.currentSubList + BatchTableRegistry -
    // both now pointed at the real data - and pulls the real faculty (from
    // isr_sub_available_tbl) and real registered students (from the three
    // isr_reg_btechpeg<batch>_tbl tables) into SectionFaculty/SectionStudent.
    await syncSection(section.id);
  }

  const rosterCounts = await Promise.all(
    REAL_COURSES.map(async (c) => {
      const section = sections.get(c.code)!;
      const count = await prisma.sectionStudent.count({ where: { sectionId: section.id, source: { not: "manual_removed" } } });
      return `${c.code}: ${count} students`;
    })
  );
  console.log("  Rosters synced from real registrations -", rosterCounts.join(", "));

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
  console.log(`  Faculty: any real roll from isr_faculty_tbl (e.g. ${REAL_COURSES[0].facRoll}) - look up its email in isr_login_tbl`);
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
