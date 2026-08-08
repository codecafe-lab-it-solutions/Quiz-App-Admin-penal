import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import type { AuthTokenPayload } from "@/lib/auth";

/**
 * Quiz create/manage endpoints under /api/faculty/quiz/* accept both the
 * "faculty" and "admin" roles (admins can create/manage a quiz on any
 * faculty member's behalf - see UPDATE PROMPT §5). These two helpers centralize
 * the resulting access rules instead of repeating an ownership `if` in every route.
 */

// A faculty member can only reach their own quizzes; an admin can reach any.
export async function loadAccessibleQuiz(user: AuthTokenPayload, quizId: number) {
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
  if (!quiz) throw new ApiError(404, "Quiz not found");
  if (user.role === "faculty" && quiz.facultyRoll !== String(user.sub)) {
    throw new ApiError(404, "Quiz not found");
  }
  return quiz;
}

// Faculty creates under their own roll; an admin must say who they're
// creating on behalf of, since an admin id isn't a faculty roll.
export function resolveFacultyRoll(user: AuthTokenPayload, bodyFacultyRoll?: string): string {
  if (user.role === "faculty") return String(user.sub);
  if (user.role === "admin") {
    if (!bodyFacultyRoll) {
      throw new ApiError(400, "facultyRoll is required when an admin creates or lists quizzes on a faculty member's behalf");
    }
    return bodyFacultyRoll;
  }
  throw new ApiError(403, "You do not have permission to perform this action");
}
