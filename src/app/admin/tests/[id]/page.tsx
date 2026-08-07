"use client";

import { useParams } from "next/navigation";
import { QuizManagement } from "@/components/quiz/quiz-management";

export default function AdminTestDetailPage() {
  const params = useParams<{ id: string }>();
  return <QuizManagement quizId={Number(params.id)} role="admin" />;
}
