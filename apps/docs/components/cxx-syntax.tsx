import type { ReactNode } from "react";

const tokenPattern = /(\(optional\)|attr|decl-specifier-seq|abstract-declarator|declarator|initializer)/gu;

function tokenClass(token: string): string {
  if (token === "(optional)") return "cpp-syntax-token cpp-syntax-token--optional";
  return "cpp-syntax-token cpp-syntax-token--grammar";
}

export function CxxSyntax({ code }: { code: string }) {
  const content: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of code.matchAll(tokenPattern)) {
    const index = match.index;
    if (index > cursor) content.push(code.slice(cursor, index));
    const token = match[0];
    content.push(
      <span className={tokenClass(token)} key={`${token}-${key}`}>
        {token}
      </span>,
    );
    cursor = index + token.length;
    key += 1;
  }
  if (cursor < code.length) content.push(code.slice(cursor));
  return <code className="cpp-syntax">{content}</code>;
}
