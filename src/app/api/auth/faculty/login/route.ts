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

    const faculty = await prisma.faculty.findUnique({ where: { email: body.email } });
    if (!faculty) throw new ApiError(401, "Invalid email or password");
    if (faculty.status !== "active") throw new ApiError(403, "Your account is inactive. Contact the admin office.");

    const validPassword = await verifyPassword(body.password, faculty.passwordHash);
    if (!validPassword) throw new ApiError(401, "Invalid email or password");

    const payload = tokenPayloadFromUser(
      { id: faculty.id, email: faculty.email, name: faculty.name },
      "faculty"
    );

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.faculty.update({
      where: { id: faculty.id },
      data: { refreshTokenHash: await hashToken(refreshToken) },
    });

    const response = ok({
      accessToken,
      refreshToken,
      user: { id: faculty.id, name: faculty.name, email: faculty.email, employeeCode: faculty.employeeCode },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
