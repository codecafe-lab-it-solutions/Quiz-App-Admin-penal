import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { buildWorkbookBuffer, excelResponseHeaders } from "@/lib/excel";

// Downloadable .xlsx template for the bulk question import flow. `Type` is
// OBJECTIVE or SUBJECTIVE - for SUBJECTIVE rows, Option A-D and Answer may be
// left blank (see /api/faculty/quiz/:id/questions/import for the row rules).
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const buffer = buildWorkbookBuffer(
      [
        { key: "Type", label: "Type" },
        { key: "Question", label: "Question" },
        { key: "OptionA", label: "OptionA" },
        { key: "OptionB", label: "OptionB" },
        { key: "OptionC", label: "OptionC" },
        { key: "OptionD", label: "OptionD" },
        { key: "Answer", label: "Answer" },
        { key: "ReferenceAnswer", label: "ReferenceAnswer" },
        { key: "Marks", label: "Marks" },
        { key: "NegativeMarks", label: "NegativeMarks" },
      ],
      [
        {
          Type: "OBJECTIVE",
          Question: "2 + 2 = ?",
          OptionA: "3",
          OptionB: "4",
          OptionC: "5",
          OptionD: "6",
          Answer: "B",
          ReferenceAnswer: "",
          Marks: 1,
          NegativeMarks: 0,
        },
        {
          Type: "SUBJECTIVE",
          Question: "Explain Newton's second law of motion.",
          OptionA: "",
          OptionB: "",
          OptionC: "",
          OptionD: "",
          Answer: "",
          ReferenceAnswer: "Force equals mass times acceleration (F = ma); a grading guide, may be left blank.",
          Marks: 5,
          NegativeMarks: "",
        },
      ],
      "Questions"
    );

    return new Response(new Uint8Array(buffer), { headers: excelResponseHeaders("question-import-template.xlsx") });
  } catch (error) {
    return handleApiError(error);
  }
}
