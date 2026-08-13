import Link from "next/link";
import { ArrowRight, Braces } from "lucide-react";

type LinkItem = readonly [label: string, href: string];
type TableCell = { title: string; links: readonly LinkItem[] };

const cppLanguage: TableCell = {
  title: "Language",
  links: [
    ["Preprocessor", "/docs/cpp/language/preprocessor"],
    ["Keywords", "/docs/cpp/language/keywords"],
    ["ASCII chart", "/docs/cpp/language/ascii"],
    ["Basic concepts", "/docs/cpp/language/basic_concepts"],
    ["Comments", "/docs/cpp/language/basic_concepts/comments"],
    ["Names", "/docs/cpp/language/basic_concepts/name"],
    ["Types", "/docs/cpp/language/basic_concepts/types"],
    ["The main function", "/docs/cpp/language/basic_concepts/main_function"],
    ["Expressions", "/docs/cpp/language/expressions"],
    ["Statements", "/docs/cpp/language/statements"],
    ["Declarations", "/docs/cpp/language/declarations"],
    ["Classes", "/docs/cpp/language/classes"],
    ["Templates", "/docs/cpp/language/templates"],
    ["Exceptions", "/docs/cpp/language/exceptions"],
    ["Initialization", "/docs/cpp/language/initialization"],
    ["Functions", "/docs/cpp/language/functions"],
    ["History", "/docs/cpp/language/history"],
  ],
};

const cppLibrary: TableCell = {
  title: "Standard library",
  links: [
    ["Chrono library", "/docs/cpp/library/chrono"],
    ["`duration`", "/docs/cpp/library/chrono/duration"],
    ["`time_point`", "/docs/cpp/library/chrono/time_point"],
    ["`year_month_day`", "/docs/cpp/library/chrono/year_month_day"],
    ["`zoned_time`", "/docs/cpp/library/chrono/zoned_time"],
    ["`<chrono>` header", "/docs/cpp/library/headers/chrono"],
  ],
};

const cppMore: TableCell = {
  title: "Other",
  links: [
    ["Acronyms", "/docs/cpp/language/acronyms"],
    ["Extending std", "/docs/cpp/language/extending_std"],
    ["RAII", "/docs/cpp/language/raii"],
    ["Pimpl", "/docs/cpp/language/pimpl"],
    ["Rule of three", "/docs/cpp/language/rule_of_three"],
    ["Zero-overhead principle", "/docs/cpp/language/Zero-overhead_principle"],
    ["Template metaprogramming", "/docs/cpp/language/template_metaprogramming"],
  ],
};

const cLanguage: TableCell = {
  title: "Language",
  links: [["C reference", "/docs/c"]],
};

const cString: TableCell = {
  title: "String library",
  links: [["memcpy", "/docs/c/string/byte/memcpy"]],
};

const cppStandards = [
  ["C++11", "/docs/cpp/language/11"],
  ["C++14", "/docs/cpp/language/14"],
  ["C++17", "/docs/cpp/language/17"],
  ["C++20", "/docs/cpp/language/20"],
  ["C++23", "/docs/cpp/language/23"],
  ["C++26", "/docs/cpp/language/26"],
] as const;

function ReferenceTable({
  title,
  standards,
  cells,
}: {
  title: string;
  standards?: readonly (readonly [string, string])[];
  cells: readonly TableCell[];
}) {
  return (
    <section aria-label={title}>
      <div className="border border-fd-border">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-fd-border px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          {standards ? (
            <p className="text-sm text-fd-muted-foreground">
              {standards.map(([standard, href], index) => (
                <span key={standard}>
                  {index > 0 && <span aria-hidden="true">, </span>}
                  <Link className="transition-colors hover:text-fd-primary" href={href}>
                    {standard}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="grid md:grid-cols-3">
          {cells.map((cell, index) => (
            <div
              key={cell.title}
              className={`px-6 py-5 ${index > 0 ? "border-t border-fd-border md:border-l md:border-t-0" : ""}`}
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-fd-muted-foreground">{cell.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-6">
                {cell.links.map(([label, href]) => (
                  <li key={href}>
                    <Link className="text-fd-foreground transition-colors hover:text-fd-primary" href={href}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-fd-border px-6 py-4">
        <Link className="flex items-center gap-2 font-semibold tracking-tight" href="/">
          <Braces aria-hidden="true" className="size-4 text-fd-primary" />
          <span>cppreference</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link className="text-fd-muted-foreground transition-colors hover:text-fd-foreground" href="/docs">Documentation</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">C and C++ reference documentation</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-fd-muted-foreground">Modern documentation migrated from cppreference without changing the technical content.</p>
        <Link className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90" href="/docs">
          Open documentation
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>

      <section aria-label="Reference" className="mx-auto max-w-5xl space-y-10 px-6 pb-16">
        <ReferenceTable title="C++ reference" standards={cppStandards} cells={[cppLanguage, cppLibrary, cppMore]} />
        <ReferenceTable title="C reference" cells={[cLanguage, cString]} />
      </section>
    </main>
  );
}
