import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";

function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// ---------------------------------------------------------------------------
// Idempotent "ensure" helpers - every one of these is safe to call on every
// deploy. Nothing here is gated behind a single "has seeding run before?"
// check, so adding a new ensure* call always takes effect on the next
// `npx prisma db seed`, even on an environment that was already seeded.
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

async function ensureSection(name: string, courseId: number, sessionId: number) {
  const existing = await prisma.section.findFirst({ where: { name, courseId, sessionId } });
  if (existing) return existing;
  return prisma.section.create({ data: { name, courseId, sessionId } });
}

async function ensureBuilding(data: { name: string; latitude: number; longitude: number; radiusMeters: number }) {
  const existing = await prisma.building.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.building.create({ data });
}

// The "current" semester-cycle code driving legacy course-mapping filters
// (isr_sub_available_tbl.sub_list) — admin-editable via Settings > Semester Config.
async function ensureSemesterConfig() {
  const existing = await prisma.semesterConfig.findFirst();
  if (existing) return existing;
  return prisma.semesterConfig.create({ data: { currentSubList: "C2" } });
}

// --- Legacy directory (isr_* tables) ----------------------------------------
// Demo faculty/student identities, written the same way the admin panel's
// own "Add Faculty" / "Add Student" forms do (see src/lib/legacy-db.ts).

async function ensureLegacyLogin(data: { roll: string; email: string; password: string; userType: "FAC" | "STU" }) {
  return prisma.isrLoginTbl.upsert({
    where: { userRoll: data.roll },
    update: {},
    create: { userRoll: data.roll, userEmail: data.email, userPassword: await hash(data.password), userType: data.userType },
  });
}

async function ensureFaculty(data: { roll: string; name: string; email: string }) {
  await ensureLegacyLogin({ roll: data.roll, email: data.email, password: DEMO_PASSWORD, userType: "FAC" });
  return prisma.isrFacultyTbl.upsert({ where: { roll: data.roll }, update: { name: data.name }, create: { roll: data.roll, name: data.name } });
}

async function ensureStudent(data: { roll: string; name: string; email: string; major: string; batch: string; semNow: string }) {
  await ensureLegacyLogin({ roll: data.roll, email: data.email, password: DEMO_PASSWORD, userType: "STU" });
  await prisma.isrStuDataTbl.upsert({
    where: { stuRoll: data.roll },
    update: { stuName: data.name },
    create: { stuRoll: data.roll, stuName: data.name },
  });
  return prisma.isrStuMainTbl.upsert({
    where: { roll: data.roll },
    update: { major: data.major, batch: data.batch, semNow: data.semNow, name: data.name },
    create: { roll: data.roll, major: data.major, batch: data.batch, semNow: data.semNow, name: data.name },
  });
}

async function ensureFacultyCourseMapping(data: { sem: string; subList: string; subCode: string; facRoll: string; branch: string }) {
  const existing = await prisma.isrSubAvailableTbl.findFirst({
    where: { subList: data.subList, subCode: data.subCode, facRoll: data.facRoll },
  });
  if (existing) return existing;
  return prisma.isrSubAvailableTbl.create({ data });
}

// isr_reg_<batch>_tbl is a dynamic, per-batch table (see BatchTableRegistry /
// src/lib/legacy-db.ts) - not a Prisma model, so it's created with raw SQL.
// Column names (`stu_roll`, `sub_code`, `sub_list`) match the confirmed
// real legacy schema legacy-db.ts reads/writes everywhere it touches this table.
async function ensureBatchRegistrationTable(batchName: string, tableName: string) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stu_roll VARCHAR(50) NOT NULL,
      sub_code VARCHAR(50) NOT NULL,
      sub_list VARCHAR(20) NOT NULL
    )
  `);
  await prisma.batchTableRegistry.upsert({
    where: { batchName },
    update: { tableName, isActive: true },
    create: { batchName, tableName, isActive: true },
  });
}

async function ensureStudentCourseRegistration(tableName: string, roll: string, subCode: string, subList: string) {
  const existing = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE \`stu_roll\` = ? AND \`sub_code\` = ? AND \`sub_list\` = ?`,
    roll,
    subCode,
    subList
  );
  if (Number(existing[0]?.cnt ?? 0) > 0) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\` (\`stu_roll\`, \`sub_code\`, \`sub_list\`) VALUES (?, ?, ?)`,
    roll,
    subCode,
    subList
  );
}

// --- Demo quiz (populates Attendance report / Dashboard stats) -------------

