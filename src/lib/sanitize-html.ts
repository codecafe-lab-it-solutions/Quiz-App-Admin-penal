import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes rich-text HTML from the question/option/reference-answer editors
 * before it's stored. Runs server-side (via the zod schemas in
 * validators/quiz.ts) so every write path - the dialog, bulk import, a
 * future mobile client - is covered regardless of which UI produced the HTML.
 */
// Equations are stored as plain $...$ LaTeX text (see RichTextEditor /
// RichTextDisplay), never as pre-rendered markup, so the allow-list only
// needs to cover Bold/Italic/alignment - no need to special-case KaTeX's
// own (much larger) HTML/MathML/SVG output here.
export function sanitizeQuestionHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u"],
    ALLOWED_ATTR: ["style"],
  }).trim();
}

/** Strips tags for "is this rich-text field actually empty" checks (e.g. TipTap's empty doc serializes to `<p></p>`, not `""`). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes plain text (e.g. an Excel cell from bulk question import) so it's
 * safe to store/render through the same RichTextDisplay used for the rich-text
 * editor's HTML - the source has no intended formatting, so this renders as
 * literal text rather than being parsed as markup.
 */
export function escapePlainText(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
