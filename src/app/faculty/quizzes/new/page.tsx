"use client";

import { QuizCreateForm } from "@/components/quiz/quiz-create-form";

export default function NewFacultyQuizPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Create Quiz</h1>
      <QuizCreateForm role="faculty" />
    </div>
  );
}
