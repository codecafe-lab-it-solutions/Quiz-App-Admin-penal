import katex from "katex";

export function renderKatexSafely(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, output: "html" });
  } catch {
    return `<span class="text-destructive text-xs">Invalid equation</span>`;
  }
}
