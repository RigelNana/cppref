import { highlight } from "fumadocs-core/highlight";
import { RevisionMark } from "./revision-mark";
import type { ReactNode } from "react";

export interface DeclarationVariant {
  code: string;
  standard?: string;
}

export async function Declaration({ variants, language }: { variants: DeclarationVariant[]; language: "c" | "cpp" }) {
  const rows = await Promise.all(
    variants.map(async ({ code, standard }) => ({
      code,
      standard,
      highlighted: await highlight(code, {
        lang: language,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
        components: {
          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
          code: ({ children }: { children?: ReactNode }) => <code>{children}</code>,
        },
      }),
    })),
  );

  return (
    <div className="cpp-declaration-list">
      {rows.map(({ code, standard, highlighted }) => (
        <div className="cpp-declaration-line" key={`${standard ?? "all"}-${code}`}>
          <div className="cpp-declaration-line__code">{highlighted}</div>
          {standard && <RevisionMark className="cpp-declaration-line__standard">{standard}</RevisionMark>}
        </div>
      ))}
    </div>
  );
}
