import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { buildWorkbookBuffer, excelResponseHeaders } from "@/lib/excel";

const HEADERS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "rollNo", label: "Roll No" },
  { key: "enrollmentNo", label: "Enrollment No" },
  { key: "password", label: "Password (optional)" },
];

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const buffer = buildWorkbookBuffer(
      HEADERS,
      [
        {
          name: "John Smith",
          email: "john.smith@example.edu",
          phone: "9876543210",
          rollNo: "R2024001",
          enrollmentNo: "EN2024001",
          password: "",
        },
      ],
      "Student Template"
    );

    return new Response(new Uint8Array(buffer), { headers: excelResponseHeaders("student-template.xlsx") });
  } catch (error) {
    return handleApiError(error);
  }
}
