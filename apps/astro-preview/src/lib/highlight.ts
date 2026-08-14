import { createHighlighter } from "shiki";

const highlighter = createHighlighter({
  langs: ["c", "cpp"],
  themes: ["github-light", "github-dark"],
});

export async function highlightCode(code: string, language: "c" | "cpp"): Promise<string> {
  return (await highlighter).codeToHtml(code, {
    defaultColor: false,
    lang: language,
    themes: {
      dark: "github-dark",
      light: "github-light",
    },
  });
}
