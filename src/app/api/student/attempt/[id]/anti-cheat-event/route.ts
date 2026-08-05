import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { antiCheatEventSchema } from "@/lib/validators/attempt";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "student");

    const { id: attemptId } = idParamSchema.parse(params);
    const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentRoll !== String(user.sub)) throw new ApiError(404, "Attempt not found");

    const body = antiCheatEventSchema.parse(await req.json());

    if (attempt.status !== "in_progress") {
      return ok({ action: "none", message: "Attempt is no longer in progress" });
    }

    const actionTaken = "force_submit";

    await prisma.antiCheatEvent.create({
      data: {
        attemptId,
        eventType: body.eventType,
        actionTaken,
      },
    });

    return ok({
      action: "force_submit",
      autoSubmitReason: body.eventType,
      message: "Anti-cheat violation detected. Submit this attempt immediately with auto_submitted=true.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
