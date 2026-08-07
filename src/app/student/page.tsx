import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { getStudentByRoll } from "@/lib/legacy-db";
import { StudentTests } from "@/components/student/student-tests";

export default async function StudentPortalPage() {
  const token = cookies().get("accessToken")?.value;
  let roll: string | null = null;
  try {
    if (token) roll = String(verifyAccessToken(token).sub);
  } catch {
    roll = null;
  }
  const student = roll ? await getStudentByRoll(roll) : null;

  return (
    <div className="space-y-4">
      {student && (
        <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Roll</dt>
            <dd className="font-medium">{student.roll}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Major</dt>
            <dd className="font-medium">{student.major || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Batch</dt>
            <dd className="font-medium">{student.batch || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current Semester</dt>
            <dd className="font-medium">{student.semNow || "—"}</dd>
          </div>
        </dl>
      )}
      <StudentTests />
    </div>
  );
}