async function ensureDemoQuiz(params: { courseId: number; sectionId: number; facultyRoll: string; buildingId: number }) {
  const existing = await prisma.quiz.findFirst({ where: { title: "Data Structures Midterm" } });
  if (existing) return existing;

  const start = new Date("2025-09-15T10:00:00Z");
  const end = new Date("2025-09-15T11:00:00Z");
  const attendanceDate = new Date("2025-09-15");

  const quiz = await prisma.quiz.create({
    data: {
      title: "Data Structures Midterm",
      courseId: params.courseId,
      sectionId: params.sectionId,
      facultyRoll: params.facultyRoll,
      buildingId: params.buildingId,
      startTime: start,
      endTime: end,
      durationMinutes: 60,
      totalMarks: 20,
      randomize: true,
      negativeMarking: false,
      allowSkipSwitch: true,
      status: "completed",
      actualStartTime: start,
      actualStopTime: end,
    },
  });

  const q1 = await prisma.question.create({
    data: { quizId: quiz.id, questionText: "Which data structure uses FIFO order?", questionType: "mcq", marks: 10, negativeMarks: 0, orderIndex: 1 },
  });
  const q1Options = await Promise.all([
    prisma.questionOption.create({ data: { questionId: q1.id, optionText: "Stack", isCorrect: false } }),
    prisma.questionOption.create({ data: { questionId: q1.id, optionText: "Queue", isCorrect: true } }),
    prisma.questionOption.create({ data: { questionId: q1.id, optionText: "Tree", isCorrect: false } }),
    prisma.questionOption.create({ data: { questionId: q1.id, optionText: "Graph", isCorrect: false } }),
  ]);

  const q2 = await prisma.question.create({
    data: { quizId: quiz.id, questionText: "What is the time complexity of binary search?", questionType: "mcq", marks: 10, negativeMarks: 0, orderIndex: 2 },
  });
  const q2Options = await Promise.all([
    prisma.questionOption.create({ data: { questionId: q2.id, optionText: "O(n)", isCorrect: false } }),
    prisma.questionOption.create({ data: { questionId: q2.id, optionText: "O(log n)", isCorrect: true } }),
    prisma.questionOption.create({ data: { questionId: q2.id, optionText: "O(n^2)", isCorrect: false } }),
    prisma.questionOption.create({ data: { questionId: q2.id, optionText: "O(1)", isCorrect: false } }),
  ]);

  // Student 1: attempted, both correct
  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: "STU2025001", status: "attempted" } });
  const attempt1 = await prisma.quizAttempt.create({
    data: { quizId: quiz.id, studentRoll: "STU2025001", startTime: start, endTime: end, status: "submitted" },
  });
  await prisma.studentAnswer.create({ data: { attemptId: attempt1.id, questionId: q1.id, selectedOptionId: q1Options[1].id, isCorrect: true, marksObtained: 10, orderIndex: 1 } });
  await prisma.studentAnswer.create({ data: { attemptId: attempt1.id, questionId: q2.id, selectedOptionId: q2Options[1].id, isCorrect: true, marksObtained: 10, orderIndex: 2 } });
  await prisma.attendance.create({ data: { studentRoll: "STU2025001", courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: "STU2025001", marksObtained: 20, percentage: 100, status: "published", declaredAt: end, publishedAt: end } });

  // Student 2: attempted, one correct
  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: "STU2025002", status: "attempted" } });
  const attempt2 = await prisma.quizAttempt.create({
    data: { quizId: quiz.id, studentRoll: "STU2025002", startTime: start, endTime: end, status: "submitted" },
  });
  await prisma.studentAnswer.create({ data: { attemptId: attempt2.id, questionId: q1.id, selectedOptionId: q1Options[1].id, isCorrect: true, marksObtained: 10, orderIndex: 1 } });
  await prisma.studentAnswer.create({ data: { attemptId: attempt2.id, questionId: q2.id, selectedOptionId: q2Options[0].id, isCorrect: false, marksObtained: 0, orderIndex: 2 } });
  await prisma.attendance.create({ data: { studentRoll: "STU2025002", courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "present" } });
  await prisma.result.create({ data: { quizId: quiz.id, studentRoll: "STU2025002", marksObtained: 10, percentage: 50, status: "published", declaredAt: end, publishedAt: end } });

  // Student 3: allotted but absent
  await prisma.quizAllotment.create({ data: { quizId: quiz.id, studentRoll: "STU2025003", status: "absent" } });
  await prisma.attendance.create({ data: { studentRoll: "STU2025003", courseId: params.courseId, quizId: quiz.id, date: attendanceDate, status: "absent" } });

  return quiz;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureAdminUser({
    name: "Super Admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
    role: "super_admin",
  });
  await ensureAdminUser({ name: "Ops Admin", email: "ops.admin@example.com", password: DEMO_PASSWORD, role: "admin" });
  await ensureSemesterConfig();

  console.log("Seeding master data...");

  const csDept = await ensureDepartment("Computer Science");
  const eceDept = await ensureDepartment("Electronics & Communication");
  const meDept = await ensureDepartment("Mechanical Engineering");

  await ensureCourse({ name: "Data Structures", code: "CS201", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Database Systems", code: "CS301", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Digital Electronics", code: "EC201", departmentId: eceDept.id, credits: 3 });
  await ensureCourse({ name: "Thermodynamics", code: "ME201", departmentId: meDept.id, credits: 3 });

  const session = await ensureSession("2025-26 Odd Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  // Sections (kept for quiz scheduling metadata — no confirmed legacy source yet, see schema TODOs)
  const cs201 = await prisma.course.findUniqueOrThrow({ where: { code: "CS201" } });
  const cs301 = await prisma.course.findUniqueOrThrow({ where: { code: "CS301" } });
  const ec201 = await prisma.course.findUniqueOrThrow({ where: { code: "EC201" } });
  const me201 = await prisma.course.findUniqueOrThrow({ where: { code: "ME201" } });
  const cs201SectionA = await ensureSection("A", cs201.id, session.id);
  await ensureSection("B", cs201.id, session.id);
  await ensureSection("A", cs301.id, session.id);
  await ensureSection("A", ec201.id, session.id);
  await ensureSection("A", me201.id, session.id);

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Seeding legacy directory (faculty, students, mappings)...");

  await ensureFaculty({ roll: "FAC2025001", name: "Dr. Ramesh Kumar", email: "ramesh.kumar@example.com" });
  await ensureFaculty({ roll: "FAC2025002", name: "Dr. Priya Sharma", email: "priya.sharma@example.com" });
  await ensureFaculty({ roll: "FAC2025003", name: "Dr. Arjun Mehta", email: "arjun.mehta@example.com" });

  await ensureStudent({ roll: "STU2025001", name: "Aarav Singh", email: "aarav.singh@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025002", name: "Diya Patel", email: "diya.patel@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025003", name: "Kabir Verma", email: "kabir.verma@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025004", name: "Ananya Reddy", email: "ananya.reddy@example.com", major: "ECE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025005", name: "Vihaan Joshi", email: "vihaan.joshi@example.com", major: "ME", batch: "2025", semNow: "3" });

  const currentSubList = (await ensureSemesterConfig()).currentSubList;
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "CS201", facRoll: "FAC2025001", branch: "CSE" });
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "CS301", facRoll: "FAC2025002", branch: "CSE" });
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "EC201", facRoll: "FAC2025003", branch: "ECE" });

  const batchTable = "isr_reg_2025_tbl";
  await ensureBatchRegistrationTable("2025", batchTable);
  await ensureStudentCourseRegistration(batchTable, "STU2025001", "CS201", currentSubList);
  await ensureStudentCourseRegistration(batchTable, "STU2025002", "CS201", currentSubList);
  await ensureStudentCourseRegistration(batchTable, "STU2025003", "CS301", currentSubList);
  await ensureStudentCourseRegistration(batchTable, "STU2025004", "EC201", currentSubList);
  await ensureStudentCourseRegistration(batchTable, "STU2025005", "ME201", currentSubList);

  console.log("Seeding a demo completed quiz (attendance + results)...");
  await ensureDemoQuiz({ courseId: cs201.id, sectionId: cs201SectionA.id, facultyRoll: "FAC2025001", buildingId: mainBlock.id });

  console.log("\nSeed complete.\n");
  console.log(`Super admin login: ${process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"} / (see SEED_ADMIN_PASSWORD in .env)`);
  console.log(`Demo admin/faculty/student accounts password: ${DEMO_PASSWORD} (override with SEED_DEMO_PASSWORD in .env)`);
  console.log("  Admin:    ops.admin@example.com");
  console.log("  Faculty:  FAC2025001 / ramesh.kumar@example.com  (and FAC2025002, FAC2025003)");
  console.log("  Students: STU2025001 / aarav.singh@example.com   (and STU2025002-005)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
