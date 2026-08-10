import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listBatchRegistry } from "@/lib/config";
import { ApiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";

/**
 * Every read (and, per an explicit product decision, the admin-panel writes
 * below) against the legacy university database (isr_* tables) goes through
 * this file. These tables are otherwise owned by the legacy system. Two open
 * items from the integration spec are isolated here so a later fix only
 * touches one place:
 *  - the password hash scheme in isr_login_tbl.user_password (verifyLegacyPassword)
 *  - the column names inside isr_reg_<batch>_tbl (getStudentCourses / getCourseRegistrations)
 */

export type LegacyUserType = "FAC" | "STU";

export interface LegacyFaculty {
  roll: string;
  name: string;
  email: string;
  status: number;
  dept: string | null;
  empCode: string | null;
  facStatus: string | null;
}

export interface LegacyStudent {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
  status: number;
  regStatus: string | null;
  attnOk: string | null;
  stuStatus: string | null;
  // App-owned Section membership (2026-08-10 MOM), not a legacy column -
  // comma-joined names if the student is in more than one section, null if none.
  section: string | null;
}

export interface FacultyCourseMapping {
  id: number;
  sem: string;
  subList: string;
  subCode: string;
  facRoll: string;
  facultyName: string | null;
  branch: string;
}

export interface StudentCourseRow {
  roll: string;
  subCode: string;
}

export interface CourseCatalogEntry {
  subCode: string;
  title: string | null;
  branch: string | null;
  credits: number | null;
  facRoll: string;
  facultyName: string | null;
  // The app-owned Course.id this legacy code resolves to, if the admin has
  // added it to the local course catalog yet (Quiz.courseId needs this FK -
  // null means "ask admin to add this course under Master Data > Courses").
  courseId: number | null;
  // Sections linked to this course (Master Data > Sections) - empty until an
  // admin creates one, since quiz creation now requires picking a section.
  sections: { id: number; name: string }[];
}

export interface CourseRosterEntry {
  roll: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Login / credential verification
// ---------------------------------------------------------------------------

export async function findLoginByEmail(email: string, userType: LegacyUserType) {
  return prisma.isrLoginTbl.findFirst({
    where: { userEmail: email, userType },
  });
}

// TODO: hash scheme unconfirmed (bcrypt/MD5/plaintext) - verify against a real
// isr_login_tbl.user_password value and adjust this single function.
export async function verifyLegacyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, storedHash);
}

// ---------------------------------------------------------------------------
// Faculty / Student profile lookup
// ---------------------------------------------------------------------------

export async function getFacultyByRoll(roll: string): Promise<LegacyFaculty | null> {
  const rows = await prisma.$queryRaw<
    { roll: string; name: string; user_email: string; status: number; dept: string | null; emp_code: string | null; fac_status: string | null }[]
  >`
    SELECT f.roll AS roll, f.name AS name, l.user_email AS user_email, l.status AS status,
           f.dept AS dept, f.emp_code AS emp_code, f.fac_status AS fac_status
    FROM isr_faculty_tbl f
    JOIN isr_login_tbl l ON l.user_roll = f.roll
    WHERE f.roll = ${roll} AND l.user_type = 'FAC'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    roll: row.roll,
    name: row.name,
    email: row.user_email,
    status: row.status,
    dept: row.dept,
    empCode: row.emp_code,
    facStatus: row.fac_status,
  };
}

export async function getStudentByRoll(roll: string): Promise<LegacyStudent | null> {
  const rows = await prisma.$queryRaw<
    {
      // sem_now is a real INT column - mysql2 returns a JS number for it.
      roll: string; stu_name: string; user_email: string; major: string; batch: string; sem_now: number | null;
      status: number; reg_status: string | null; attn_ok: string | null; stu_status: string | null;
    }[]
  >`
    SELECT d.stu_roll AS roll, d.stu_name AS stu_name, l.user_email AS user_email, l.status AS status,
           m.major AS major, m.batch AS batch, m.sem_now AS sem_now,
           m.reg_status AS reg_status, m.attn_ok AS attn_ok, m.stu_status AS stu_status
    FROM isr_stu_data_tbl d
    JOIN isr_login_tbl l ON l.user_roll = d.stu_roll
    LEFT JOIN isr_stu_main_tbl m ON m.roll = d.stu_roll
    WHERE d.stu_roll = ${roll} AND l.user_type = 'STU'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const sections = await getSectionNamesByRolls([row.roll]);
  return {
    roll: row.roll,
    name: row.stu_name,
    email: row.user_email,
    major: row.major ?? "",
    batch: row.batch ?? "",
    semNow: row.sem_now == null ? "" : String(row.sem_now),
    status: row.status,
    section: sections.get(row.roll) ?? null,
    regStatus: row.reg_status,
    attnOk: row.attn_ok,
    stuStatus: row.stu_status,
  };
}

