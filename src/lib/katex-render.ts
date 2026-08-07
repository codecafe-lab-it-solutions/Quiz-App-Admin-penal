import katex from "katex";

export function renderKatexSafely(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      output: "html",
      // MathLive templates (e.g. the derivative/integral toolbar shortcuts)
      // insert `\placeholder{}` for each unfilled blank. KaTeX doesn't know
      // that command and would otherwise print it as literal red error text
      // ("\placeholder") - render it as an empty box instead, so a leftover
      // unfilled blank still looks intentional rather than broken. The
      // editor also blocks inserting while a blank remains (see
      // rich-text-editor.tsx's insertEquation), this is the fallback for
      // anything that slips through.
      macros: { "\\placeholder": "\\textcolor{#94a3b8}{\\square}" },
    });
  } catch {
    return `<span class="text-destructive text-xs">Invalid equation</span>`;
  }
}
