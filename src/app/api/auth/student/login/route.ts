import { NextRequest } from "next/server";
import { ApiError, ok, handleApiError } from "@/lib/api-response";
import { loginSchema } from "@/lib/validators/auth";
import { signAccessToken, signRefreshToken, tokenPayloadFromUser } from "@/lib/auth";
import { findLoginByIdentifier, verifyLegacyPassword, getStudentByRoll } from "@/lib/legacy-db";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());

    const login = await findLoginByIdentifier(body.identifier, "STU");
    if (!login) throw new ApiError(401, "Invalid roll number, email, mobile number, or password");

    const validPassword = await verifyLegacyPassword(body.password, login.userPassword);
    if (!validPassword) throw new ApiError(401, "Invalid roll number, email, mobile number, or password");

    if (login.status !== 1) throw new ApiError(403, "This account has been deactivated. Contact the admin office.");

    const student = await getStudentByRoll(login.userRoll);
    if (!student) throw new ApiError(401, "Invalid roll number, email, mobile number, or password");

    const payload = tokenPayloadFromUser({ id: student.roll, email: student.email, name: student.name }, "student");

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // No app-owned student row exists to persist a refresh-token hash on -
    // faculty/student refresh tokens rely on JWT expiry rather than
    // server-side revocation (admin login is unaffected, see refresh/logout routes).

    const response = ok({
      accessToken,
      refreshToken,
      user: { roll: student.roll, name: student.name, email: student.email, batch: student.batch, semNow: student.semNow },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
