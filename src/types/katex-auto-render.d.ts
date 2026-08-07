declare module "katex/contrib/auto-render" {
  interface AutoRenderDelimiter {
    left: string;
    right: string;
    display: boolean;
  }

  interface AutoRenderOptions {
    delimiters?: AutoRenderDelimiter[];
    throwOnError?: boolean;
    ignoredTags?: string[];
  }

  export default function renderMathInElement(element: HTMLElement, options?: AutoRenderOptions): void;
}
