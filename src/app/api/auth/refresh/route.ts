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
import { getFacultyByRoll, getStudentByRoll } from "@/lib/legacy-db";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieRefreshToken = req.cookies.get("refreshToken")?.value;
    const { refreshToken } = refreshSchema.parse({
      refreshToken: body.refreshToken ?? cookieRefreshToken,
    });

    const decoded = verifyRefreshToken(refreshToken);

    let payload: ReturnType<typeof tokenPayloadFromUser>;

    if (decoded.role === "admin") {
      const admin = await prisma.admin.findUnique({ where: { id: Number(decoded.sub) } });
      if (!admin?.refreshTokenHash) throw new ApiError(401, "Session expired, please log in again");
      const valid = await compareToken(refreshToken, admin.refreshTokenHash);
      if (!valid) throw new ApiError(401, "Session expired, please log in again");
      payload = tokenPayloadFromUser({ id: admin.id, email: admin.email, name: admin.name, role: admin.role }, "admin");

      const newAccessToken = signAccessToken(payload);
      const newRefreshToken = signRefreshToken(payload);
      await prisma.admin.update({ where: { id: admin.id }, data: { refreshTokenHash: await hashToken(newRefreshToken) } });

      const response = ok({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      setAuthCookies(response, newAccessToken, newRefreshToken);
      return response;
    }

    // Faculty/student have no app-owned refresh-token-hash storage (identity
    // lives in the read-only legacy tables), so rotation here just re-verifies
    // the JWT signature/expiry and re-mints tokens off the current legacy profile.
    if (decoded.role === "faculty") {
      const faculty = await getFacultyByRoll(String(decoded.sub));
      if (!faculty) throw new ApiError(401, "Session expired, please log in again");
      payload = tokenPayloadFromUser({ id: faculty.roll, email: faculty.email, name: faculty.name }, "faculty");
    } else {
      const student = await getStudentByRoll(String(decoded.sub));
      if (!student) throw new ApiError(401, "Session expired, please log in again");
      payload = tokenPayloadFromUser({ id: student.roll, email: student.email, name: student.name }, "student");
    }

    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);
    const response = ok({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    setAuthCookies(response, newAccessToken, newRefreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