// ---------------------------------------------------------------------------
// Login activation (isr_login_tbl.status: 1-Active, 2-Inactive)
// ---------------------------------------------------------------------------

export async function setLoginStatus(roll: string, userType: LegacyUserType, active: boolean): Promise<void> {
  const login = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
  if (!login || login.userType !== userType) {
    throw new ApiError(404, userType === "FAC" ? "Faculty not found" : "Student not found");
  }
  await prisma.isrLoginTbl.update({ where: { userRoll: roll }, data: { status: active ? 1 : 2 } });
}

export async function countFaculty(): Promise<number> {
  return prisma.isrLoginTbl.count({ where: { userType: "FAC" } });
}

export async function countStudents(): Promise<number> {
  return prisma.isrLoginTbl.count({ where: { userType: "STU" } });
}

// Batch name resolution - used by reports/attendance screens that display
// student/faculty names but no longer have a Prisma relation to join through.
export async function getStudentNamesByRolls(rolls: string[]): Promise<Map<string, string>> {
  if (rolls.length === 0) return new Map();
  const rows = await prisma.isrStuDataTbl.findMany({ where: { stuRoll: { in: [...new Set(rolls)] } } });
  return new Map(rows.map((r) => [r.stuRoll, r.stuName]));
}

// App-owned Section membership (2026-08-10 MOM) - joined in for the admin
// student list/detail views. Comma-joins names for students in more than
// one section (e.g. a Major+Section default plus a course-driven merged
// section); excludes rows a human has explicitly removed.
export async function getSectionNamesByRolls(rolls: string[]): Promise<Map<string, string>> {
  if (rolls.length === 0) return new Map();
  const rows = await prisma.sectionStudent.findMany({
    where: { studentRoll: { in: [...new Set(rolls)] }, source: { not: "manual_removed" } },
    include: { section: { select: { name: true } } },
  });
  const byRoll = new Map<string, string[]>();
  for (const row of rows) {
    const names = byRoll.get(row.studentRoll) ?? [];
    names.push(row.section.name);
    byRoll.set(row.studentRoll, names);
  }
  return new Map([...byRoll.entries()].map(([roll, names]) => [roll, names.join(", ")]));
}

export async function getFacultyNamesByRolls(rolls: string[]): Promise<Map<string, string>> {
  if (rolls.length === 0) return new Map();
  const rows = await prisma.isrFacultyTbl.findMany({ where: { roll: { in: [...new Set(rolls)] } } });
  return new Map(rows.map((r) => [r.roll, r.name]));
}

// ---------------------------------------------------------------------------
// Directory listings (admin panel)
// ---------------------------------------------------------------------------

