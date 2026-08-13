import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

/**
 * Loads the real legacy university data (quizsample_db (2).sql, sitting at
 * the project root) straight into the isr_* tables, replacing whatever
 * synthetic demo rows were there before. This is what makes `npx prisma db
 * seed` reproduce a properly real, richly-interconnected dataset instead of
 * invented names - re-run this any time the dump file at the project root
 * changes.
 *
 * Runs only against these 9 tables (see prisma/schema.prisma's Isr* models
 * and prisma/migrations/20260810*): isr_curriculum_tbl, isr_faculty_tbl,
 * isr_login_tbl, isr_stu_data_tbl, isr_stu_main_tbl, isr_sub_available_tbl,
 * and isr_reg_btechpeg23/24/25_tbl (the only batch registration tables this
 * particular export includes).
 *
 * Two real-data quirks this deliberately works around (see the full writeup
 * in the "legacy-db-mapping" artifact, section 07):
 *  - isr_login_tbl and isr_stu_data_tbl both have a handful of duplicate
 *    primary-key values in the real export (the real system's actual PK is
 *    a separate auto-increment column, not the roll) - loaded with
 *    INSERT IGNORE so the import doesn't fail on those.
 *  - Every imported login's password is overwritten with one shared, known
 *    bcrypt hash (see DEMO_PASSWORD below) - the real password hashes are
 *    real production secrets this app has no business holding even in a
 *    sanitized dump, and they wouldn't be loggable-in with anyway.
 */

const DUMP_FILENAME = "quizsample_db (2).sql";

const TABLES = [
  "isr_curriculum_tbl",
  "isr_faculty_tbl",
  "isr_login_tbl",
  "isr_reg_btechpeg23_tbl",
  "isr_reg_btechpeg24_tbl",
  "isr_reg_btechpeg25_tbl",
  "isr_stu_data_tbl",
  "isr_stu_main_tbl",
  "isr_sub_available_tbl",
] as const;

// isr_login_tbl and isr_stu_data_tbl have real duplicate-PK rows in the dump
// (see module doc) - IGNORE keeps the first occurrence and moves on.
const IGNORE_DUPLICATES = new Set<string>(["isr_login_tbl", "isr_stu_data_tbl"]);

function findDumpPath(): string | null {
  const candidate = path.join(__dirname, "..", DUMP_FILENAME);
  return fs.existsSync(candidate) ? candidate : null;
}

function extractTableBlocks(sql: string): Map<string, string> {
  const marker = "-- Table structure for table `";
  const starts: { name: string; index: number }[] = [];
  let idx = sql.indexOf(marker);
  while (idx !== -1) {
    const nameStart = idx + marker.length;
    const nameEnd = sql.indexOf("`", nameStart);
    starts.push({ name: sql.slice(nameStart, nameEnd), index: idx });
    idx = sql.indexOf(marker, nameEnd);
  }
  const blocks = new Map<string, string>();
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : sql.length;
    blocks.set(starts[i].name, sql.slice(starts[i].index, end));
  }
  return blocks;
}

// Each block contains one or more "INSERT INTO ... VALUES (...), (...);"
// statements (phpMyAdmin batches large tables into several). Pull out each
// one as its own executable statement.
function extractInsertStatements(block: string): string[] {
  const lines = block.split("\n");
  const statements: string[] = [];
  let current: string[] = [];
  let inInsert = false;
  for (const line of lines) {
    if (line.startsWith("INSERT INTO")) inInsert = true;
    if (inInsert) current.push(line);
    if (inInsert && line.trimEnd().endsWith(";")) {
      statements.push(current.join("\n"));
      current = [];
      inInsert = false;
    }
  }
  return statements;
}

async function createRealRegTable(prisma: PrismaClient, tableName: string) {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${tableName}\``);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`${tableName}\` (
      reg_sr INT AUTO_INCREMENT PRIMARY KEY,
      b1_sem INT NULL,
      sem INT NULL,
      sub_list VARCHAR(20) NULL,
      sub_code VARCHAR(50) NULL,
      stu_roll VARCHAR(50) NULL,
      grade CHAR(2) NULL,
      grade_flag CHAR(1) NULL,
      sub_flag CHAR(1) NULL DEFAULT 'Y',
      frozen CHAR(1) NULL DEFAULT 'N',
      rs_flag VARCHAR(5) NULL DEFAULT 'N',
      rs_ref INT NULL DEFAULT 0
    )
  `);
}

