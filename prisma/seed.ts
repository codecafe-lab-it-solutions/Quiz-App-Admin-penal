import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getRealMajors, resolveMajorFromBranch, getCourseRegistrations, getCourseTitleByCode } from "@/lib/legacy-db";
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

// Real registrants for a course, sorted for determinism - used to pick a
// handful of demo participants per demo quiz.
async function pickRegisteredStudents(subCode: string, subList: string, count: number): Promise<string[]> {
  const registrations = await getCourseRegistrations(subCode, subList);
  return [...new Set(registrations.map((r) => r.roll))].sort().slice(0, count);
}

// --- Demo quiz builders (course/section/faculty/roll identity is real; the
// quiz shell, questions, and outcomes around them are still made up, since
// none of that exists in the legacy dump) -----------------------------------

async function ensureCompletedDemoQuiz(params: {
  title: string;
  courseCode: string;
  courseName: string;
  sectionNames: string;
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
      courseCode: params.courseCode,
      courseName: params.courseName,
      sectionNames: params.sectionNames,
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
  await prisma.attendance.create({ data: { studentRoll: first, courseCode: params.courseCode, courseName: params.courseName, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: first, marksObtained: 10, percentage: 100, status: "published", declaredAt: end, publishedAt: end } });

  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: second, status: "attempted" } });
  const attempt2 = await prisma.quizAttempt.create({ data: { quizId: quiz.id, studentRoll: second, startTime: start, endTime: end, status: "submitted" } });
  await prisma.studentAnswer.create({ data: { attemptId: attempt2.id, questionId: q.id, selectedOptionId: options[1].id, isCorrect: false, marksObtained: 0, orderIndex: 1 } });
  await prisma.attendance.create({ data: { studentRoll: second, courseCode: params.courseCode, courseName: params.courseName, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: second, marksObtained: 0, percentage: 0, status: "published", declaredAt: end, publishedAt: end } });

  for (const roll of rest.slice(0, 1)) {
    await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: roll, status: "absent" } });
    await prisma.attendance.create({ data: { studentRoll: roll, courseCode: params.courseCode, courseName: params.courseName, quizId: quiz.id, date: attendanceDate, status: "absent" } });
  }

  return quiz;
}

async function ensureTimedDemoQuiz(params: {
  title: string;
  courseCode: string;
  courseName: string;
  sectionNames: string;
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
      courseCode: params.courseCode,
      courseName: params.courseName,
      sectionNames: params.sectionNames,
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

// Labels isr_sub_available_tbl.section for EVERY real sub_list (not just the
// current cycle) - e.g. old "c1" rows the dump also carries - so quiz
// creation's live section picker (getRealSectionsForFacultyCourse) always has
// a real name to resolve, for any cycle. Section identity is otherwise
// entirely derived at request time (no app-owned Section table since
// 2026-08-18), so this is the only "section" bootstrapping seed needs to do.
async function backfillSectionColumnAcrossAllCycles(): Promise<number> {
  const realMajors = await getRealMajors();
  const rows = await prisma.isrSubAvailableTbl.findMany({
    where: { branch: { not: null }, sem: { not: null } },
    select: { id: true, branch: true, sem: true },
  });

  for (const row of rows) {
    const major = resolveMajorFromBranch(row.branch!, realMajors);
    await prisma.isrSubAvailableTbl.update({
      where: { id: row.id },
      data: { section: `${major.trim()}_${row.sem}` },
    });
  }
  return rows.length;
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

  // Same one-time-bootstrap guard as importRealLegacyData, and for the same
  // reason: this block unconditionally deletes EVERY quiz app-wide, then
  // rebuilds only a fixed set of demo quizzes. On an already-live system that
  // means every real quiz a real faculty member created (anything other than
  // the 3 hardcoded demo quizzes below) is deleted on every deploy and never
  // comes back - confirmed happening in production via post-deploy.sh's
  // unconditional `prisma db seed`. Only ever safe to run against a genuinely
  // fresh/empty database, which importResult.imported already tells us.
  if (!importResult.imported) {
    console.log(
      "Skipping demo quiz rebuild - real data already exists, so it's not a fresh bootstrap (this only ever runs once, against an empty database)."
    );
    return;
  }

  console.log("Clearing previously-seeded demo quizzes...");
  // Quiz cascades to Question/QuestionOption/QuestionFormula/QuizAllotment/
  // QuizAttempt/StudentAnswer/GeofenceLog/Attendance/Result (all
  // onDelete: Cascade in schema.prisma).
  await prisma.quiz.deleteMany({});

  console.log("Labeling isr_sub_available_tbl.section for every real cycle - this is the only source of section identity now (no app-owned Section table)...");
  const labeledRows = await backfillSectionColumnAcrossAllCycles();
  console.log(`  ${labeledRows} rows labeled.`);

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Seeding demo quizzes in every status, against real courses/faculty/students...");

  const now = new Date();

  // PE202/PE241/ECE102 are all dominated by the real PE_3 cohort (66 real
  // registrants each - confirmed by query); PE331 is dominated by PE_5 (56
  // real registrants). Picked for the same reason as before: real faculty +
  // a healthy real roster, not because they're special otherwise.
  const pe241Title = await getCourseTitleByCode("PE241", currentSubList);
  const pe331Title = await getCourseTitleByCode("PE331", currentSubList);
  const ece102Title = await getCourseTitleByCode("ECE102", currentSubList);
  const pe202Title = await getCourseTitleByCode("PE202", currentSubList);

  const pe241Rolls = await pickRegisteredStudents("PE241", currentSubList, 3);
  if (pe241Rolls.length >= 2) {
    await ensureCompletedDemoQuiz({
      title: "Reservoir Engineering I Midterm",
      courseCode: "PE241",
      courseName: pe241Title,
      sectionNames: "PE_3",
      facultyRoll: "RF0210",
      buildingId: mainBlock.id,
      studentRolls: pe241Rolls,
      questionText: "Which property describes a reservoir rock's ability to store fluids?",
    });
  }

  const pe331Rolls = await pickRegisteredStudents("PE331", currentSubList, 3);
  if (pe331Rolls.length > 0) {
    const draftQuiz = await ensureTimedDemoQuiz({
      title: "Offshore Technology Quiz 1 (Draft)",
      courseCode: "PE331",
      courseName: pe331Title,
      sectionNames: "PE_5",
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

  const ece102Rolls = await pickRegisteredStudents("ECE102", currentSubList, 3);
  if (ece102Rolls.length > 0) {
    const scheduledQuiz = await ensureTimedDemoQuiz({
      title: "Electronics Fundamentals Pop Quiz (Scheduled)",
      courseCode: "ECE102",
      courseName: ece102Title,
      sectionNames: "PE_3",
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

  const pe202Rolls = await pickRegisteredStudents("PE202", currentSubList, 3);
  if (pe202Rolls.length > 0) {
    const liveQuiz = await ensureTimedDemoQuiz({
      title: "Mechanical Engineering Fundamentals Live Test",
      courseCode: "PE202",
      courseName: pe202Title,
      sectionNames: "PE_3",
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
