import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { created, handleApiError } from "@/lib/api-response";
import { deleteAccountRequestSchema } from "@/lib/validators/auth";

export async function POST(req: NextRequest) {
  try {
    const body = deleteAccountRequestSchema.parse(await req.json());

    await prisma.accountDeletionRequest.create({
      data: { identifier: body.identifier },
    });

    return created({
      message: "Your account deletion request has been submitted. An admin will review it shortly.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
