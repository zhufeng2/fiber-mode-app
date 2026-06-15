import { useMemo } from "react";
import katex from "katex";

interface Props {
  math: string;
  block?: boolean;
}

/** Render a LaTeX string with KaTeX. Used by the Results panel for formulas. */
export default function TeX({ math, block = false }: Props) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return math;
    }
  }, [math, block]);

  return (
    <span
      className={block ? "block" : "inline-block"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
