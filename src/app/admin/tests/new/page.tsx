"use client";

import { QuizCreateForm } from "@/components/quiz/quiz-create-form";

export default function NewAdminTestPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Create Quiz</h1>
      <QuizCreateForm role="admin" />
    </div>
  );
}
