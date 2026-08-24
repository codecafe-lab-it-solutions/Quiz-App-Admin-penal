import { z } from "zod";
import { sanitizeQuestionHtml } from "@/lib/sanitize-html";

export const quizCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    // Only used when an admin creates a quiz on a faculty member's behalf -
    // ignored (the caller's own roll is used) when a faculty member creates it.
    facultyRoll: z.string().trim().min(1).optional(),
    courseCode: z.string().trim().min(1, "Select a course"),
    sectionNames: z
      .array(z.string().trim().min(1))
      .min(1, "Select at least one section"),
    buildingId: z.coerce.number().int().positive("Select a building"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(1),
    totalMarks: z.coerce.number().min(1),
    randomize: z.boolean().default(true),
    negativeMarking: z.boolean().default(false),
    allowSkipSwitch: z.boolean().default(true),
    requireLocation: z.boolean().default(true),
    status: z.enum(["draft", "scheduled"]).default("draft"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type QuizCreateInput = z.infer<typeof quizCreateSchema>;

export const quizUpdateSchema = z.object({
  title: z.string().trim().min(3).optional(),
  // Faculty reassignment (2026-08-10 MOM) - admin-only in the UI, but not
  // role-gated here since the route already requires faculty|admin for the
  // whole PATCH; deliberately allowed even on a live quiz, same as every
  // other field on this schema.
  facultyRoll: z.string().trim().min(1).optional(),
  courseCode: z.string().trim().min(1).optional(),
  sectionNames: z.array(z.string().trim().min(1)).min(1).optional(),
  buildingId: z.coerce.number().int().positive().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  totalMarks: z.coerce.number().min(1).optional(),
  randomize: z.boolean().optional(),
  negativeMarking: z.boolean().optional(),
  allowSkipSwitch: z.boolean().optional(),
  requireLocation: z.boolean().optional(),
  // No `status` field here on purpose - a quiz may only go live/completed
  // through the dedicated /start and /stop routes, which run the side
  // effects (actualStartTime/actualStopTime, allotment/question checks,
  // marking absentees) this generic edit endpoint doesn't.
});
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;

// questionText/optionText/referenceAnswer carry rich-text HTML from the
// question editor (Bold/Italic/alignment + $...$ LaTeX equations) - sanitized
// here so every write path (the dialog, bulk import, a future mobile client)
// is covered regardless of which UI produced the HTML.
const richText = (message: string) =>
  z.string().trim().min(1, message).transform(sanitizeQuestionHtml);
const richTextOptional = () =>
  z.string().trim().transform(sanitizeQuestionHtml).optional();

const mcqQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("mcq"),
  questionText: richText("Question text is required"),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0).default(0),
  orderIndex: z.coerce.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        optionText: richText("Option text is required"),
        isCorrect: z.boolean().default(false),
      }),
    )
    .min(2, "Provide at least two options")
    .refine((options) => options.some((o) => o.isCorrect), {
      message: "Mark at least one option as correct",
    }),
});

const formulaQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("formula"),
  questionText: richText("Question text is required"),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0).default(0),
  orderIndex: z.coerce.number().int().min(0).default(0),
  correctValue: z.coerce.number(),
  tolerance: z.coerce.number().min(0),
});

// Open-ended/manually-graded question. No options, no correct-option, no
// negative marking - reference answer is a grading guide and may be left
// blank when there's no single correct answer.
const subjectiveQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("subjective"),
  questionText: richText("Question text is required"),
  marks: z.coerce.number().positive("Marks must be greater than 0"),
  orderIndex: z.coerce.number().int().min(0).default(0),
  referenceAnswer: richTextOptional(),
});

export const questionSchema = z.discriminatedUnion("questionType", [
  mcqQuestionSchema,
  formulaQuestionSchema,
  subjectiveQuestionSchema,
]);
export type QuestionInput = z.infer<typeof questionSchema>;

export const questionsBulkSchema = z.object({
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export const gradeSubjectiveAnswerSchema = z.object({
  marksAwarded: z.coerce.number().min(0, "Marks awarded cannot be negative"),
});
export type GradeSubjectiveAnswerInput = z.infer<
  typeof gradeSubjectiveAnswerSchema
>;

// The checked subset of the quiz's section-derived roster, chosen in the
// allotment UI (default: everyone checked). The server still verifies every
// roll is actually a member of one of the quiz's linked sections.
// Empty is valid - sync semantics (see the allot route) treat this as "the
// full desired set of allotted students," and an empty set legitimately
// means "un-allot everyone."
export const allotSchema = z.object({
  studentRolls: z.array(z.string().trim().min(1)),
});
export type AllotInput = z.infer<typeof allotSchema>;
