import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyAccessToken } from "@/lib/auth";

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("accessToken")?.value;

  let authorized = false;
  if (token) {
    try {
      authorized = verifyAccessToken(token).role === "faculty";
    } catch {
      authorized = false;
    }
  }

  if (!authorized) redirect("/login?redirect=/faculty");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-4 p-4 py-8">
        <Link href="/faculty" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
        {children}
      </div>
    </div>
  );
}
