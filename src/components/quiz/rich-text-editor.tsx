"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import katex from "katex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Sigma,
  Code2,
} from "lucide-react";

function renderKatexSafely(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, output: "html" });
  } catch {
    return `<span class="text-destructive text-xs">Invalid equation</span>`;
  }
}

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  active,
  disabled,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
        active && "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Rich text editor for question/option/reference-answer fields - Bold/Italic,
// alignment, LaTeX equation insertion (rendered with KaTeX), and a raw-HTML
// source view, matching the legacy panel's question editor.
export function RichTextEditor({ value, onChange, placeholder, minHeight = "110px" }: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value);
  const [equationOpen, setEquationOpen] = useState(false);
  const [equationLatex, setEquationLatex] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "max-w-none text-sm leading-relaxed focus:outline-none [&_p]:my-1 [&_strong]:font-semibold [&_em]:italic",
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="rounded-md border bg-muted/20" style={{ minHeight }} />;
  }

  const insertEquation = () => {
    if (!equationLatex.trim()) return;
    // Stored as plain-text $...$ delimiters (not pre-rendered markup) so the
    // sanitizer only ever has to allow plain text - RichTextDisplay renders
    // it with KaTeX's auto-render wherever the question is shown.
    editor.chain().focus().insertContent(`$${equationLatex}$ `).run();
    setEquationLatex("");
    setEquationOpen(false);
  };

  const toggleSource = () => {
    if (sourceMode) {
      editor.commands.setContent(sourceHtml || "");
      onChange(sourceHtml);
    } else {
      setSourceHtml(editor.getHTML());
    }
    setSourceMode((v) => !v);
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo2} label="Undo" disabled={sourceMode} />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo2} label="Redo" disabled={sourceMode} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={Bold}
          label="Bold"
          active={editor.isActive("bold")}
          disabled={sourceMode}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={Italic}
          label="Italic"
          active={editor.isActive("italic")}
          disabled={sourceMode}
        />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          icon={AlignLeft}
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          disabled={sourceMode}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          icon={AlignCenter}
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          disabled={sourceMode}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          icon={AlignRight}
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          disabled={sourceMode}
        />
        <div className="mx-1 h-5 w-px bg-border" />
        <Popover open={equationOpen} onOpenChange={setEquationOpen}>
          <PopoverTrigger asChild>
            <span>
              <ToolbarButton onClick={() => setEquationOpen(true)} icon={Sigma} label="Equation" disabled={sourceMode} />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Insert equation (LaTeX)</p>
            <Input
              autoFocus
              value={equationLatex}
              onChange={(e) => setEquationLatex(e.target.value)}
              placeholder={String.raw`e.g. x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertEquation();
                }
              }}
            />
            {equationLatex.trim() && (
              <div
                className="overflow-x-auto rounded border bg-muted/30 p-2"
                dangerouslySetInnerHTML={{ __html: renderKatexSafely(equationLatex) }}
              />
            )}
            <Button type="button" size="sm" onClick={insertEquation}>
              Insert
            </Button>
          </PopoverContent>
        </Popover>
        <div className="ml-auto">
          <ToolbarButton onClick={toggleSource} icon={Code2} label="HTML source" active={sourceMode} />
        </div>
      </div>

      {sourceMode ? (
        <textarea
          className="w-full resize-y bg-background p-3 font-mono text-xs focus:outline-none"
          style={{ minHeight }}
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
        />
      ) : (
        <div className="cursor-text p-3" style={{ minHeight }} onClick={() => editor.commands.focus()}>
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
