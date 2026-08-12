import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, GitCompareArrows } from "lucide-react";

const sampleRows = [
  { source: "0000", kind: "paragraph", state: "covered" },
  { source: "0001", kind: "paragraph", state: "covered" },
  { source: "0002", kind: "declaration group", state: "review" },
  { source: "0003", kind: "paragraph", state: "covered" },
] as const;

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-fd-background text-fd-foreground">
      <header className="border-b border-fd-border">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <Link aria-label="Back to home" className="text-fd-muted-foreground hover:text-fd-foreground" href="/"><ArrowLeft className="size-4" /></Link>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><GitCompareArrows className="size-4 text-fd-primary" /> Migration review</div>
              <div className="mt-0.5 font-mono text-xs text-fd-muted-foreground">cpp/language/default_arguments</div>
            </div>
          </div>
          <Link className="rounded-sm border border-fd-border px-3 py-2 text-xs font-semibold" href="/docs/cpp/language/default-arguments">Open rendered page</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid border-fd-border lg:grid-cols-2 lg:border-r">
          <article className="border-b border-fd-border lg:border-b-0 lg:border-r">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fd-border bg-fd-background/95 px-5 py-3 backdrop-blur">
              <h1 className="text-xs font-semibold uppercase tracking-[0.14em]">Source HTML</h1>
              <span className="font-mono text-[11px] text-fd-muted-foreground">English corpus</span>
            </div>
            <div className="p-3">
              <iframe className="h-[calc(100vh-8.5rem)] min-h-[38rem] w-full border border-fd-border bg-white" src="/source/default_arguments.html" title="Original cppreference page" />
              <p className="mt-2 text-[11px] text-fd-muted-foreground">Scroll this pane independently. Section synchronization is the next review-layer milestone.</p>
            </div>
          </article>

          <article>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fd-border bg-fd-background/95 px-5 py-3 backdrop-blur">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Migrated result</h2>
              <span className="font-mono text-[11px] text-fd-muted-foreground">Fumadocs MDX</span>
            </div>
            <div className="p-3">
              <iframe className="h-[calc(100vh-8.5rem)] min-h-[38rem] w-full border border-fd-border bg-fd-background" src="/docs/cpp/language/default-arguments" title="Migrated documentation page" />
              <p className="mt-2 text-[11px] text-fd-muted-foreground">Rendered output includes its production navigation and responsive layout.</p>
            </div>
          </article>
        </div>

        <aside className="p-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Source coverage</h2>
            <span className="font-mono text-xs text-fd-primary">42 / 42 covered</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-fd-muted"><div className="h-full w-full bg-fd-primary" /></div>
          <p className="mt-3 text-sm leading-6 text-fd-muted-foreground">All source IDs are represented. Coverage is independent from semantic review status.</p>

          <div className="mt-8">
            <div className="flex items-center justify-between border-b border-fd-border pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">Review sample</h3>
              <span className="text-xs text-amber-600">1 open</span>
            </div>
            {sampleRows.map((row) => (
              <div key={row.source} className="grid grid-cols-[1.1rem_3rem_1fr] items-center gap-2 border-b border-fd-border py-3 text-sm">
                {row.state === "covered" ? <CheckCircle2 className="size-3.5 text-fd-primary" /> : <CircleAlert className="size-3.5 text-amber-600" />}
                <span className="font-mono text-xs text-fd-muted-foreground">{row.source}</span>
                <span>{row.kind}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border border-fd-border bg-fd-muted/20 p-4">
            <div className="text-sm font-semibold">Review policy</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-fd-muted-foreground">
              <li>Reject missing or duplicate source IDs.</li>
              <li>Reject changed code, links, revisions, or table spans.</li>
              <li>Manually resolve unsupported semantic patterns.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
