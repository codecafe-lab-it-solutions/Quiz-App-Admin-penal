import { z } from "zod";
import { sanitizeQuestionHtml } from "@/lib/sanitize-html";

export const quizCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    // Only used when an admin creates a quiz on a faculty member's behalf -
    // ignored (the caller's own roll is used) when a faculty member creates it.
    facultyRoll: z.string().trim().min(1).optional(),
    courseId: z.coerce.number().int().positive("Select a course"),
    // TODO: section source pending confirmation - no legacy source yet, optional until then
    sectionId: z.coerce.number().int().positive().optional(),
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

// questionText/optionText/referenceAnswer carry rich-text HTML from the
// question editor (Bold/Italic/alignment + $...$ LaTeX equations) - sanitized
// here so every write path (the dialog, bulk import, a future mobile client)
// is covered regardless of which UI produced the HTML.
const richText = (message: string) => z.string().trim().min(1, message).transform(sanitizeQuestionHtml);
const richTextOptional = () => z.string().trim().transform(sanitizeQuestionHtml).optional();

const mcqQuestionSchema = z.object({
  id: z.number().int().positive().optional(),
  questionType: z.literal("mcq"),
  questionText: richText("Question text is required"),
  // Question.marks/negativeMarks are Int columns - Prisma throws if given a float.
  marks: z.coerce.number().int().min(0),
  negativeMarks: z.coerce.number().int().min(0).default(0),
  orderIndex: z.coerce.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        optionText: richText("Option text is required"),
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
  questionText: richText("Question text is required"),
  marks: z.coerce.number().int().min(0),
  negativeMarks: z.coerce.number().int().min(0).default(0),
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
  marks: z.coerce.number().int().positive("Marks must be greater than 0"),
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
export type GradeSubjectiveAnswerInput = z.infer<typeof gradeSubjectiveAnswerSchema>;

export const allotSchema = z.object({
  // "course": allot every student registered for the quiz's course (from the
  // legacy per-batch registration tables). "custom": allot specific rolls.
  mode: z.enum(["course", "custom"]),
  studentRolls: z.array(z.string().trim().min(1)).optional(),
});
export type AllotInput = z.infer<typeof allotSchema>;
