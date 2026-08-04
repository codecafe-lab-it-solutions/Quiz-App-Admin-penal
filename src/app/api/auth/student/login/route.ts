import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, ok, handleApiError } from "@/lib/api-response";
import { loginSchema } from "@/lib/validators/auth";
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  hashToken,
  tokenPayloadFromUser,
} from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());

    const student = await prisma.student.findUnique({ where: { email: body.email } });
    if (!student) throw new ApiError(401, "Invalid email or password");
    if (student.status !== "active") throw new ApiError(403, "Your account is inactive. Contact the admin office.");

    const validPassword = await verifyPassword(body.password, student.passwordHash);
    if (!validPassword) throw new ApiError(401, "Invalid email or password");

    const payload = tokenPayloadFromUser(
      { id: student.id, email: student.email, name: student.name },
      "student"
    );

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.student.update({
      where: { id: student.id },
      data: { refreshTokenHash: await hashToken(refreshToken) },
    });

    const response = ok({
      accessToken,
      refreshToken,
      user: { id: student.id, name: student.name, email: student.email, rollNo: student.rollNo },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
