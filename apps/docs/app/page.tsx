import Link from "next/link";
import { ArrowRight, Braces, FileCode2, Languages } from "lucide-react";

const destinations = [
  {
    title: "C++ reference",
    description: "Language rules and standard library documentation.",
    href: "/docs/cpp/language",
    icon: FileCode2,
  },
  {
    title: "C reference",
    description: "Language and library facilities for C.",
    href: "/docs/c",
    icon: Languages,
  },
] as const;

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

      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-6xl">C and C++ reference documentation</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-fd-muted-foreground">Modern documentation migrated from cppreference without changing the technical content.</p>
        <Link className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90" href="/docs">
          Open documentation
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>

      <section aria-label="Documentation areas" className="mx-auto max-w-5xl border-t border-fd-border px-6 py-10">
        <div className="grid gap-x-10 md:grid-cols-2">
          {destinations.map(({ title, description, href, icon: Icon }) => (
            <Link key={title} className="group flex gap-4 border-b border-fd-border py-6" href={href}>
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fd-primary" />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  {title}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-sm leading-6 text-fd-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
