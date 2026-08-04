import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ success: true, data }, responseInit ?? { status: 200 });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(status: number, message: string, fields?: Record<string, string[]>) {
  return NextResponse.json(
    { success: false, error: { message, ...(fields ? { fields } : {}) } },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.message, error.fields);
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] = fields[key] ? [...fields[key], issue.message] : [issue.message];
    }
    return fail(400, "Validation failed", fields);
  }

  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } };
    if (prismaError.code === "P2002") {
      const target = prismaError.meta?.target?.join(", ") ?? "field";
      return fail(409, `A record with this ${target} already exists`);
    }
    if (prismaError.code === "P2025") {
      return fail(404, "Record not found");
    }
    if (prismaError.code === "P2003") {
      return fail(400, "Referenced record does not exist");
    }
  }

  // A malformed request body (e.g. invalid JSON) throws inside `req.json()`,
  // before any of our own validation runs - that's a client error, not a 500.
  if (error instanceof SyntaxError) {
    return fail(400, "Malformed request body - expected valid JSON");
  }

  console.error(error);
  return fail(500, "Internal server error");
}

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return handleApiError(error);
  }
}
