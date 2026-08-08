import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";

// Read-only session list for the quiz-creation "map to an upcoming session"
// picker. Sessions are admin-managed (Master Data > Sessions).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const sessions = await prisma.academicSession.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    });

    return ok({ items: sessions });
  } catch (error) {
    return handleApiError(error);
  }
}
