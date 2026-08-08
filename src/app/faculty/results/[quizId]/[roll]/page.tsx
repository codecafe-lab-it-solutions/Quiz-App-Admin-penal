import { AnswerSheet } from "@/components/reports/answer-sheet";

export default function FacultyAnswerSheetPage({
  params,
}: {
  params: { quizId: string; roll: string };
}) {
  return (
    <AnswerSheet
      quizId={Number(params.quizId)}
      roll={decodeURIComponent(params.roll)}
      backHref="/faculty/results"
    />
  );
}
