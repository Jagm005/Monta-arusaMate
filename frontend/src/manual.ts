import katex from "katex";
import { marked } from "marked";
import source from "./manual.md?raw";

/** Convierte el manual (Markdown + LaTeX) a HTML. Las formulas se renderizan con KaTeX. */
export function renderManual(): string {
  const math: string[] = [];
  const keep = (tex: string, display: boolean) => {
    math.push(katex.renderToString(tex, { displayMode: display, throwOnError: false }));
    return `@@MATH${math.length - 1}@@`;
  };
  const protectedSrc = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t: string) => keep(t, true))
    .replace(/\$([^$\n]+?)\$/g, (_, t: string) => keep(t, false));
  const html = marked.parse(protectedSrc, { async: false }) as string;
  return html.replace(/@@MATH(\d+)@@/g, (_, i: string) => math[Number(i)]);
}
