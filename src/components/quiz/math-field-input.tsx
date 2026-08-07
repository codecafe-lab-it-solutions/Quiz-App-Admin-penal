"use client";

import { useEffect, useRef } from "react";
import type { MathfieldElement as MathfieldElementType } from "mathlive";

interface MathFieldInputProps {
  value: string;
  onChange: (latex: string) => void;
  className?: string;
}

// Full WYSIWYG math input (MathLive) with its own built-in on-screen keyboard
// covering Greek letters, calculus (∫ ∂ ∑ √ lim), fractions, sub/superscripts,
// etc. - click the keyboard icon inside the field, or type naturally (e.g.
// "int", "alpha", "sqrt" auto-expand). Client-only: this module touches
// `customElements`/`document` at import time, so it must never load during SSR
// (see the next/dynamic(..., { ssr: false }) wrapper where this is used).
export function MathFieldInput({ value, onChange, className }: MathFieldInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldElementType | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("mathlive").then(({ MathfieldElement }) => {
      if (cancelled || !containerRef.current || mfRef.current) return;

      // Fonts are bundler-invisible runtime fetches (not a CSS `url()` webpack
      // can rewrite) - served from /public/mathlive-fonts instead of mathlive's
      // default (a relative "./fonts" that doesn't resolve under a bundler, or
      // the CDN). Sounds are disabled outright since we never copied those.
      MathfieldElement.fontsDirectory = "/mathlive-fonts";
      MathfieldElement.soundsDirectory = null;

      const mf = new MathfieldElement();
      mf.value = value;
      mf.style.width = "100%";
      mf.style.minHeight = "48px";
      mf.style.padding = "8px 12px";
      mf.style.borderRadius = "6px";
      mf.style.border = "1px solid hsl(var(--input))";
      mf.style.fontSize = "1.1rem";
      mf.smartFence = true;
      mf.smartSuperscript = true;
      mf.addEventListener("input", () => onChange(mf.value));

      containerRef.current.appendChild(mf);
      mfRef.current = mf;
    });

    return () => {
      cancelled = true;
      mfRef.current?.remove();
      mfRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mfRef.current && mfRef.current.value !== value) {
      mfRef.current.value = value;
    }
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
