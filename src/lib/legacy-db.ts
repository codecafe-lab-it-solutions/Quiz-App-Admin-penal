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
}

export interface LegacyStudent {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
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
  const rows = await prisma.$queryRaw<{ roll: string; name: string; user_email: string }[]>`
    SELECT f.roll AS roll, f.name AS name, l.user_email AS user_email
    FROM isr_faculty_tbl f
    JOIN isr_login_tbl l ON l.user_roll = f.roll
    WHERE f.roll = ${roll} AND l.user_type = 'FAC'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { roll: row.roll, name: row.name, email: row.user_email };
}

export async function getStudentByRoll(roll: string): Promise<LegacyStudent | null> {
  const rows = await prisma.$queryRaw<
    { roll: string; stu_name: string; user_email: string; major: string; batch: string; sem_now: string }[]
  >`
    SELECT d.stu_roll AS roll, d.stu_name AS stu_name, l.user_email AS user_email,
           m.major AS major, m.batch AS batch, m.sem_now AS sem_now
    FROM isr_stu_data_tbl d
    JOIN isr_login_tbl l ON l.user_roll = d.stu_roll
    LEFT JOIN isr_stu_main_tbl m ON m.roll = d.stu_roll
    WHERE d.stu_roll = ${roll} AND l.user_type = 'STU'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    roll: row.roll,
    name: row.stu_name,
    email: row.user_email,
    major: row.major ?? "",
    batch: row.batch ?? "",
    semNow: row.sem_now ?? "",
  };
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
    prisma.$queryRaw<{ roll: string; name: string; user_email: string }[]>(Prisma.sql`
      SELECT f.roll AS roll, f.name AS name, l.user_email AS user_email
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
    items: items.map((r) => ({ roll: r.roll, name: r.name, email: r.user_email })),
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
      { roll: string; stu_name: string; user_email: string; major: string; batch: string; sem_now: string }[]
    >(Prisma.sql`
      SELECT d.stu_roll AS roll, d.stu_name AS stu_name, l.user_email AS user_email,
             m.major AS major, m.batch AS batch, m.sem_now AS sem_now
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

  return {
    items: items.map((r) => ({
      roll: r.roll,
      name: r.stu_name,
      email: r.user_email,
      major: r.major ?? "",
      batch: r.batch ?? "",
      semNow: r.sem_now ?? "",
    })),
    total: Number(countRows[0]?.total ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Faculty / Student creation - writes into the legacy tables at the admin's
// explicit request. Roll and email must be unique across isr_login_tbl.
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

  return { roll: data.roll, name: data.name, email: data.email };
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
      data: { roll: data.roll, major: data.major, name: data.name, batch: data.batch, semNow: data.semNow },
    }),
  ]);

  return { roll: data.roll, name: data.name, email: data.email, major: data.major, batch: data.batch, semNow: data.semNow };
}

// ---------------------------------------------------------------------------
// Faculty <-> Course mapping (isr_sub_available_tbl)
// ---------------------------------------------------------------------------

export async function getFacultyCourseMappings(
  subList: string,
  params: { facultyRoll?: string; page: number; pageSize: number }
) {
  const offset = (params.page - 1) * params.pageSize;

  const rows = await prisma.isrSubAvailableTbl.findMany({
    where: { subList, ...(params.facultyRoll ? { facRoll: params.facultyRoll } : {}) },
    orderBy: { subCode: "asc" },
    skip: offset,
    take: params.pageSize,
  });
  const total = await prisma.isrSubAvailableTbl.count({
    where: { subList, ...(params.facultyRoll ? { facRoll: params.facultyRoll } : {}) },
  });

  const facultyRolls = [...new Set(rows.map((r) => r.facRoll))];
  const facultyNames = facultyRolls.length
    ? await prisma.isrFacultyTbl.findMany({ where: { roll: { in: facultyRolls } } })
    : [];
  const nameByRoll = new Map(facultyNames.map((f) => [f.roll, f.name]));

  const items: FacultyCourseMapping[] = rows.map((r) => ({
    id: r.id,
    sem: r.sem,
    subList: r.subList,
    subCode: r.subCode,
    facRoll: r.facRoll,
    facultyName: nameByRoll.get(r.facRoll) ?? null,
    branch: r.branch,
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

  return { id: row.id, sem: row.sem, subList: row.subList, subCode: row.subCode, facRoll: row.facRoll, facultyName: faculty.name, branch: row.branch };
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

// TODO: column names inside isr_reg_<batch>_tbl are unconfirmed - assumed
// `roll` and `sub_code` to match the naming pattern of the other isr_* tables.
// Adjust the two column identifiers below once confirmed.
const REG_ROLL_COLUMN = "roll";
const REG_SUB_CODE_COLUMN = "sub_code";

export async function getStudentCourses(roll: string, batch: string): Promise<StudentCourseRow[]> {
  const tableName = await resolveBatchTable(batch);
  if (!tableName) return [];

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
      `SELECT \`${REG_ROLL_COLUMN}\` AS roll, \`${REG_SUB_CODE_COLUMN}\` AS sub_code FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ?`,
      roll
    );
    return rows.map((r) => ({ roll: r.roll, subCode: r.sub_code }));
  } catch (error) {
    console.error(`getStudentCourses: query against ${tableName} failed`, error);
    return [];
  }
}

export async function getCourseRegistrations(courseCode: string): Promise<(StudentCourseRow & { batch: string })[]> {
  const registry = (await listBatchRegistry()).filter((r) => r.isActive);
  const results: (StudentCourseRow & { batch: string })[] = [];

  for (const entry of registry) {
    if (!SAFE_TABLE_NAME.test(entry.tableName)) continue;
    try {
      const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
        `SELECT \`${REG_ROLL_COLUMN}\` AS roll, \`${REG_SUB_CODE_COLUMN}\` AS sub_code FROM \`${entry.tableName}\` WHERE \`${REG_SUB_CODE_COLUMN}\` = ?`,
        courseCode
      );
      results.push(...rows.map((r) => ({ roll: r.roll, subCode: r.sub_code, batch: entry.batchName })));
    } catch (error) {
      console.error(`getCourseRegistrations: query against ${entry.tableName} failed`, error);
    }
  }

  return results;
}

export async function createStudentCourseMapping(data: {
  roll: string;
  subCode: string;
}): Promise<StudentCourseRow & { batch: string }> {
  const student = await getStudentByRoll(data.roll);
  if (!student || !student.batch) throw new ApiError(404, "No student found for this roll number, or the student has no batch on record");

  const tableName = await resolveBatchTable(student.batch);
  if (!tableName) throw new ApiError(400, `No registration table is configured for batch "${student.batch}"`);

  const existing = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE \`${REG_ROLL_COLUMN}\` = ? AND \`${REG_SUB_CODE_COLUMN}\` = ?`,
    data.roll,
    data.subCode
  );
  if (Number(existing[0]?.cnt ?? 0) > 0) {
    throw new ApiError(409, "Student is already registered for this course");
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\` (\`${REG_ROLL_COLUMN}\`, \`${REG_SUB_CODE_COLUMN}\`) VALUES (?, ?)`,
    data.roll,
    data.subCode
  );

  return { roll: data.roll, subCode: data.subCode, batch: student.batch };
}
