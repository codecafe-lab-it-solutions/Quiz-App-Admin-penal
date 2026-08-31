import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { findLoginByIdentifier, hashLegacyPassword } from "@/lib/legacy-db";
import { compareToken } from "@/lib/auth";

// Caps brute-forcing a 5-digit code (100,000 combinations) within its
// 10-minute expiry window - once exceeded, the OTP is dead even if a
// correct guess follows.
const MAX_OTP_ATTEMPTS = 5;
const INVALID_OTP_MESSAGE = "Invalid or expired code";

export async function POST(req: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await req.json());

    const login =
      (await findLoginByIdentifier(body.identifier, "STU")) ??
      (await findLoginByIdentifier(body.identifier, "FAC"));
    if (!login) throw new ApiError(400, INVALID_OTP_MESSAGE);

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { userRoll: login.userRoll, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ApiError(400, INVALID_OTP_MESSAGE);
    }

    const validOtp = await compareToken(body.otp, otpRecord.otpHash);
    if (!validOtp) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(400, INVALID_OTP_MESSAGE);
    }

    await prisma.$transaction([
      prisma.isrLoginTbl.update({
        where: { userRoll: login.userRoll },
        data: { userPassword: hashLegacyPassword(body.newPassword) },
      }),
      prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return ok({ message: "Password has been reset successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