export async function listFaculty(params: { search?: string; page: number; pageSize: number }) {
  const search = (params.search ?? "").trim();
  const like = `%${search}%`;
  const offset = (params.page - 1) * params.pageSize;

  const whereClause = search
    ? Prisma.sql`WHERE f.name LIKE ${like} OR l.user_email LIKE ${like} OR f.roll LIKE ${like}`
    : Prisma.empty;

  const [items, countRows] = await Promise.all([
    prisma.$queryRaw<{ roll: string; name: string; user_email: string; status: number; dept: string | null; fac_status: string | null }[]>(Prisma.sql`
      SELECT f.roll AS roll, f.name AS name, l.user_email AS user_email, l.status AS status, f.dept AS dept, f.fac_status AS fac_status
      FROM isr_faculty_tbl f
      JOIN isr_login_tbl l ON l.user_roll = f.roll AND l.user_type = 'FAC'
      ${whereClause}
      ORDER BY f.name ASC
      LIMIT ${params.pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total
      FROM isr_faculty_tbl f
      JOIN isr_login_tbl l ON l.user_roll = f.roll AND l.user_type = 'FAC'
      ${whereClause}
    `),
  ]);

  return {
    items: items.map((r) => ({ roll: r.roll, name: r.name, email: r.user_email, status: r.status, dept: r.dept, facStatus: r.fac_status })),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function listStudents(params: {
  search?: string;
  major?: string;
  batch?: string;
  semNow?: string;
  page: number;
  pageSize: number;
}) {
  const search = (params.search ?? "").trim();
  const like = `%${search}%`;
  const offset = (params.page - 1) * params.pageSize;

  // Built as a single WHERE clause via Prisma.sql to keep every value parameterized.
  const conditions: ReturnType<typeof Prisma.sql>[] = [];
  if (search) {
    conditions.push(Prisma.sql`(d.stu_name LIKE ${like} OR l.user_email LIKE ${like} OR d.stu_roll LIKE ${like})`);
  }
  if (params.major) conditions.push(Prisma.sql`m.major = ${params.major}`);
  if (params.batch) conditions.push(Prisma.sql`m.batch = ${params.batch}`);
  if (params.semNow) conditions.push(Prisma.sql`m.sem_now = ${params.semNow}`);

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  const [items, countRows] = await Promise.all([
    prisma.$queryRaw<
      // sem_now is a real INT column - mysql2 returns a JS number for it.
      { roll: string; stu_name: string; user_email: string; major: string; batch: string; sem_now: number | null; status: number; category: string | null }[]
    >(Prisma.sql`
      SELECT d.stu_roll AS roll, d.stu_name AS stu_name, l.user_email AS user_email, l.status AS status,
             m.major AS major, m.batch AS batch, m.sem_now AS sem_now, d.category AS category
      FROM isr_stu_data_tbl d
      JOIN isr_login_tbl l ON l.user_roll = d.stu_roll AND l.user_type = 'STU'
      LEFT JOIN isr_stu_main_tbl m ON m.roll = d.stu_roll
      ${whereClause}
      ORDER BY d.stu_name ASC
      LIMIT ${params.pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total
      FROM isr_stu_data_tbl d
      JOIN isr_login_tbl l ON l.user_roll = d.stu_roll AND l.user_type = 'STU'
      LEFT JOIN isr_stu_main_tbl m ON m.roll = d.stu_roll
      ${whereClause}
    `),
  ]);

  const sections = await getSectionNamesByRolls(items.map((r) => r.roll));

  return {
    items: items.map((r) => ({
      roll: r.roll,
      name: r.stu_name,
      email: r.user_email,
      major: r.major ?? "",
      batch: r.batch ?? "",
      semNow: r.sem_now == null ? "" : String(r.sem_now),
      status: r.status,
      category: r.category,
      section: sections.get(r.roll) ?? null,
    })),
    total: Number(countRows[0]?.total ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Faculty / Student CRUD - writes into the legacy tables at the admin's
// explicit request. Roll and email must be unique across isr_login_tbl. Roll
// is the identity/primary key across every one of these tables, so it's
// never editable once created - only name/email/password/profile fields are.
// ---------------------------------------------------------------------------

export async function createFaculty(data: {
  roll: string;
  name: string;
  email: string;
  password: string;
}): Promise<LegacyFaculty> {
  const existingRoll = await prisma.isrLoginTbl.findUnique({ where: { userRoll: data.roll } });
  if (existingRoll) throw new ApiError(409, "A user with this roll number already exists");

  const existingEmail = await prisma.isrLoginTbl.findFirst({ where: { userEmail: data.email } });
  if (existingEmail) throw new ApiError(409, "A user with this email already exists");

  const passwordHash = await hashPassword(data.password);

  await prisma.$transaction([
    prisma.isrLoginTbl.create({
      data: { userRoll: data.roll, userEmail: data.email, userPassword: passwordHash, userType: "FAC" },
    }),
    prisma.isrFacultyTbl.create({ data: { roll: data.roll, name: data.name } }),
  ]);

  return { roll: data.roll, name: data.name, email: data.email, status: 1, dept: null, empCode: null, facStatus: null };
}

export async function updateFaculty(
  roll: string,
  data: { name?: string; email?: string; password?: string }
): Promise<LegacyFaculty> {
  const login = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
  if (!login || login.userType !== "FAC") throw new ApiError(404, "Faculty not found");

  if (data.email && data.email !== login.userEmail) {
    const emailConflict = await prisma.isrLoginTbl.findFirst({ where: { userEmail: data.email, userRoll: { not: roll } } });
    if (emailConflict) throw new ApiError(409, "A user with this email already exists");
  }

  if (data.email || data.password) {
    await prisma.isrLoginTbl.update({
      where: { userRoll: roll },
      data: {
        ...(data.email ? { userEmail: data.email } : {}),
        ...(data.password ? { userPassword: await hashPassword(data.password) } : {}),
      },
    });
  }

  if (data.name) {
    await prisma.isrFacultyTbl.update({ where: { roll }, data: { name: data.name } });
  }

  const faculty = await getFacultyByRoll(roll);
  if (!faculty) throw new ApiError(404, "Faculty not found");
  return faculty;
}

export async function deleteFaculty(roll: string): Promise<void> {
  const login = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
  if (!login || login.userType !== "FAC") throw new ApiError(404, "Faculty not found");

  // Mapping rows aren't FK-linked to isr_faculty_tbl (facRoll is a bare
  // string, see the mapping section below), so they'd otherwise be orphaned.
  await prisma.isrSubAvailableTbl.deleteMany({ where: { facRoll: roll } });
  await prisma.isrFacultyTbl.delete({ where: { roll } });
  await prisma.isrLoginTbl.delete({ where: { userRoll: roll } });
}

export async function createStudent(data: {
  roll: string;
  name: string;
  email: string;
  password: string;
  major: string;
  batch: string;
  semNow: string;
}): Promise<LegacyStudent> {
  const existingRoll = await prisma.isrLoginTbl.findUnique({ where: { userRoll: data.roll } });
  if (existingRoll) throw new ApiError(409, "A user with this roll number already exists");

  const existingEmail = await prisma.isrLoginTbl.findFirst({ where: { userEmail: data.email } });
  if (existingEmail) throw new ApiError(409, "A user with this email already exists");

  const passwordHash = await hashPassword(data.password);

  await prisma.$transaction([
    prisma.isrLoginTbl.create({
      data: { userRoll: data.roll, userEmail: data.email, userPassword: passwordHash, userType: "STU" },
    }),
    prisma.isrStuDataTbl.create({ data: { stuRoll: data.roll, stuName: data.name } }),
    prisma.isrStuMainTbl.create({
      // isr_stu_main_tbl.sem_now is a real INT column - convert at this boundary
      // so every app-facing surface (forms, validators, API types) can keep
      // treating the semester value as a string.
      data: { roll: data.roll, major: data.major, name: data.name, batch: data.batch, semNow: Number(data.semNow) },
    }),
  ]);

  return {
    roll: data.roll, name: data.name, email: data.email, major: data.major, batch: data.batch, semNow: data.semNow,
    status: 1, section: null, regStatus: null, attnOk: null, stuStatus: null,
  };
}

export async function updateStudent(
  roll: string,
  data: { name?: string; email?: string; password?: string; major?: string; batch?: string; semNow?: string }
): Promise<LegacyStudent> {
  const login = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
  if (!login || login.userType !== "STU") throw new ApiError(404, "Student not found");

  if (data.email && data.email !== login.userEmail) {
    const emailConflict = await prisma.isrLoginTbl.findFirst({ where: { userEmail: data.email, userRoll: { not: roll } } });
    if (emailConflict) throw new ApiError(409, "A user with this email already exists");
  }

  if (data.email || data.password) {
    await prisma.isrLoginTbl.update({
      where: { userRoll: roll },
      data: {
        ...(data.email ? { userEmail: data.email } : {}),
        ...(data.password ? { userPassword: await hashPassword(data.password) } : {}),
      },
    });
  }

  if (data.name) {
    await prisma.isrStuDataTbl.update({ where: { stuRoll: roll }, data: { stuName: data.name } });
  }

  if (data.name || data.major || data.batch || data.semNow) {
    await prisma.isrStuMainTbl.upsert({
      where: { roll },
      update: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.major ? { major: data.major } : {}),
        ...(data.batch ? { batch: data.batch } : {}),
        ...(data.semNow ? { semNow: Number(data.semNow) } : {}),
      },
      create: {
        roll,
        name: data.name ?? "",
        major: data.major ?? "",
        batch: data.batch ?? "",
        semNow: data.semNow ? Number(data.semNow) : 0,
      },
    });
  }

  const student = await getStudentByRoll(roll);
  if (!student) throw new ApiError(404, "Student not found");
  return student;
}

export async function deleteStudent(roll: string): Promise<void> {
  const login = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
  if (!login || login.userType !== "STU") throw new ApiError(404, "Student not found");

  const student = await getStudentByRoll(roll);
  if (student?.batch) {
    const tableName = await resolveBatchTable(student.batch);
    if (tableName) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ?`, roll);
    }
  }

  await prisma.isrStuMainTbl.deleteMany({ where: { roll } });
  await prisma.isrStuDataTbl.delete({ where: { stuRoll: roll } });
  await prisma.isrLoginTbl.delete({ where: { userRoll: roll } });
}

// ---------------------------------------------------------------------------
// Faculty <-> Course mapping (isr_sub_available_tbl)
// ---------------------------------------------------------------------------

export async function getFacultyCourseMappings(
  subList: string,
  params: { facultyRoll?: string; page: number; pageSize: number }
) {
  const offset = (params.page - 1) * params.pageSize;

  // facRoll is nullable on the real table (a mapping row with no faculty
  // assigned yet) - excluded here since a null-faculty row isn't a "who
  // teaches this course" fact worth listing.
  const rows = await prisma.isrSubAvailableTbl.findMany({
    where: { subList, facRoll: params.facultyRoll ?? { not: null } },
    orderBy: { subCode: "asc" },
    skip: offset,
    take: params.pageSize,
  });
  const total = await prisma.isrSubAvailableTbl.count({
    where: { subList, facRoll: params.facultyRoll ?? { not: null } },
  });

  const facultyRolls = [...new Set(rows.map((r) => r.facRoll!))];
  const facultyNames = facultyRolls.length
    ? await prisma.isrFacultyTbl.findMany({ where: { roll: { in: facultyRolls } } })
    : [];
  const nameByRoll = new Map(facultyNames.map((f) => [f.roll, f.name]));

  const items: FacultyCourseMapping[] = rows.map((r) => ({
    id: r.id,
    sem: r.sem ?? "",
    subList: r.subList ?? "",
    subCode: r.subCode ?? "",
    facRoll: r.facRoll!,
    facultyName: nameByRoll.get(r.facRoll!) ?? null,
    branch: r.branch ?? "",
  }));

  return { items, total };
}

export async function isFacultyMappedToCourse(facultyRoll: string, courseCode: string, subList: string) {
  const count = await prisma.isrSubAvailableTbl.count({
    where: { facRoll: facultyRoll, subCode: courseCode, subList },
  });
  return count > 0;
}

export async function createFacultyCourseMapping(data: {
  facRoll: string;
  subCode: string;
  branch: string;
  sem: string;
  subList: string;
}): Promise<FacultyCourseMapping> {
  const faculty = await prisma.isrFacultyTbl.findUnique({ where: { roll: data.facRoll } });
  if (!faculty) throw new ApiError(404, "No faculty found for this roll number");

  const alreadyMapped = await isFacultyMappedToCourse(data.facRoll, data.subCode, data.subList);
  if (alreadyMapped) throw new ApiError(409, "This faculty is already mapped to this course for the current cycle");

  const row = await prisma.isrSubAvailableTbl.create({
    data: { sem: data.sem, subList: data.subList, subCode: data.subCode, facRoll: data.facRoll, branch: data.branch },
  });

  return { id: row.id, sem: data.sem, subList: data.subList, subCode: data.subCode, facRoll: data.facRoll, facultyName: faculty.name, branch: data.branch };
}

export async function deleteFacultyCourseMapping(id: number): Promise<void> {
  const existing = await prisma.isrSubAvailableTbl.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Mapping not found");
  await prisma.isrSubAvailableTbl.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Student <-> Course mapping (isr_reg_<batch>_tbl) - dynamic table, allow-listed
// ---------------------------------------------------------------------------

const SAFE_TABLE_NAME = /^[a-zA-Z0-9_]+$/;

async function resolveBatchTable(batch: string): Promise<string | null> {
  const registry = await listBatchRegistry();
  const entry = registry.find((r) => r.batchName === batch && r.isActive);
  if (!entry) return null;
  if (!SAFE_TABLE_NAME.test(entry.tableName)) {
    throw new Error(`Batch table registry entry for "${batch}" has an unsafe table name`);
  }
  return entry.tableName;
}

// Confirmed from the integration spec's real isr_reg_<batch>_tbl export: the
// roll column is `stu_roll` (not `roll` - every other isr_* table uses `roll`
// or `stu_roll` inconsistently, this one is `stu_roll`), and every row also
// carries `sub_list`, so registrations must be scoped to the current cycle
// the same way isr_sub_available_tbl reads are.
const REG_ROLL_COLUMN = "stu_roll";
const REG_SUB_CODE_COLUMN = "sub_code";
const REG_SUB_LIST_COLUMN = "sub_list";
// Confirmed real auto-increment PK (see prisma/migrations/20260810090000_legacy_reg_table_full_parity) -
// only used to order "most recently registered first" for getRecentRegistrations.
const REG_PK_COLUMN = "reg_sr";

export async function getStudentCourses(roll: string, batch: string, subList: string): Promise<StudentCourseRow[]> {
  const tableName = await resolveBatchTable(batch);
  if (!tableName) return [];

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
      `SELECT \`${REG_ROLL_COLUMN}\` AS roll, \`${REG_SUB_CODE_COLUMN}\` AS sub_code FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ? AND \`${REG_SUB_LIST_COLUMN}\` = ?`,
      roll,
      subList
    );
    return rows.map((r) => ({ roll: r.roll, subCode: r.sub_code }));
  } catch (error) {
    console.error(`getStudentCourses: query against ${tableName} failed`, error);
    return [];
  }
}

export async function getCourseRegistrations(courseCode: string, subList: string): Promise<(StudentCourseRow & { batch: string })[]> {
  const registry = (await listBatchRegistry()).filter((r) => r.isActive);
  const results: (StudentCourseRow & { batch: string })[] = [];

  for (const entry of registry) {
    if (!SAFE_TABLE_NAME.test(entry.tableName)) continue;
    try {
      const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
        `SELECT \`${REG_ROLL_COLUMN}\` AS roll, \`${REG_SUB_CODE_COLUMN}\` AS sub_code FROM \`${entry.tableName}\` WHERE \`${REG_SUB_CODE_COLUMN}\` = ? AND \`${REG_SUB_LIST_COLUMN}\` = ?`,
        courseCode,
        subList
      );
      results.push(...rows.map((r) => ({ roll: r.roll, subCode: r.sub_code, batch: entry.batchName })));
    } catch (error) {
      console.error(`getCourseRegistrations: query against ${entry.tableName} failed`, error);
    }
  }

  return results;
}

// Bounded default listing for the admin mapping page - a handful of the most
// recently registered rows per active batch table, so the page shows real
// data immediately instead of only after a search (the per-table LIMIT keeps
// this cheap even as more batch tables get registered over time).
const RECENT_PER_TABLE_LIMIT = 10;

export async function getRecentRegistrations(subList: string, limit: number): Promise<(StudentCourseRow & { batch: string })[]> {
  const registry = (await listBatchRegistry()).filter((r) => r.isActive);
  const results: (StudentCourseRow & { batch: string })[] = [];

  for (const entry of registry) {
    if (!SAFE_TABLE_NAME.test(entry.tableName)) continue;
    try {
      const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
        `SELECT \`${REG_ROLL_COLUMN}\` AS roll, \`${REG_SUB_CODE_COLUMN}\` AS sub_code FROM \`${entry.tableName}\` WHERE \`${REG_SUB_LIST_COLUMN}\` = ? ORDER BY \`${REG_PK_COLUMN}\` DESC LIMIT ${RECENT_PER_TABLE_LIMIT}`,
        subList
      );
      results.push(...rows.map((r) => ({ roll: r.roll, subCode: r.sub_code, batch: entry.batchName })));
    } catch (error) {
      console.error(`getRecentRegistrations: query against ${entry.tableName} failed`, error);
    }
  }

  return results.slice(0, limit);
}

