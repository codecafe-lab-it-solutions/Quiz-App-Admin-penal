import { NextRequest } from "next/server";
import { ApiError, ok, handleApiError } from "@/lib/api-response";
import { loginSchema } from "@/lib/validators/auth";
import { signAccessToken, signRefreshToken, tokenPayloadFromUser } from "@/lib/auth";
import { findLoginByEmail, verifyLegacyPassword, getFacultyByRoll } from "@/lib/legacy-db";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());

    const login = await findLoginByEmail(body.email, "FAC");
    if (!login) throw new ApiError(401, "Invalid email or password");

    const validPassword = await verifyLegacyPassword(body.password, login.userPassword);
    if (!validPassword) throw new ApiError(401, "Invalid email or password");

    const faculty = await getFacultyByRoll(login.userRoll);
    if (!faculty) throw new ApiError(401, "Invalid email or password");

    const payload = tokenPayloadFromUser({ id: faculty.roll, email: faculty.email, name: faculty.name }, "faculty");

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // No app-owned faculty row exists to persist a refresh-token hash on -
    // faculty/student refresh tokens rely on JWT expiry rather than
    // server-side revocation (admin login is unaffected, see refresh/logout routes).

    const response = ok({
      accessToken,
      refreshToken,
      user: { roll: faculty.roll, name: faculty.name, email: faculty.email },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
