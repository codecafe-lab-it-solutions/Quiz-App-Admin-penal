import { PrismaClient } from "@prisma/client";
import { verifyLegacyPassword } from "@/lib/legacy-db";

// Run this from wherever the app's own DATABASE_URL is loaded (e.g. the
// deployed "current" release dir) to answer, definitively: which DB is this
// connected to, and would a real login for a given user actually succeed.
//
// Usage: npx tsx scripts/diagnose-login.ts [roll1] [roll2] ...
// (defaults to RF0240 + one arbitrary student if no rolls given)

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "(not set)";
  const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  console.log("DATABASE_URL:", masked);

  const rollsArg = process.argv.slice(2);
  const rolls = rollsArg.length > 0 ? rollsArg : ["RF0240"];

  if (rollsArg.length === 0) {
    const anyStudent = await prisma.isrLoginTbl.findFirst({ where: { userType: "STU" } });
    if (anyStudent) rolls.push(anyStudent.userRoll);
  }

  const totalRows = await prisma.isrLoginTbl.count();
  console.log(`Total isr_login_tbl rows visible from here: ${totalRows}`);

  for (const roll of rolls) {
    const row = await prisma.isrLoginTbl.findUnique({ where: { userRoll: roll } });
    if (!row) {
      console.log(`\n${roll}: NOT FOUND in this database`);
      continue;
    }
    const matchesOwnRoll = await verifyLegacyPassword(roll, row.userPassword);
    console.log(`\n${roll} (${row.userType}, status=${row.status}):`);
    console.log(`  user_password: ${row.userPassword}`);
    console.log(`  verifyLegacyPassword("${roll}", user_password) => ${matchesOwnRoll ? "PASS - login would succeed" : "FAIL - login would be rejected"}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
