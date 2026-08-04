import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, ok, handleApiError } from "@/lib/api-response";
import { refreshSchema } from "@/lib/validators/auth";
import {
  verifyRefreshToken,
  compareToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  tokenPayloadFromUser,
} from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieRefreshToken = req.cookies.get("refreshToken")?.value;
    const { refreshToken } = refreshSchema.parse({
      refreshToken: body.refreshToken ?? cookieRefreshToken,
    });

    const decoded = verifyRefreshToken(refreshToken);

    let storedHash: string | null = null;
    let payload: ReturnType<typeof tokenPayloadFromUser>;

    if (decoded.role === "admin") {
      const admin = await prisma.admin.findUnique({ where: { id: decoded.sub } });
      if (!admin?.refreshTokenHash) throw new ApiError(401, "Session expired, please log in again");
      storedHash = admin.refreshTokenHash;
      payload = tokenPayloadFromUser({ id: admin.id, email: admin.email, name: admin.name, role: admin.role }, "admin");
    } else if (decoded.role === "faculty") {
      const faculty = await prisma.faculty.findUnique({ where: { id: decoded.sub } });
      if (!faculty?.refreshTokenHash) throw new ApiError(401, "Session expired, please log in again");
      storedHash = faculty.refreshTokenHash;
      payload = tokenPayloadFromUser({ id: faculty.id, email: faculty.email, name: faculty.name }, "faculty");
    } else {
      const student = await prisma.student.findUnique({ where: { id: decoded.sub } });
      if (!student?.refreshTokenHash) throw new ApiError(401, "Session expired, please log in again");
      storedHash = student.refreshTokenHash;
      payload = tokenPayloadFromUser({ id: student.id, email: student.email, name: student.name }, "student");
    }

    const valid = await compareToken(refreshToken, storedHash);
    if (!valid) throw new ApiError(401, "Session expired, please log in again");

    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);
    const newHash = await hashToken(newRefreshToken);

    if (decoded.role === "admin") {
      await prisma.admin.update({ where: { id: decoded.sub }, data: { refreshTokenHash: newHash } });
    } else if (decoded.role === "faculty") {
      await prisma.faculty.update({ where: { id: decoded.sub }, data: { refreshTokenHash: newHash } });
    } else {
      await prisma.student.update({ where: { id: decoded.sub }, data: { refreshTokenHash: newHash } });
    }

    const response = ok({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    setAuthCookies(response, newAccessToken, newRefreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
