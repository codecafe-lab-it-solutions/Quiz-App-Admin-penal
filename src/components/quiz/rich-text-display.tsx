"use client";

import { useEffect, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

// Renders saved question/option/reference-answer HTML read-only, converting
// any $...$ LaTeX segments to KaTeX markup in place. `html` is expected to
// already be sanitized server-side (see sanitizeQuestionHtml) before storage.
export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderMathInElement(ref.current, {
      delimiters: [{ left: "$", right: "$", display: false }],
      throwOnError: false,
    });
  }, [html]);

  return <div ref={ref} className={cn("text-sm [&_p]:my-1", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
