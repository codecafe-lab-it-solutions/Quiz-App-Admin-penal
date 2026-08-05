import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { getStudentByRoll } from "@/lib/legacy-db";
import { StudentDashboard } from "@/components/student/student-dashboard";

export default async function StudentPortalPage() {
  const token = cookies().get("accessToken")?.value;

  let roll: string | null = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "student") {
        roll = String(payload.sub);
      }
    } catch {
      roll = null;
    }
  }

  if (!roll) redirect("/login?redirect=/student");

  const student = await getStudentByRoll(roll);
  if (!student) redirect("/login?redirect=/student");

  return <StudentDashboard user={student} />;
}
