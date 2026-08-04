import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { buildWorkbookBuffer, excelResponseHeaders } from "@/lib/excel";

const HEADERS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "employeeCode", label: "Employee Code" },
  { key: "department", label: "Department" },
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
          name: "Jane Doe",
          email: "jane.doe@example.edu",
          phone: "9876543210",
          employeeCode: "FAC1001",
          department: "Computer Science",
          password: "",
        },
      ],
      "Faculty Template"
    );

    return new Response(new Uint8Array(buffer), { headers: excelResponseHeaders("faculty-template.xlsx") });
  } catch (error) {
    return handleApiError(error);
  }
}
