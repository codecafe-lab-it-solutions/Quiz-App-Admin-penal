import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { getFacultyByRoll } from "@/lib/legacy-db";
import { FacultyDashboard } from "@/components/faculty/faculty-dashboard";

export default async function FacultyPortalPage() {
  const token = cookies().get("accessToken")?.value;

  let roll: string | null = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "faculty") {
        roll = String(payload.sub);
      }
    } catch {
      roll = null;
    }
  }

  if (!roll) redirect("/login?redirect=/faculty");

  const faculty = await getFacultyByRoll(roll);
  if (!faculty) redirect("/login?redirect=/faculty");

  return <FacultyDashboard user={faculty} />;
}