export async function createStudentCourseMapping(data: {
  roll: string;
  subCode: string;
  subList: string;
}): Promise<StudentCourseRow & { batch: string }> {
  const student = await getStudentByRoll(data.roll);
  if (!student || !student.batch) throw new ApiError(404, "No student found for this roll number, or the student has no batch on record");

  const tableName = await resolveBatchTable(student.batch);
  if (!tableName) throw new ApiError(400, `No registration table is configured for batch "${student.batch}"`);

  const existing = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ? AND \`${REG_SUB_CODE_COLUMN}\` = ? AND \`${REG_SUB_LIST_COLUMN}\` = ?`,
    data.roll,
    data.subCode,
    data.subList
  );
  if (Number(existing[0]?.cnt ?? 0) > 0) {
    throw new ApiError(409, "Student is already registered for this course");
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\` (\`${REG_ROLL_COLUMN}\`, \`${REG_SUB_CODE_COLUMN}\`, \`${REG_SUB_LIST_COLUMN}\`) VALUES (?, ?, ?)`,
    data.roll,
    data.subCode,
    data.subList
  );

  return { roll: data.roll, subCode: data.subCode, batch: student.batch };
}

export async function deleteStudentCourseMapping(roll: string, subCode: string, subList: string): Promise<void> {
  const student = await getStudentByRoll(roll);
  if (!student || !student.batch) throw new ApiError(404, "No student found for this roll number, or the student has no batch on record");

  const tableName = await resolveBatchTable(student.batch);
  if (!tableName) throw new ApiError(400, `No registration table is configured for batch "${student.batch}"`);

  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ? AND \`${REG_SUB_CODE_COLUMN}\` = ? AND \`${REG_SUB_LIST_COLUMN}\` = ?`,
    roll,
    subCode,
    subList
  );
  if (Number(result) === 0) throw new ApiError(404, "Registration not found");
}

