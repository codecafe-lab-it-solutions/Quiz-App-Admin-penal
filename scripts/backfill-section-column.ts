import { PrismaClient } from "@prisma/client";
import { getRealMajors, resolveMajorFromBranch } from "@/lib/legacy-db";

// One-time backfill: sets isr_sub_available_tbl.section (the Major_Semester
// name the quiz-creation section picker reads live from - see
// getRealSectionsForFacultyCourse in src/lib/section-sync.ts) for every real
// row that has a branch + sem but no section label yet.
//
// This is the same logic prisma/seed.ts runs automatically on a fresh
// database bootstrap, but that path is gated to skip entirely once
// isr_login_tbl already has rows (so a redeploy never clobbers real data) -
// which also means it never got a chance to run against an
// already-populated database. This script runs the backfill on its own,
// against whatever DATABASE_URL points at, regardless of that gate.
//
// Idempotent - recomputes every row's section from its own branch+sem every
// time, safe to re-run. Dry-run by default - prints what it would do and
// touches nothing. Pass --apply to actually write.
//
// Usage:
//   tsx scripts/backfill-section-column.ts            (dry run)
//   tsx scripts/backfill-section-column.ts --apply     (writes for real)

const prisma = new PrismaClient();
const BATCH_SIZE = 200;

async function main() {
  const apply = process.argv.slice(2).includes("--apply");

  const realMajors = await getRealMajors();
  const rows = await prisma.isrSubAvailableTbl.findMany({
    where: { branch: { not: null }, sem: { not: null } },
    select: { id: true, branch: true, sem: true, section: true },
  });

  const updates = rows.map((row) => ({
    id: row.id,
    from: row.section,
    to: `${resolveMajorFromBranch(row.branch!, realMajors).trim()}_${row.sem!.trim()}`,
  }));
  const changed = updates.filter((u) => u.from !== u.to);

  console.log(
    `${apply ? "APPLYING" : "DRY RUN"} - ${rows.length} row(s) with a real branch+sem, ${changed.length} would actually change.`
  );

  if (!apply) {
    console.log("First 10 rows that would change:");
    for (const u of changed.slice(0, 10)) {
      console.log(`  id=${u.id}  "${u.from ?? "(null)"}"  ->  "${u.to}"`);
    }
    console.log("\nRe-run with --apply to actually write these values.");
    return;
  }

  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((u) => prisma.isrSubAvailableTbl.update({ where: { id: u.id }, data: { section: u.to } }))
    );
    done += batch.length;
    console.log(`  ${done}/${updates.length} processed`);
  }

  console.log(`Done. ${changed.length} row(s) updated (${updates.length - changed.length} already correct).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
