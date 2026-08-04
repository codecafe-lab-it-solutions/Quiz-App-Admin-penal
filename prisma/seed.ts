import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FACULTY_PASSWORD = "Faculty@123";
const STUDENT_PASSWORD = "Student@123";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// ---------------------------------------------------------------------------
// Idempotent "ensure" helpers for master data
// ---------------------------------------------------------------------------

async function ensureSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  await prisma.admin.create({
    data: { name: "Super Admin", email, passwordHash: await hash(password), role: "super_admin" },
  });

  console.log("Created super admin:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
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

async function ensureFaculty(data: {
  name: string;
  email: string;
  phone: string;
  employeeCode: string;
  departmentId: number;
}) {
  const existing = await prisma.faculty.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.faculty.create({
    data: { ...data, status: "active", passwordHash: await hash(FACULTY_PASSWORD) },
  });
}

async function ensureStudent(data: {
  name: string;
  email: string;
  phone: string;
  rollNo: string;
  enrollmentNo: string;
}) {
  const existing = await prisma.student.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.student.create({
    data: { ...data, status: "active", passwordHash: await hash(STUDENT_PASSWORD) },
  });
}

async function ensureFacultyMapping(facultyId: number, courseId: number, sectionId: number) {
  return prisma.facultyCourseSectionMap.upsert({
    where: { facultyId_courseId_sectionId: { facultyId, courseId, sectionId } },
    update: {},
    create: { facultyId, courseId, sectionId },
  });
}

async function ensureStudentMapping(studentId: number, courseId: number, sectionId: number) {
  return prisma.studentCourseSectionMap.upsert({
    where: { studentId_courseId_sectionId: { studentId, courseId, sectionId } },
    update: {},
    create: { studentId, courseId, sectionId },
  });
}

// ---------------------------------------------------------------------------
// Quiz question definitions
// ---------------------------------------------------------------------------

interface McqDef {
  type: "mcq";
  text: string;
  marks: number;
  negativeMarks: number;
  options: { text: string; correct: boolean }[];
}
interface FormulaDef {
  type: "formula";
  text: string;
  marks: number;
  negativeMarks: number;
  correctValue: number;
  tolerance: number;
}
type QuestionDef = McqDef | FormulaDef;

async function createQuestions(quizId: number, defs: QuestionDef[]) {
  const created: { id: number; def: QuestionDef; options: { id: number; correct: boolean }[] }[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const question = await prisma.question.create({
      data: {
        quizId,
        questionText: def.text,
        questionType: def.type,
        marks: def.marks,
        negativeMarks: def.negativeMarks,
        orderIndex: i,
      },
    });

    let options: { id: number; correct: boolean }[] = [];
    if (def.type === "mcq") {
      await prisma.questionOption.createMany({
        data: def.options.map((o) => ({ questionId: question.id, optionText: o.text, isCorrect: o.correct })),
      });
      const savedOptions = await prisma.questionOption.findMany({ where: { questionId: question.id } });
      options = savedOptions.map((o) => ({ id: o.id, correct: o.isCorrect }));
    } else {
      await prisma.questionFormula.create({
        data: { questionId: question.id, correctValue: def.correctValue, tolerance: def.tolerance },
      });
    }

    created.push({ id: question.id, def, options });
  }

  return created;
}

type CreatedQuestion = Awaited<ReturnType<typeof createQuestions>>[number];

/** Simulates one student's attempt against a set of questions, writing attempt + answers. */
async function createAttempt(params: {
  quizId: number;
  studentId: number;
  questions: CreatedQuestion[];
  startTime: Date;
  answerPattern: ("correct" | "wrong" | "skip")[];
  status: "in_progress" | "submitted" | "auto_submitted";
  negativeMarking: boolean;
  autoSubmitReason?: string;
}) {
  const { quizId, studentId, questions, startTime, answerPattern, status, negativeMarking, autoSubmitReason } = params;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId,
      startTime,
      endTime: status === "in_progress" ? null : addMinutes(startTime, 15),
      status,
      latitude: new Prisma.Decimal(28.6139),
      longitude: new Prisma.Decimal(77.209),
      autoSubmitted: status === "auto_submitted",
      autoSubmitReason: status === "auto_submitted" ? autoSubmitReason ?? "screen_switch" : null,
      questionOrder: JSON.stringify(questions.map((q) => q.id)),
    },
  });

  let totalMarks = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const pattern = answerPattern[i] ?? "skip";
    const isFinal = status !== "in_progress";

    if (pattern === "skip") {
      await prisma.studentAnswer.create({
        data: { attemptId: attempt.id, questionId: q.id, orderIndex: i, isSkipped: true, isCorrect: isFinal ? null : null, marksObtained: 0 },
      });
      continue;
    }

    let selectedOptionId: number | null = null;
    let answerValue: number | null = null;
    let isCorrect = pattern === "correct";

    if (q.def.type === "mcq") {
      const correctOption = q.options.find((o) => o.correct)!;
      const wrongOption = q.options.find((o) => !o.correct)!;
      selectedOptionId = isCorrect ? correctOption.id : wrongOption.id;
    } else {
      answerValue = isCorrect ? q.def.correctValue : q.def.correctValue + q.def.tolerance + 5;
    }

    const marksObtained = !isFinal ? 0 : isCorrect ? q.def.marks : negativeMarking ? -q.def.negativeMarks : 0;
    if (isFinal) totalMarks += marksObtained;

    await prisma.studentAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: q.id,
        orderIndex: i,
        selectedOptionId,
        answerValue,
        isSkipped: false,
        isCorrect: isFinal ? isCorrect : null,
        marksObtained: isFinal ? marksObtained : 0,
      },
    });
  }

  return { attempt, totalMarks };
}

