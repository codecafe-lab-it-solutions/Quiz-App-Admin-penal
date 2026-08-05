import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { semesterConfigUpdateSchema } from "@/lib/validators/config";
import {
  getCurrentSubList,
  setCurrentSubList,
  listBatchRegistry,
  upsertBatchRegistryEntry,
  setBatchRegistryActive,
  removeBatchRegistryEntry,
} from "@/lib/config";

async function currentState() {
  const [currentSubList, batchRegistry] = await Promise.all([getCurrentSubList(), listBatchRegistry()]);
  return { currentSubList, batchRegistry };
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    return ok(await currentState());
  } catch (error) {
    return handleApiError(error);
  }
}

// Drives the current sub_list (the active semester-cycle code that scopes
// legacy course-mapping reads) and the batch -> physical table allow-list.
export async function PUT(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = semesterConfigUpdateSchema.parse(await req.json());

    if (body.currentSubList) await setCurrentSubList(body.currentSubList);
    if (body.upsertBatch) await upsertBatchRegistryEntry(body.upsertBatch);
    if (body.toggleBatch) await setBatchRegistryActive(body.toggleBatch.batchName, body.toggleBatch.isActive);
    if (body.removeBatch) await removeBatchRegistryEntry(body.removeBatch);

    return ok(await currentState());
  } catch (error) {
    return handleApiError(error);
  }
}
