import { Node, mergeAttributes } from "@tiptap/core";
import { renderKatexSafely } from "@/lib/katex-render";

export interface MathInlineOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      insertMath: (latex: string) => ReturnType;
    };
  }
}

/**
 * Atomic inline equation node. Stored/serialized as a compact, sanitizer-safe
 * `<span data-type="math-inline" data-latex="...">` (no rendered markup in
 * the saved HTML - see sanitizeQuestionHtml) - the NodeView below renders it
 * with KaTeX for display ONLY inside the live editor. RichTextDisplay does
 * the equivalent render pass for read-only views (question list, grading).
 */
export const MathInline = Node.create<MathInlineOptions>({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") ?? "",
        renderHTML: (attributes) => ({ "data-latex": attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-type": "math-inline" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.setAttribute("data-type", "math-inline");
      dom.setAttribute("data-latex", node.attrs.latex);
      dom.setAttribute("contenteditable", "false");
      dom.className = "mx-0.5 inline-block align-middle";
      dom.innerHTML = renderKatexSafely(node.attrs.latex || "\\ ");
      return { dom };
    };
  },

  addCommands() {
    return {
      insertMath:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
    };
  },
});
