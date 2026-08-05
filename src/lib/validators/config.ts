import { z } from "zod";

export const semesterConfigUpdateSchema = z.object({
  currentSubList: z.string().trim().min(1).optional(),
  upsertBatch: z
    .object({
      batchName: z.string().trim().min(1),
      tableName: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9_]+$/, "Table name may only contain letters, numbers and underscores"),
      isActive: z.boolean().optional(),
    })
    .optional(),
  toggleBatch: z
    .object({
      batchName: z.string().trim().min(1),
      isActive: z.boolean(),
    })
    .optional(),
  removeBatch: z.string().trim().min(1).optional(),
});
