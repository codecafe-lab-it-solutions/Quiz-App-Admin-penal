import { z } from "zod";

export const buildingSchema = z.object({
  name: z.string().trim().min(2, "Building name is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10).max(1000),
});
export type BuildingInput = z.infer<typeof buildingSchema>;

export const adminUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["super_admin", "admin"]).default("admin"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});
export type AdminUserInput = z.infer<typeof adminUserSchema>;

export const accountDeletionRequestStatusSchema = z.object({
  status: z.enum(["pending", "completed", "rejected"]),
});
export type AccountDeletionRequestStatusInput = z.infer<typeof accountDeletionRequestStatusSchema>;