export interface ImportResult {
  imported: boolean;
  counts: Record<string, number>;
}

export async function importRealLegacyData(prisma: PrismaClient): Promise<ImportResult> {
  // One-time bootstrap only. This TRUNCATEs and reloads isr_login_tbl (and
  // every other isr_* table) from a static dump file checked into the repo,
  // then overwrites every password with the shared demo hash - correct for
  // seeding a fresh/empty database, catastrophic on a live one: it was
  // silently re-running on every production deploy (post-deploy.sh -> `prisma
  // db seed` -> here, unconditionally), wiping real registrations, faculty/
  // student edits, and any password reset back to this frozen snapshot each
  // time. isr_login_tbl already having rows means a real import already
  // happened at some point - production data since then is authoritative and
  // must never be clobbered by a redeploy.
  const existingLoginRows = await prisma.isrLoginTbl.count();
  if (existingLoginRows > 0) {
    console.log(
      `[import-legacy-data] isr_login_tbl already has ${existingLoginRows} row(s) - real data already imported, skipping (this only ever runs once).`
    );
    return { imported: false, counts: {} };
  }

  const dumpPath = findDumpPath();
  if (!dumpPath) {
    console.warn(
      `\n[import-legacy-data] "${DUMP_FILENAME}" not found at the project root - skipping real-data import, isr_* tables left as-is.\n`
    );
    return { imported: false, counts: {} };
  }

  const sql = fs.readFileSync(dumpPath, "utf8");
  const blocks = extractTableBlocks(sql);

  // Drop the old synthetic-demo reg tables (isr_reg_2024_tbl / isr_reg_2025_tbl
  // from the pre-real-data seed) and create the real ones fresh.
  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS `isr_reg_2024_tbl`");
  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS `isr_reg_2025_tbl`");
  await prisma.batchTableRegistry.deleteMany({ where: { batchName: { in: ["2024", "2025"] } } });
  for (const t of ["isr_reg_btechpeg23_tbl", "isr_reg_btechpeg24_tbl", "isr_reg_btechpeg25_tbl"]) {
    await createRealRegTable(prisma, t);
  }

  for (const table of ["isr_curriculum_tbl", "isr_faculty_tbl", "isr_login_tbl", "isr_stu_data_tbl", "isr_stu_main_tbl", "isr_sub_available_tbl"]) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }

  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const block = blocks.get(table);
    if (!block) {
      console.warn(`[import-legacy-data] "${table}" not found in the dump - leaving it empty.`);
      continue;
    }
    const statements = extractInsertStatements(block);
    let count = 0;
    for (const statement of statements) {
      const sqlToRun = IGNORE_DUPLICATES.has(table)
        ? statement.replace(/^INSERT INTO/, "INSERT IGNORE INTO")
        : statement;
      const affected = await prisma.$executeRawUnsafe(sqlToRun);
      count += Number(affected);
    }
    counts[table] = count;
  }

  // Real password hashes are real production secrets - never carried over.
  // Every imported account gets the same known demo password instead (see
  // module doc), hashed once and reused rather than re-hashed per row.
  const demoHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!", 10);
  await prisma.$executeRawUnsafe("UPDATE `isr_login_tbl` SET `user_password` = ?", demoHash);

  await prisma.batchTableRegistry.upsert({
    where: { batchName: "btechpeg23" },
    update: { tableName: "isr_reg_btechpeg23_tbl", isActive: true },
    create: { batchName: "btechpeg23", tableName: "isr_reg_btechpeg23_tbl", isActive: true },
  });
  await prisma.batchTableRegistry.upsert({
    where: { batchName: "btechpeg24" },
    update: { tableName: "isr_reg_btechpeg24_tbl", isActive: true },
    create: { batchName: "btechpeg24", tableName: "isr_reg_btechpeg24_tbl", isActive: true },
  });
  await prisma.batchTableRegistry.upsert({
    where: { batchName: "btechpeg25" },
    update: { tableName: "isr_reg_btechpeg25_tbl", isActive: true },
    create: { batchName: "btechpeg25", tableName: "isr_reg_btechpeg25_tbl", isActive: true },
  });

  return { imported: true, counts };
}
