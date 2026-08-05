import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

// The "current" semester-cycle code driving legacy course-mapping filters
// (isr_sub_available_tbl.sub_list) — admin-editable via Settings > Semester Config.
async function ensureSemesterConfig() {
  const existing = await prisma.semesterConfig.findFirst();
  if (existing) return existing;
  return prisma.semesterConfig.create({ data: { currentSubList: "C2" } });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureSuperAdmin();
  await ensureSemesterConfig();

  const alreadySeeded = await prisma.department.findFirst({ where: { name: "Computer Science" } });
  if (alreadySeeded) {
    console.log("Demo master data already present - skipping.");
    return;
  }

  console.log("Seeding demo master data...");

  // Departments
  const csDept = await ensureDepartment("Computer Science");
  const eceDept = await ensureDepartment("Electronics & Communication");
  const meDept = await ensureDepartment("Mechanical Engineering");

  // Courses
  await ensureCourse({ name: "Data Structures", code: "CS201", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Database Systems", code: "CS301", departmentId: csDept.id, credits: 4 });
  await ensureCourse({ name: "Digital Electronics", code: "EC201", departmentId: eceDept.id, credits: 3 });
  await ensureCourse({ name: "Thermodynamics", code: "ME201", departmentId: meDept.id, credits: 3 });

  // Session
  const session = await ensureSession("2025-26 Odd Semester", new Date("2025-07-01"), new Date("2025-12-15"));

  // Sections (kept for quiz scheduling metadata — no confirmed legacy source yet, see schema TODOs)
  const cs201 = await prisma.course.findUniqueOrThrow({ where: { code: "CS201" } });
  const cs301 = await prisma.course.findUniqueOrThrow({ where: { code: "CS301" } });
  const ec201 = await prisma.course.findUniqueOrThrow({ where: { code: "EC201" } });
  const me201 = await prisma.course.findUniqueOrThrow({ where: { code: "ME201" } });
  await ensureSection("A", cs201.id, session.id);
  await ensureSection("B", cs201.id, session.id);
  await ensureSection("A", cs301.id, session.id);
  await ensureSection("A", ec201.id, session.id);
  await ensureSection("A", me201.id, session.id);

  // Buildings
  await ensureBuilding({ name: "Main Academic Block", latitude: 28.6139, longitude: 77.209, radiusMeters: 40 });
  await ensureBuilding({ name: "Engineering Block", latitude: 28.6145, longitude: 77.2101, radiusMeters: 50 });

  console.log("\nDemo master data seeded successfully.\n");
  console.log("Admin login: admin@example.com / (see SEED_ADMIN_PASSWORD in .env)");
  console.log("\nFaculty/Student identity now comes from the legacy isr_* tables — see");
  console.log("lib/legacy-db.ts. No demo faculty/students/quizzes are seeded here since");
  console.log("quiz/attempt/attendance data requires real legacy roll numbers to be meaningful.");
  console.log("\nSeeded: 3 departments, 4 courses, 1 session, 5 sections, 2 buildings,");
  console.log("and a default Semester Config (current_sub_list = \"C2\").");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