// ---------------------------------------------------------------------------
// Curriculum catalog (isr_curriculum_tbl) - resolves a bare course code into
// title/credits/branch, and builds the faculty course-list + roster views
// the spec calls out as the literal "Prog/Dept always blank" fix (§5, §8).
// ---------------------------------------------------------------------------

export async function getFacultyCourseCatalog(facultyRoll: string, subList: string): Promise<CourseCatalogEntry[]> {
  const rows = await prisma.isrSubAvailableTbl.findMany({
    where: { facRoll: facultyRoll, subList },
    orderBy: { subCode: "asc" },
  });
  // subCode is nullable on the real table - a mapping row without one isn't
  // a course this catalog can resolve, so it's excluded here.
  const mappings = rows.filter((m): m is typeof m & { subCode: string } => m.subCode !== null);
  if (mappings.length === 0) return [];

  const codes = [...new Set(mappings.map((m) => m.subCode))];
  const [curriculum, appCourses] = await Promise.all([
    prisma.isrCurriculumTbl.findMany({ where: { bsmsCode: { in: codes }, subList } }),
    prisma.course.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true, name: true, credits: true, sectionCourses: { include: { section: { select: { id: true, name: true } } } } },
    }),
  ]);
  const byCode = new Map(curriculum.map((c) => [c.bsmsCode, c]));
  const appCourseByCode = new Map(appCourses.map((c) => [c.code, c]));
  const faculty = await getFacultyByRoll(facultyRoll);

  return mappings.map((m) => {
    const c = byCode.get(m.subCode);
    const appCourse = appCourseByCode.get(m.subCode);
    return {
      subCode: m.subCode,
      // The legacy curriculum table (isr_curriculum_tbl) is the primary
      // source, but it's sparsely populated in practice - fall back to the
      // admin-managed local Course catalog (Master Data > Courses) rather
      // than showing a blank name/credit count when that lookup misses.
      title: c?.title ?? appCourse?.name ?? null,
      branch: c?.bsmsBranch ?? m.branch ?? null,
      credits: c?.bsmsCredit ?? appCourse?.credits ?? null,
      facRoll: m.facRoll!,
      facultyName: faculty?.name ?? null,
      courseId: appCourse?.id ?? null,
      sections: appCourse?.sectionCourses.map((sc) => sc.section) ?? [],
    };
  });
}

export async function getCourseRoster(courseCode: string, subList: string): Promise<CourseRosterEntry[]> {
  const registrations = await getCourseRegistrations(courseCode, subList);
  if (registrations.length === 0) return [];

  const rolls = [...new Set(registrations.map((r) => r.roll))];
  const names = await getStudentNamesByRolls(rolls);

  return rolls
    .map((roll) => ({ roll, name: names.get(roll) ?? roll }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
