import { z } from "zod";

export const quizCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    courseId: z.coerce.number().int().positive("Select a course"),
    sectionId: z.coerce.number().int().positive("Select a section"),
    buildingId: z.coerce.number().int().positive("Select a building"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(1),
    totalMarks: z.coerce.number().int().min(1),
    randomize: z.boolean().default(true),
    negativeMarking: z.boolean().default(false),
    allowSkipSwitch: z.boolean().default(true),
    status: z.enum(["draft", "scheduled"]).default("draft"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type QuizCreateInput = z.infer<typeof quizCreateSchema>;

export const quizUpdateSchema = z.object({
  title: z.string().trim().min(3).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  buildingId: z.coerce.number().int().positive().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  totalMarks: z.coerce.number().int().min(1).optional(),
  randomize: z.boolean().optional(),
  negativeMarking: z.boolean().optional(),
  allowSkipSwitch: z.boolean().optional(),
  status: z.enum(["draft", "scheduled", "live", "completed"]).optional(),
});
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;

const mcqQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("mcq"),
  questionText: z.string().trim().min(1, "Question text is required"),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0).default(0),
  orderIndex: z.coerce.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        optionText: z.string().trim().min(1, "Option text is required"),
        isCorrect: z.boolean().default(false),
      })
    )
    .min(2, "Provide at least two options")
    .refine((options) => options.some((o) => o.isCorrect), {
      message: "Mark at least one option as correct",
    }),
});

const formulaQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("formula"),
  questionText: z.string().trim().min(1, "Question text is required"),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0).default(0),
  orderIndex: z.coerce.number().int().min(0).default(0),
  correctValue: z.coerce.number(),
  tolerance: z.coerce.number().min(0),
});

export const questionSchema = z.discriminatedUnion("questionType", [
  mcqQuestionSchema,
  formulaQuestionSchema,
]);
export type QuestionInput = z.infer<typeof questionSchema>;

export const questionsBulkSchema = z.object({
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export const allotSchema = z.object({
  mode: z.enum(["section", "custom"]),
  studentIds: z.array(z.number().int().positive()).optional(),
});
export type AllotInput = z.infer<typeof allotSchema>;
