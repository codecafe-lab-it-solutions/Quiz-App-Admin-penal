import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { StudentShell } from "@/components/student/student-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("accessToken")?.value;

  let user: { name: string; email: string } | null = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "student") {
        user = { name: payload.name, email: payload.email };
      }
    } catch {
      user = null;
    }
  }

  if (!user) redirect("/login?redirect=/student");

  return (
    <StudentShell name={user.name} email={user.email}>
      {children}
    </StudentShell>
  );
}
