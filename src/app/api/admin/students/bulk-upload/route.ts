import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { studentBulkRowSchema } from "@/lib/validators/student";
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

    const existingStudents = await prisma.student.findMany({
      select: { email: true, rollNo: true, enrollmentNo: true },
    });
    const existingEmails = new Set(existingStudents.map((s) => s.email.toLowerCase()));
    const existingRollNos = new Set(existingStudents.map((s) => s.rollNo.toLowerCase()));
    const existingEnrollmentNos = new Set(existingStudents.map((s) => s.enrollmentNo.toLowerCase()));

    const seenEmails = new Set<string>();
    const seenRollNos = new Set<string>();
    const seenEnrollmentNos = new Set<string>();

    const failed: FailedRow[] = [];
    const validRows: {
      name: string;
      email: string;
      phone: string | null;
      rollNo: string;
      enrollmentNo: string;
      password: string;
    }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2;
      const raw = rawRows[i];
      const reasons: string[] = [];

      const parsed = studentBulkRowSchema.safeParse({
        name: raw.Name ?? raw.name ?? "",
        email: raw.Email ?? raw.email ?? "",
        phone: raw.Phone ?? raw.phone ?? "",
        rollNo: raw["Roll No"] ?? raw.rollNo ?? "",
        enrollmentNo: raw["Enrollment No"] ?? raw.enrollmentNo ?? "",
        password: raw["Password (optional)"] ?? raw.password ?? "",
      });

      if (!parsed.success) {
        for (const issue of parsed.error.issues) reasons.push(issue.message);
        failed.push({ row: rowNumber, data: raw, reasons });
        continue;
      }

      const data = parsed.data;
      const emailKey = data.email.toLowerCase();
      const rollKey = data.rollNo.toLowerCase();
      const enrollmentKey = data.enrollmentNo.toLowerCase();

      if (existingEmails.has(emailKey) || seenEmails.has(emailKey)) {
        reasons.push(`Email '${data.email}' already exists`);
      }
      if (existingRollNos.has(rollKey) || seenRollNos.has(rollKey)) {
        reasons.push(`Roll number '${data.rollNo}' already exists`);
      }
      if (existingEnrollmentNos.has(enrollmentKey) || seenEnrollmentNos.has(enrollmentKey)) {
        reasons.push(`Enrollment number '${data.enrollmentNo}' already exists`);
      }

      if (reasons.length > 0) {
        failed.push({ row: rowNumber, data: raw, reasons });
        continue;
      }

      seenEmails.add(emailKey);
      seenRollNos.add(rollKey);
      seenEnrollmentNos.add(enrollmentKey);

      validRows.push({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        rollNo: data.rollNo,
        enrollmentNo: data.enrollmentNo,
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
          rollNo: row.rollNo,
          enrollmentNo: row.enrollmentNo,
          passwordHash: await hashPassword(row.password),
        }))
      );

      await prisma.$transaction(
        withHashes.map((row) => prisma.student.create({ data: row }))
      );
      insertedCount = withHashes.length;
    }

    return ok({
      insertedCount,
      failedCount: failed.length,
      success: validRows.map((r) => ({ name: r.name, email: r.email, rollNo: r.rollNo })),
      failed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
