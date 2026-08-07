import { z } from "zod";

export const geofenceCheckSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type GeofenceCheckInput = z.infer<typeof geofenceCheckSchema>;

export const startAttemptSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const answerSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  selectedOptionId: z.coerce.number().int().positive().nullable().optional(),
  answerValue: z.coerce.number().nullable().optional(),
  writtenAnswer: z.string().nullable().optional(),
  isSkipped: z.boolean().default(false),
});
export type AnswerInput = z.infer<typeof answerSchema>;

export const submitAttemptSchema = z.object({
  autoSubmitted: z.boolean().default(false),
  reason: z.string().trim().optional(),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const antiCheatEventSchema = z.object({
  eventType: z.enum(["screen_switch", "overlay_detected", "background"]),
});
export type AntiCheatEventInput = z.infer<typeof antiCheatEventSchema>;
