import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";

// Read-only building list for the quiz-creation geofence picker. Buildings
// are admin-managed (Master Data > Buildings); faculty only need to pick one.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const buildings = await prisma.building.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, radiusMeters: true },
    });

    return ok({ items: buildings });
  } catch (error) {
    return handleApiError(error);
  }
}
