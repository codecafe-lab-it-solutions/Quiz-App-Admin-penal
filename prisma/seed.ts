import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncSection } from "@/lib/section-sync";

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

// A section is keyed by (name, exact set of linked courses) so re-running the
// seed doesn't create duplicates, but a single section can span multiple
// courses/batches (e.g. a merged section combining two courses' rosters).
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
  // Self-healing: this exact table is entirely owned/created by this seed
  // script (never real legacy data - a real isr_reg_<batch>_tbl in
  // production is never named "isr_reg_2025_tbl" and is never touched here).
  // An environment that ran an older version of this script already has the
  // table with the old `roll`/no-`sub_list` schema, and `CREATE TABLE IF NOT
  // EXISTS` below would silently skip it forever - so rebuild it if it's
  // missing either column, instead of leaving every later query 500ing.
  const columns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    tableName
  );
  const columnNames = new Set(columns.map((c) => c.COLUMN_NAME));
  const isStaleSchema = columnNames.size > 0 && (!columnNames.has("stu_roll") || !columnNames.has("sub_list"));
  if (isStaleSchema) {
    await prisma.$executeRawUnsafe(`DROP TABLE \`${tableName}\``);
  }

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

async function ensureCompletedDemoQuiz(params: { courseId: number; sectionId: number; sessionId: number; facultyRoll: string; buildingId: number }) {
  const existing = await prisma.quiz.findFirst({ where: { title: "Data Structures Midterm" } });
  if (existing) return existing;

  const start = new Date("2025-09-15T10:00:00Z");
  const end = new Date("2025-09-15T11:00:00Z");
  const attendanceDate = new Date("2025-09-15");

  const quiz = await prisma.quiz.create({
    data: {
      title: "Data Structures Midterm",
      courseId: params.courseId,
      sections: { create: [{ sectionId: params.sectionId }] },
      sessionId: params.sessionId,
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

// Draft/scheduled/live demo quizzes are meant to always look "current" no
// matter when the seed is (re-)run, so their time fields are refreshed every
// run; their questions/allotments are only created once (on first creation).
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
      data: {
        startTime: params.startTime,
        endTime: params.endTime,
        status: params.status,
        actualStartTime: params.actualStartTime ?? null,
      },
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
    await prisma.quizAllotment.create({
      data: { quizId: params.quizId, studentRoll: roll, status: attempted ? "attempted" : "allotted" },
    });
    if (attempted) {
      const attempt = await prisma.quizAttempt.create({
        data: { quizId: params.quizId, studentRoll: roll, status: "submitted", endTime: new Date() },
      });
      await prisma.studentAnswer.create({
        data: { attemptId: attempt.id, questionId: q.id, selectedOptionId: options[0].id, isCorrect: true, marksObtained: params.marks, orderIndex: 1 },
      });
    }
  }
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

  console.log("Seeding master data (departments, courses, sessions, buildings)...");

  const csDept = await ensureDepartment("Computer Science");
  const eceDept = await ensureDepartment("Electronics & Communication");
  const meDept = await ensureDepartment("Mechanical Engineering");
  const eeeDept = await ensureDepartment("Electrical Engineering");

  await ensureCourse({ name: "Data Structures", code: "CS201", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Database Systems", code: "CS301", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Computer Networks", code: "CS302", departmentId: csDept.id, credits: 3 });
  await ensureCourse({ name: "Digital Electronics", code: "EC201", departmentId: eceDept.id, credits: 3 });
  await ensureCourse({ name: "Thermodynamics", code: "ME201", departmentId: meDept.id, credits: 3 });
  await ensureCourse({ name: "Control Systems", code: "EE201", departmentId: eeeDept.id, credits: 3 });

  const session = await ensureSession("2025-26 Odd Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  const cs201 = await prisma.course.findUniqueOrThrow({ where: { code: "CS201" } });
  const cs301 = await prisma.course.findUniqueOrThrow({ where: { code: "CS301" } });
  const cs302 = await prisma.course.findUniqueOrThrow({ where: { code: "CS302" } });
  const ec201 = await prisma.course.findUniqueOrThrow({ where: { code: "EC201" } });
  const me201 = await prisma.course.findUniqueOrThrow({ where: { code: "ME201" } });
  const ee201 = await prisma.course.findUniqueOrThrow({ where: { code: "EE201" } });

  console.log("Seeding sections (including one merged, multi-course section)...");

  const cs201SectionA = await ensureSection("A", [cs201.id]);
  await ensureSection("B", [cs201.id]);
  const cs301SectionA = await ensureSection("A", [cs301.id]);
  const cs302SectionA = await ensureSection("A", [cs302.id]);
  const ec201SectionA = await ensureSection("A", [ec201.id]);
  const me201SectionA = await ensureSection("A", [me201.id]);
  const ee201SectionA = await ensureSection("A", [ee201.id]);
  // Demonstrates the "merged section spanning multiple courses/batches"
  // capability: one section whose membership is the union of both courses'
  // rosters, mixing students who are registered in either (or both).
  const mergedSection = await ensureSection("Combined A (CS201+CS302)", [cs201.id, cs302.id]);

  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("Seeding legacy directory (faculty, students across two batches)...");

  await ensureFaculty({ roll: "FAC2025001", name: "Dr. Ramesh Kumar", email: "ramesh.kumar@example.com" });
  await ensureFaculty({ roll: "FAC2025002", name: "Dr. Priya Sharma", email: "priya.sharma@example.com" });
  await ensureFaculty({ roll: "FAC2025003", name: "Dr. Arjun Mehta", email: "arjun.mehta@example.com" });
  await ensureFaculty({ roll: "FAC2025004", name: "Dr. Sunita Rao", email: "sunita.rao@example.com" });
  await ensureFaculty({ roll: "FAC2025005", name: "Dr. Vikram Nair", email: "vikram.nair@example.com" });

  // Batch 2025 (current, semester 3)
  await ensureStudent({ roll: "STU2025001", name: "Aarav Singh", email: "aarav.singh@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025002", name: "Diya Patel", email: "diya.patel@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025003", name: "Kabir Verma", email: "kabir.verma@example.com", major: "CSE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025004", name: "Ananya Reddy", email: "ananya.reddy@example.com", major: "ECE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025005", name: "Vihaan Joshi", email: "vihaan.joshi@example.com", major: "ME", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025006", name: "Ishaan Gupta", email: "ishaan.gupta@example.com", major: "ECE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025007", name: "Myra Kapoor", email: "myra.kapoor@example.com", major: "ECE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025008", name: "Reyansh Iyer", email: "reyansh.iyer@example.com", major: "ME", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025009", name: "Saanvi Nair", email: "saanvi.nair@example.com", major: "EEE", batch: "2025", semNow: "3" });
  await ensureStudent({ roll: "STU2025010", name: "Advait Rao", email: "advait.rao@example.com", major: "EEE", batch: "2025", semNow: "3" });

  // Batch 2024 (senior batch, semester 5) - registered into higher-level
  // courses, so CS301/CS302 rosters mix two batches, same as a real cohort.
  await ensureStudent({ roll: "STU2024001", name: "Aditi Sharma", email: "aditi.sharma@example.com", major: "CSE", batch: "2024", semNow: "5" });
  await ensureStudent({ roll: "STU2024002", name: "Kiaan Malhotra", email: "kiaan.malhotra@example.com", major: "CSE", batch: "2024", semNow: "5" });
  await ensureStudent({ roll: "STU2024003", name: "Riya Chatterjee", email: "riya.chatterjee@example.com", major: "CSE", batch: "2024", semNow: "5" });

  const currentSubList = (await ensureSemesterConfig()).currentSubList;
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "CS201", facRoll: "FAC2025001", branch: "CSE" });
  await ensureFacultyCourseMapping({ sem: "5", subList: currentSubList, subCode: "CS301", facRoll: "FAC2025002", branch: "CSE" });
  await ensureFacultyCourseMapping({ sem: "5", subList: currentSubList, subCode: "CS302", facRoll: "FAC2025005", branch: "CSE" });
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "EC201", facRoll: "FAC2025003", branch: "ECE" });
  await ensureFacultyCourseMapping({ sem: "3", subList: currentSubList, subCode: "EE201", facRoll: "FAC2025004", branch: "EEE" });

  console.log("Seeding course registrations across two batch tables...");

  const batch2025Table = "isr_reg_2025_tbl";
  const batch2024Table = "isr_reg_2024_tbl";
  await ensureBatchRegistrationTable("2025", batch2025Table);
  await ensureBatchRegistrationTable("2024", batch2024Table);

  await ensureStudentCourseRegistration(batch2025Table, "STU2025001", "CS201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025002", "CS201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025003", "CS201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025003", "CS301", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025001", "CS302", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025002", "CS302", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025004", "EC201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025006", "EC201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025007", "EC201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025005", "ME201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025008", "ME201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025009", "EE201", currentSubList);
  await ensureStudentCourseRegistration(batch2025Table, "STU2025010", "EE201", currentSubList);

  await ensureStudentCourseRegistration(batch2024Table, "STU2024001", "CS301", currentSubList);
  await ensureStudentCourseRegistration(batch2024Table, "STU2024002", "CS301", currentSubList);
  await ensureStudentCourseRegistration(batch2024Table, "STU2024001", "CS302", currentSubList);
  await ensureStudentCourseRegistration(batch2024Table, "STU2024003", "CS302", currentSubList);

  console.log("Syncing section membership from legacy rosters...");
  for (const section of [cs201SectionA, cs301SectionA, cs302SectionA, ec201SectionA, me201SectionA, ee201SectionA, mergedSection]) {
    await syncSection(section.id);
  }

  console.log("Seeding demo quizzes in every status (draft, scheduled, live, completed)...");

  const now = new Date();

  await ensureCompletedDemoQuiz({ courseId: cs201.id, sectionId: cs201SectionA.id, sessionId: session.id, facultyRoll: "FAC2025001", buildingId: mainBlock.id });

  const draftQuiz = await ensureTimedDemoQuiz({
    title: "Computer Networks Quiz 1 (Draft)",
    courseId: cs302.id,
    sectionIds: [cs302SectionA.id],
    facultyRoll: "FAC2025005",
    buildingId: engBlock.id,
    status: "draft",
    startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    durationMinutes: 45,
    totalMarks: 10,
  });
  await ensureQuestionAndAllotments({
    quizId: draftQuiz.id,
    questionText: "Which layer of the OSI model handles routing?",
    marks: 10,
    allotRolls: [],
  });

  const scheduledQuiz = await ensureTimedDemoQuiz({
    title: "Digital Electronics Pop Quiz (Scheduled)",
    courseId: ec201.id,
    sectionIds: [ec201SectionA.id],
    facultyRoll: "FAC2025003",
    buildingId: mainBlock.id,
    status: "scheduled",
    startTime: new Date(now.getTime() + 60 * 60 * 1000),
    endTime: new Date(now.getTime() + 90 * 60 * 1000),
    durationMinutes: 30,
    totalMarks: 10,
  });
  await ensureQuestionAndAllotments({
    quizId: scheduledQuiz.id,
    questionText: "A NAND gate is a universal gate. True or False?",
    marks: 10,
    allotRolls: ["STU2025004", "STU2025006", "STU2025007"],
  });

  const liveQuiz = await ensureTimedDemoQuiz({
    title: "Database Systems Live Test",
    courseId: cs301.id,
    sectionIds: [cs301SectionA.id],
    facultyRoll: "FAC2025002",
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
    questionText: "Which normal form eliminates transitive dependency?",
    marks: 10,
    allotRolls: ["STU2025003", "STU2024001", "STU2024002"],
    attemptedRoll: "STU2024001",
  });

  console.log("\nSeed complete.\n");
  console.log(`Super admin login: ${process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"} / (see SEED_ADMIN_PASSWORD in .env)`);
  console.log(`Demo admin/faculty/student accounts password: ${DEMO_PASSWORD} (override with SEED_DEMO_PASSWORD in .env)`);
  console.log("  Admin:    ops.admin@example.com");
  console.log("  Faculty:  FAC2025001 / ramesh.kumar@example.com  (and FAC2025002-005)");
  console.log("  Students: STU2025001 / aarav.singh@example.com   (and STU2025002-010, STU2024001-003)");
  console.log("  Live now: \"Database Systems Live Test\" - visible on Admin > Live Tracking");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