async function markAttendanceAndResult(params: {
  studentId: number;
  courseId: number;
  quizId: number;
  date: Date;
  status: "present" | "absent";
  marksObtained?: number;
  totalMarks?: number;
  publish?: boolean;
}) {
  const { studentId, courseId, quizId, date, status, marksObtained = 0, totalMarks = 0, publish } = params;

  await prisma.attendance.upsert({
    where: { studentId_quizId: { studentId, quizId } },
    update: { status },
    create: { studentId, courseId, quizId, date, status },
  });

  if (status === "present") {
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    await prisma.result.upsert({
      where: { quizId_studentId: { quizId, studentId } },
      update: {},
      create: {
        quizId,
        studentId,
        marksObtained,
        percentage,
        status: publish ? "published" : "declared",
        declaredAt: new Date(),
        publishedAt: publish ? new Date() : null,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureSuperAdmin();

  const alreadySeeded = await prisma.department.findFirst({ where: { name: "Computer Science" } });
  if (alreadySeeded) {
    console.log("Demo data already present - skipping demo data seed.");
    return;
  }

  console.log("Seeding demo data...");

  // Departments
  const csDept = await ensureDepartment("Computer Science");
  const eceDept = await ensureDepartment("Electronics & Communication");
  const meDept = await ensureDepartment("Mechanical Engineering");

  // Courses
  const cs201 = await ensureCourse({ name: "Data Structures", code: "CS201", departmentId: csDept.id, credits: 4 });
  const cs301 = await ensureCourse({ name: "Database Systems", code: "CS301", departmentId: csDept.id, credits: 4 });
  const ec201 = await ensureCourse({ name: "Digital Electronics", code: "EC201", departmentId: eceDept.id, credits: 3 });
  const me201 = await ensureCourse({ name: "Thermodynamics", code: "ME201", departmentId: meDept.id, credits: 3 });

  // Session
  const session = await ensureSession("2025-26 Odd Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  // Sections
  const cs201A = await ensureSection("A", cs201.id, session.id);
  const cs201B = await ensureSection("B", cs201.id, session.id);
  const cs301A = await ensureSection("A", cs301.id, session.id);
  const ec201A = await ensureSection("A", ec201.id, session.id);
  const me201A = await ensureSection("A", me201.id, session.id);

  // Buildings
  const mainBlock = await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  const engBlock = await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  // Faculty
  const facAnanya = await ensureFaculty({ name: "Dr. Ananya Sharma", email: "ananya.sharma@example.edu", phone: "9810000001", employeeCode: "FAC1001", departmentId: csDept.id });
  const facRavi = await ensureFaculty({ name: "Prof. Ravi Kumar", email: "ravi.kumar@example.edu", phone: "9810000002", employeeCode: "FAC1002", departmentId: csDept.id });
  const facMeera = await ensureFaculty({ name: "Dr. Meera Iyer", email: "meera.iyer@example.edu", phone: "9810000003", employeeCode: "FAC1003", departmentId: eceDept.id });
  await ensureFaculty({ name: "Prof. Sanjay Verma", email: "sanjay.verma@example.edu", phone: "9810000004", employeeCode: "FAC1004", departmentId: meDept.id });

  await ensureFacultyMapping(facAnanya.id, cs201.id, cs201A.id);
  await ensureFacultyMapping(facRavi.id, cs301.id, cs301A.id);
  await ensureFacultyMapping(facMeera.id, ec201.id, ec201A.id);

  // Students
  const studentNames = [
    "Aarav Mehta", "Priya Nair", "Rohan Gupta", "Isha Patel", "Karan Malhotra",
    "Sneha Reddy", "Vikram Singh", "Ananya Joshi", "Arjun Rao", "Diya Kapoor",
    "Yash Chauhan", "Neha Bansal", "Kabir Khanna", "Tara Menon",
  ];
  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const n = i + 1;
    const roll = `R2025${String(n).padStart(3, "0")}`;
    const student = await ensureStudent({
      name: studentNames[i],
      email: `${studentNames[i].toLowerCase().replace(/\s+/g, ".")}@example.edu`,
      phone: `98200000${String(n).padStart(2, "0")}`,
      rollNo: roll,
      enrollmentNo: `EN2025${String(n).padStart(3, "0")}`,
    });
    students.push(student);
  }

  // First 10 students -> CS201 Section A; also cross-enroll a few into CS301-A
  const cs201AStudents = students.slice(0, 10);
  for (const s of cs201AStudents) await ensureStudentMapping(s.id, cs201.id, cs201A.id);
  for (const s of students.slice(0, 4)) await ensureStudentMapping(s.id, cs301.id, cs301A.id);

  // Last 4 students -> EC201 Section A
  const ec201AStudents = students.slice(10, 14);
  for (const s of ec201AStudents) await ensureStudentMapping(s.id, ec201.id, ec201A.id);

  const now = new Date();

  // -------------------------------------------------------------------------
  // Quiz 1: COMPLETED - "Arrays & Linked Lists Quiz" (CS201-A)
  // -------------------------------------------------------------------------
  const quiz1Start = addDays(now, -3);
  const quiz1 = await prisma.quiz.create({
    data: {
      title: "Arrays & Linked Lists Quiz",
      courseId: cs201.id,
      sectionId: cs201A.id,
      facultyId: facAnanya.id,
      buildingId: mainBlock.id,
      startTime: quiz1Start,
      endTime: addMinutes(quiz1Start, 30),
      durationMinutes: 30,
      totalMarks: 10,
      randomize: true,
      negativeMarking: true,
      allowSkipSwitch: true,
      status: "completed",
      actualStartTime: quiz1Start,
      actualStopTime: addMinutes(quiz1Start, 30),
    },
  });

  const quiz1Questions = await createQuestions(quiz1.id, [
    { type: "mcq", text: "Which data structure follows LIFO order?", marks: 2, negativeMarks: 1, options: [{ text: "Queue", correct: false }, { text: "Stack", correct: true }, { text: "Array", correct: false }, { text: "Tree", correct: false }] },
    { type: "mcq", text: "Time complexity of binary search on a sorted array?", marks: 2, negativeMarks: 1, options: [{ text: "O(n)", correct: false }, { text: "O(log n)", correct: true }, { text: "O(n^2)", correct: false }, { text: "O(1)", correct: false }] },
    { type: "mcq", text: "A singly linked list node stores which of the following?", marks: 2, negativeMarks: 1, options: [{ text: "Data only", correct: false }, { text: "Data and a pointer to the next node", correct: true }, { text: "Pointer only", correct: false }, { text: "Index only", correct: false }] },
    { type: "formula", text: "Compute 2^10", marks: 4, negativeMarks: 2, correctValue: 1024, tolerance: 0 },
  ]);

  await prisma.quizAllotment.createMany({
    data: cs201AStudents.map((s) => ({ quizId: quiz1.id, studentId: s.id, status: "allotted" })),
  });

  // 4 students: full marks
  for (const s of cs201AStudents.slice(0, 4)) {
    const { totalMarks } = await createAttempt({
      quizId: quiz1.id, studentId: s.id, questions: quiz1Questions, startTime: quiz1Start,
      answerPattern: ["correct", "correct", "correct", "correct"], status: "submitted", negativeMarking: true,
    });
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz1.id, studentId: s.id } }, data: { status: "attempted" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: cs201.id, quizId: quiz1.id, date: quiz1Start, status: "present", marksObtained: totalMarks, totalMarks: 10, publish: true });
  }

  // 3 students: mostly correct, one wrong
  for (const s of cs201AStudents.slice(4, 7)) {
    const { totalMarks } = await createAttempt({
      quizId: quiz1.id, studentId: s.id, questions: quiz1Questions, startTime: quiz1Start,
      answerPattern: ["correct", "correct", "correct", "wrong"], status: "submitted", negativeMarking: true,
    });
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz1.id, studentId: s.id } }, data: { status: "attempted" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: cs201.id, quizId: quiz1.id, date: quiz1Start, status: "present", marksObtained: totalMarks, totalMarks: 10, publish: true });
  }

  // 1 student: mixed, low score
  {
    const s = cs201AStudents[7];
    const { totalMarks } = await createAttempt({
      quizId: quiz1.id, studentId: s.id, questions: quiz1Questions, startTime: quiz1Start,
      answerPattern: ["correct", "wrong", "wrong", "skip"], status: "submitted", negativeMarking: true,
    });
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz1.id, studentId: s.id } }, data: { status: "attempted" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: cs201.id, quizId: quiz1.id, date: quiz1Start, status: "present", marksObtained: totalMarks, totalMarks: 10, publish: true });
  }

  // 1 student: auto-submitted due to anti-cheat violation
  {
    const s = cs201AStudents[8];
    const { attempt, totalMarks } = await createAttempt({
      quizId: quiz1.id, studentId: s.id, questions: quiz1Questions, startTime: quiz1Start,
      answerPattern: ["correct", "skip", "skip", "skip"], status: "auto_submitted", negativeMarking: true, autoSubmitReason: "screen_switch",
    });
    await prisma.antiCheatEvent.create({ data: { attemptId: attempt.id, eventType: "screen_switch", actionTaken: "force_submit" } });
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz1.id, studentId: s.id } }, data: { status: "attempted" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: cs201.id, quizId: quiz1.id, date: quiz1Start, status: "present", marksObtained: totalMarks, totalMarks: 10, publish: true });
  }

  // 1 student: never attempted -> absent
  {
    const s = cs201AStudents[9];
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz1.id, studentId: s.id } }, data: { status: "absent" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: cs201.id, quizId: quiz1.id, date: quiz1Start, status: "absent" });
  }

  // -------------------------------------------------------------------------
  // Quiz 2: LIVE - "Sorting Algorithms Quiz" (CS201-A) - powers Live Tracking demo
  // -------------------------------------------------------------------------
  const quiz2Start = addMinutes(now, -10);
  const quiz2 = await prisma.quiz.create({
    data: {
      title: "Sorting Algorithms Quiz",
      courseId: cs201.id,
      sectionId: cs201A.id,
      facultyId: facAnanya.id,
      buildingId: mainBlock.id,
      startTime: quiz2Start,
      endTime: addMinutes(quiz2Start, 25),
      durationMinutes: 25,
      totalMarks: 6,
      randomize: true,
      negativeMarking: false,
      allowSkipSwitch: true,
      status: "live",
      actualStartTime: quiz2Start,
    },
  });

  const quiz2Questions = await createQuestions(quiz2.id, [
    { type: "mcq", text: "Which sorting algorithm has the best average time complexity?", marks: 2, negativeMarks: 0, options: [{ text: "Bubble Sort", correct: false }, { text: "Quick Sort", correct: true }, { text: "Selection Sort", correct: false }, { text: "Insertion Sort", correct: false }] },
    { type: "mcq", text: "Merge Sort uses which algorithmic technique?", marks: 2, negativeMarks: 0, options: [{ text: "Greedy", correct: false }, { text: "Divide and Conquer", correct: true }, { text: "Dynamic Programming", correct: false }, { text: "Backtracking", correct: false }] },
    { type: "mcq", text: "Which sort is stable by default?", marks: 2, negativeMarks: 0, options: [{ text: "Quick Sort", correct: false }, { text: "Heap Sort", correct: false }, { text: "Merge Sort", correct: true }, { text: "Selection Sort", correct: false }] },
  ]);

  await prisma.quizAllotment.createMany({
    data: cs201AStudents.map((s) => ({ quizId: quiz2.id, studentId: s.id, status: "allotted" })),
  });

  // 4 students currently in the middle of attempting
  for (const s of cs201AStudents.slice(0, 4)) {
    await createAttempt({
      quizId: quiz2.id, studentId: s.id, questions: quiz2Questions, startTime: addMinutes(now, -5),
      answerPattern: ["correct", "skip", "skip"], status: "in_progress", negativeMarking: false,
    });
  }

  // -------------------------------------------------------------------------
  // Quiz 3: SCHEDULED - "Trees & Graphs Quiz" (CS201-A)
  // -------------------------------------------------------------------------
  const quiz3Start = addDays(now, 2);
  const quiz3 = await prisma.quiz.create({
    data: {
      title: "Trees & Graphs Quiz",
      courseId: cs201.id,
      sectionId: cs201A.id,
      facultyId: facAnanya.id,
      buildingId: mainBlock.id,
      startTime: quiz3Start,
      endTime: addMinutes(quiz3Start, 30),
      durationMinutes: 30,
      totalMarks: 6,
      randomize: true,
      negativeMarking: true,
      allowSkipSwitch: true,
      status: "scheduled",
    },
  });

  await createQuestions(quiz3.id, [
    { type: "mcq", text: "A binary tree where every node has 0 or 2 children is called?", marks: 2, negativeMarks: 1, options: [{ text: "Full binary tree", correct: true }, { text: "Complete binary tree", correct: false }, { text: "Skewed tree", correct: false }, { text: "AVL tree", correct: false }] },
    { type: "mcq", text: "Which traversal visits the root node first?", marks: 2, negativeMarks: 1, options: [{ text: "In-order", correct: false }, { text: "Pre-order", correct: true }, { text: "Post-order", correct: false }, { text: "Level-order", correct: false }] },
    { type: "mcq", text: "Which algorithm finds the shortest path in a weighted graph with non-negative edges?", marks: 2, negativeMarks: 1, options: [{ text: "DFS", correct: false }, { text: "Dijkstra's algorithm", correct: true }, { text: "Bubble sort", correct: false }, { text: "Binary search", correct: false }] },
  ]);

  await prisma.quizAllotment.createMany({
    data: cs201AStudents.map((s) => ({ quizId: quiz3.id, studentId: s.id, status: "allotted" })),
  });

  // -------------------------------------------------------------------------
  // Quiz 4: DRAFT - "Dynamic Programming Practice" (CS301-A, not yet configured)
  // -------------------------------------------------------------------------
  await prisma.quiz.create({
    data: {
      title: "Dynamic Programming Practice",
      courseId: cs301.id,
      sectionId: cs301A.id,
      facultyId: facRavi.id,
      buildingId: mainBlock.id,
      startTime: addDays(now, 5),
      endTime: addMinutes(addDays(now, 5), 30),
      durationMinutes: 30,
      totalMarks: 10,
      randomize: true,
      negativeMarking: false,
      allowSkipSwitch: true,
      status: "draft",
    },
  });

  // -------------------------------------------------------------------------
  // Quiz 5: COMPLETED - "Basic Logic Gates Quiz" (EC201-A)
  // -------------------------------------------------------------------------
  const quiz5Start = addDays(now, -1);
  const quiz5 = await prisma.quiz.create({
    data: {
      title: "Basic Logic Gates Quiz",
      courseId: ec201.id,
      sectionId: ec201A.id,
      facultyId: facMeera.id,
      buildingId: engBlock.id,
      startTime: quiz5Start,
      endTime: addMinutes(quiz5Start, 20),
      durationMinutes: 20,
      totalMarks: 4,
      randomize: true,
      negativeMarking: false,
      allowSkipSwitch: true,
      status: "completed",
      actualStartTime: quiz5Start,
      actualStopTime: addMinutes(quiz5Start, 20),
    },
  });

  const quiz5Questions = await createQuestions(quiz5.id, [
    { type: "mcq", text: "Which gate outputs HIGH only when all inputs are HIGH?", marks: 2, negativeMarks: 0, options: [{ text: "OR", correct: false }, { text: "AND", correct: true }, { text: "NAND", correct: false }, { text: "XOR", correct: false }] },
    { type: "mcq", text: "A NOT gate is also known as?", marks: 2, negativeMarks: 0, options: [{ text: "Buffer", correct: false }, { text: "Inverter", correct: true }, { text: "Comparator", correct: false }, { text: "Multiplexer", correct: false }] },
  ]);

  await prisma.quizAllotment.createMany({
    data: ec201AStudents.map((s) => ({ quizId: quiz5.id, studentId: s.id, status: "allotted" })),
  });

  for (const s of ec201AStudents.slice(0, 3)) {
    const { totalMarks } = await createAttempt({
      quizId: quiz5.id, studentId: s.id, questions: quiz5Questions, startTime: quiz5Start,
      answerPattern: ["correct", "correct"], status: "submitted", negativeMarking: false,
    });
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz5.id, studentId: s.id } }, data: { status: "attempted" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: ec201.id, quizId: quiz5.id, date: quiz5Start, status: "present", marksObtained: totalMarks, totalMarks: 4, publish: true });
  }
  {
    const s = ec201AStudents[3];
    await prisma.quizAllotment.update({ where: { quizId_studentId: { quizId: quiz5.id, studentId: s.id } }, data: { status: "absent" } });
    await markAttendanceAndResult({ studentId: s.id, courseId: ec201.id, quizId: quiz5.id, date: quiz5Start, status: "absent" });
  }

  console.log("\nDemo data seeded successfully.\n");
  console.log("Admin login:      admin@example.com / (see SEED_ADMIN_PASSWORD in .env)");
  console.log(`Faculty login:    ananya.sharma@example.edu / ${FACULTY_PASSWORD}  (also ravi.kumar@..., meera.iyer@..., sanjay.verma@...)`);
  console.log(`Student login:    aarav.mehta@example.edu / ${STUDENT_PASSWORD}  (14 students total, see students table)`);
  console.log("\nSeeded: 3 departments, 4 courses, 1 session, 5 sections, 2 buildings,");
  console.log("4 faculty, 14 students, course/section mappings, and 5 quizzes");
  console.log("(1 completed w/ full results, 1 live, 1 scheduled, 1 draft, 1 more completed).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
