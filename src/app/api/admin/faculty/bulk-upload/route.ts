import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { facultyBulkRowSchema } from "@/lib/validators/faculty";
import { parseWorkbookRows } from "@/lib/excel";

interface FailedRow {
  row: number;
  data: Record<string, unknown>;
  reasons: string[];
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "No file uploaded. Attach a .xlsx file under the 'file' field.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = parseWorkbookRows<Record<string, unknown>>(buffer);

    if (rawRows.length === 0) {
      throw new ApiError(400, "The uploaded file has no data rows.");
    }

    const departments = await prisma.department.findMany();
    const departmentByName = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d]));

    const existingFaculty = await prisma.faculty.findMany({
      select: { email: true, employeeCode: true },
    });
    const existingEmails = new Set(existingFaculty.map((f) => f.email.toLowerCase()));
    const existingCodes = new Set(existingFaculty.map((f) => f.employeeCode.toLowerCase()));

    const seenEmails = new Set<string>();
    const seenCodes = new Set<string>();

    const failed: FailedRow[] = [];
    const validRows: {
      name: string;
      email: string;
      phone: string | null;
      employeeCode: string;
      departmentId: number;
      password: string;
    }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // header is row 1
      const raw = rawRows[i];
      const reasons: string[] = [];

      const parsed = facultyBulkRowSchema.safeParse({
        name: raw.Name ?? raw.name ?? "",
        email: raw.Email ?? raw.email ?? "",
        phone: raw.Phone ?? raw.phone ?? "",
        employeeCode: raw["Employee Code"] ?? raw.employeeCode ?? "",
        department: raw.Department ?? raw.department ?? "",
        password: raw["Password (optional)"] ?? raw.password ?? "",
      });

      if (!parsed.success) {
        for (const issue of parsed.error.issues) reasons.push(issue.message);
        failed.push({ row: rowNumber, data: raw, reasons });
        continue;
      }

      const data = parsed.data;
      const emailKey = data.email.toLowerCase();
      const codeKey = data.employeeCode.toLowerCase();
      const deptKey = data.department.trim().toLowerCase();

      if (existingEmails.has(emailKey) || seenEmails.has(emailKey)) {
        reasons.push(`Email '${data.email}' already exists`);
      }
      if (existingCodes.has(codeKey) || seenCodes.has(codeKey)) {
        reasons.push(`Employee code '${data.employeeCode}' already exists`);
      }
      const department = departmentByName.get(deptKey);
      if (!department) {
        reasons.push(`Department '${data.department}' does not exist`);
      }

      if (reasons.length > 0) {
        failed.push({ row: rowNumber, data: raw, reasons });
        continue;
      }

      seenEmails.add(emailKey);
      seenCodes.add(codeKey);

      validRows.push({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        employeeCode: data.employeeCode,
        departmentId: department!.id,
        password: data.password || Math.random().toString(36).slice(-10),
      });
    }

    let insertedCount = 0;
    if (validRows.length > 0) {
      const withHashes = await Promise.all(
        validRows.map(async (row) => ({
          name: row.name,
          email: row.email,
          phone: row.phone,
          employeeCode: row.employeeCode,
          departmentId: row.departmentId,
          passwordHash: await hashPassword(row.password),
        }))
      );

      await prisma.$transaction(
        withHashes.map((row) => prisma.faculty.create({ data: row }))
      );
      insertedCount = withHashes.length;
    }

    return ok({
      insertedCount,
      failedCount: failed.length,
      success: validRows.map((r) => ({ name: r.name, email: r.email, employeeCode: r.employeeCode })),
      failed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
