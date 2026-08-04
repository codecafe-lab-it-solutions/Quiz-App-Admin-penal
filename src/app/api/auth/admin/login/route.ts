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

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    if (!admin) throw new ApiError(401, "Invalid email or password");

    const validPassword = await verifyPassword(body.password, admin.passwordHash);
    if (!validPassword) throw new ApiError(401, "Invalid email or password");

    const payload = tokenPayloadFromUser(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      "admin"
    );

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { refreshTokenHash: await hashToken(refreshToken) },
    });

    const response = ok({
      accessToken,
      refreshToken,
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
