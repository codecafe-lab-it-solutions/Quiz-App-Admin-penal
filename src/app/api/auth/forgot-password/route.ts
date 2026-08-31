import { randomInt } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { findLoginByIdentifier } from "@/lib/legacy-db";
import { hashToken } from "@/lib/auth";
import { sendErpMailOtp } from "@/lib/erp-mail";

const OTP_EXPIRY_MINUTES = 10;
const GENERIC_MESSAGE = "If an account exists for that ID, a code has been emailed.";

function generateOtp(): string {
  return String(randomInt(10000, 100000)); // always 5 digits
}

export async function POST(req: NextRequest) {
  try {
    const body = forgotPasswordSchema.parse(await req.json());

    // Never reveal which identifiers are real accounts - same identifier can
    // belong to either a student or faculty row (see findLoginByIdentifier).
    const login =
      (await findLoginByIdentifier(body.identifier, "STU")) ??
      (await findLoginByIdentifier(body.identifier, "FAC"));

    if (login && login.status === 1) {
      const otp = generateOtp();
      const otpHash = await hashToken(otp);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

      await prisma.passwordResetOtp.create({
        data: { userRoll: login.userRoll, userType: login.userType, otpHash, expiresAt },
      });

      try {
        await sendErpMailOtp({ mailTo: login.userEmail, otp });
      } catch (error) {
        // Logged for ops, but never surfaced - the response must stay generic
        // whether or not the account exists or the mail send succeeded.
        console.error("forgot-password: failed to send OTP mail", error);
      }
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (error) {
    return handleApiError(error);
  }
}
