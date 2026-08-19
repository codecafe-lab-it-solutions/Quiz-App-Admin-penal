import { PrismaClient } from "@prisma/client";
import { hashLegacyPassword } from "@/lib/legacy-db";

// One-time reset: every isr_login_tbl row's password becomes the MD5 hash
// of that row's own userRoll (isr_login_tbl.user_password's real scheme -
// see hashLegacyPassword). Dry-run by default - prints what it would do
// and touches nothing. Pass --apply to actually write.
//
// Usage:
//   tsx scripts/reset-passwords-to-roll.ts            (dry run)
//   tsx scripts/reset-passwords-to-roll.ts --apply     (writes for real)
//   tsx scripts/reset-passwords-to-roll.ts --apply --type=STU   (students only)
//   tsx scripts/reset-passwords-to-roll.ts --apply --type=FAC   (faculty only)

const prisma = new PrismaClient();
const BATCH_SIZE = 200;

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const typeArg = args.find((a) => a.startsWith("--type="))?.split("=")[1];
  const userType = typeArg === "STU" || typeArg === "FAC" ? typeArg : undefined;

  const rows = await prisma.isrLoginTbl.findMany({
    where: userType ? { userType } : undefined,
    select: { userRoll: true, userType: true, userEmail: true },
  });

  console.log(`${apply ? "APPLYING" : "DRY RUN"} - ${rows.length} login row(s) matched${userType ? ` (type=${userType})` : ""}.`);

  if (!apply) {
    console.log("First 10 rows that would be reset:");
    for (const r of rows.slice(0, 10)) {
      console.log(`  ${r.userType}  ${r.userRoll}  (${r.userEmail})  ->  new password = "${r.userRoll}"`);
    }
    console.log("\nRe-run with --apply to actually write these passwords.");
    return;
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (r) => {
        const hash = hashLegacyPassword(r.userRoll);
        await prisma.isrLoginTbl.update({ where: { userRoll: r.userRoll }, data: { userPassword: hash } });
      })
    );
    done += batch.length;
    console.log(`  ${done}/${rows.length} updated`);
  }

  console.log(`Done. ${done} user(s) now have their roll number as their password.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
