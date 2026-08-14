import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { allotSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentsForRealSections } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";

// Must use the exact same source the "Allot Students" picker itself used
// (getStudentsForRealSections - real isr_reg_<batch>_tbl registration rows,
// scoped to the quiz's own course+sections), not the cached section_students
// snapshot. That snapshot only refreshes when a section is explicitly
// created/edited/resynced, so it can go stale between when a faculty member
// picks students and when they save - silently dropping real registrants the
// picker had just shown them (confirmed: 2 of 58 real PE312 registrants were
// dropped here while section_students hadn't caught up).
async function getSectionDerivedRolls(quizId: number, facultyRoll: string, courseId: number): Promise<Set<string>> {
  const [course, quizSections] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { code: true } }),
    prisma.quizSection.findMany({ where: { quizId }, include: { section: { select: { name: true } } } }),
  ]);
  if (!course || quizSections.length === 0) return new Set();

  const subList = await getCurrentSubList();
  const sectionNames = quizSections.map((qs) => qs.section.name);
  const students = await getStudentsForRealSections(facultyRoll, course.code, subList, sectionNames);
  return new Set(students.map((s) => s.roll));
}

// Sync semantics, not append-only: `studentRolls` is the FULL desired set of
// allotted students, same as a fresh Create Quiz submission - anyone
// currently allotted but missing from the list gets un-allotted, anyone new
// gets added. This is what lets the Edit dialog's checkbox list behave
// exactly like the creation-time picker (check/uncheck freely, one save
// applies the exact end state) instead of only ever being able to add.
// A student who already has a real attempt is never removed, even if
// unchecked - their submission is real data, not a pending selection.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "completed") throw new ApiError(400, "Cannot change allotment on a completed quiz");

    const body = allotSchema.parse(await req.json());

    const eligibleRolls = await getSectionDerivedRolls(quizId, quiz.facultyRoll, quiz.courseId);
    if (eligibleRolls.size === 0) {
      throw new ApiError(400, "No eligible students for this course/section - check the quiz's linked sections have real registrants");
    }
    const desiredRolls = new Set(body.studentRolls.filter((roll) => eligibleRolls.has(roll)));

    const [existingAllotments, existingAttempts] = await Promise.all([
      prisma.quizAllotment.findMany({ where: { quizId }, select: { studentRoll: true } }),
      prisma.quizAttempt.findMany({ where: { quizId }, select: { studentRoll: true } }),
    ]);
    const existingRolls = new Set(existingAllotments.map((a) => a.studentRoll));
    const attemptedRolls = new Set(existingAttempts.map((a) => a.studentRoll));

    const toAdd = [...desiredRolls].filter((roll) => !existingRolls.has(roll));
    const requestedRemoval = [...existingRolls].filter((roll) => !desiredRolls.has(roll));
    const toRemove = requestedRemoval.filter((roll) => !attemptedRolls.has(roll));
    const blockedRemovalCount = requestedRemoval.length - toRemove.length;

    await prisma.$transaction([
      ...toAdd.map((studentRoll) => prisma.quizAllotment.create({ data: { quizId, studentRoll, status: "allotted" } })),
      ...(toRemove.length > 0 ? [prisma.quizAllotment.deleteMany({ where: { quizId, studentRoll: { in: toRemove } } })] : []),
    ]);

    const total = await prisma.quizAllotment.count({ where: { quizId } });
    return ok({
      message: "Allotment updated",
      addedCount: toAdd.length,
      removedCount: toRemove.length,
      blockedRemovalCount,
      totalAllotted: total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
