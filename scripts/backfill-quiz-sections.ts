import { PrismaClient } from "@prisma/client";
import { getCurrentSubList } from "@/lib/config";
import { getRealSectionsForFacultyCourse } from "@/lib/section-sync";

// Recovers Quiz.sectionNames for quizzes left blank by the interrupted
// 2026-08-18 migration (the section_courses/quiz_sections/sections tables
// it dropped were the only place that link used to live, so it's not
// directly recoverable). Instead, for each blank quiz this looks up which
// real section(s) that quiz's own facultyRoll + courseCode maps to today
// (isr_sub_available_tbl.section, via getRealSectionsForFacultyCourse - the
// same live lookup the Create/Edit Quiz section picker itself uses). When a
// faculty teaches that course under exactly one section, this is a
// confident inference, not a guess - it's the section any quiz they create
// for that course would show today. Ambiguous cases (a faculty teaching the
// same course under 0 or 2+ real sections) are reported, not guessed at.
//
// Skips quizzes with courseCode "UNKNOWN" (the earlier migration's
// last-resort placeholder for quizzes with no attendance rows to recover a
// real course from either) - there's no course to look sections up against.
//
// Dry-run by default - prints what it would do and touches nothing.
// Pass --apply to actually write.
//
// Usage:
//   tsx scripts/backfill-quiz-sections.ts            (dry run)
//   tsx scripts/backfill-quiz-sections.ts --apply     (writes for real)

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const subList = await getCurrentSubList();

  const blankQuizzes = await prisma.quiz.findMany({
    where: { sectionNames: "" },
    select: { id: true, title: true, facultyRoll: true, courseCode: true, courseName: true },
    orderBy: { id: "asc" },
  });

  console.log(`${apply ? "APPLYING" : "DRY RUN"} - ${blankQuizzes.length} quiz(zes) with blank sections, checking against subList "${subList}".`);

  const resolved: { id: number; title: string; sectionNames: string }[] = [];
  const skipped: { id: number; title: string; reason: string }[] = [];

  for (const quiz of blankQuizzes) {
    if (quiz.courseCode === "UNKNOWN") {
      skipped.push({ id: quiz.id, title: quiz.title, reason: "course itself is unrecoverable (courseCode=UNKNOWN)" });
      continue;
    }

    const options = await getRealSectionsForFacultyCourse(quiz.facultyRoll, quiz.courseCode, subList);
    const names = [...new Set(options.map((o) => o.name))];

    if (names.length === 0) {
      skipped.push({ id: quiz.id, title: quiz.title, reason: `${quiz.facultyRoll} has no real section mapping for ${quiz.courseCode} in "${subList}"` });
    } else if (names.length > 1) {
      skipped.push({ id: quiz.id, title: quiz.title, reason: `ambiguous - ${quiz.facultyRoll} teaches ${quiz.courseCode} under ${names.length} real sections (${names.join(", ")})` });
    } else {
      resolved.push({ id: quiz.id, title: quiz.title, sectionNames: names[0] });
    }
  }

  console.log(`\nResolvable: ${resolved.length}`);
  for (const r of resolved) console.log(`  #${r.id} "${r.title}"  ->  "${r.sectionNames}"`);

  console.log(`\nSkipped (left as-is): ${skipped.length}`);
  for (const s of skipped) console.log(`  #${s.id} "${s.title}"  -  ${s.reason}`);

  if (!apply) {
    console.log("\nRe-run with --apply to actually write the resolvable ones.");
    return;
  }

  for (const r of resolved) {
    await prisma.quiz.update({ where: { id: r.id }, data: { sectionNames: r.sectionNames } });
  }
  console.log(`\nDone. ${resolved.length} quiz(zes) updated, ${skipped.length} left unresolved.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
