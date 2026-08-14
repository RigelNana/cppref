# AGENTS.md

This repository extracts the local cppreference HTML corpus into typed semantic IR and deterministically validates and renders Astro MDX. Migration Agents run outside this repository.

Before any migration, the external Agent must read and follow [`MIGRATION_RULES.md`](./MIGRATION_RULES.md). It is the complete normative migration specification; this file is only its repository-level summary.

## Content invariants

- Preserve visible technical content. Never summarize, invent, or silently omit source content.
- External Agents classify and compose semantics or author candidate MDX; this repository does not embed a model provider or Agent runtime.
- Every semantic node must cover source IDs. Coverage must be complete, unique, ordered, and contiguous per composed node.
- Code text, links, revision markers, defect report identifiers, and table spans are immutable source facts.
- Return `needs_review` for ambiguity. Never guess a component boundary.

## Component boundaries

- Use normal document primitives for headings, paragraphs, lists, code blocks, and ordinary examples.
- Use domain objects for declaration docs, description lists, parameter lists, revisions, defect reports, feature-test macros, typed references, and behavior terms.
- A domain object is emitted as a complete parent/child structure. MDX slots and renderer component names are implementation details.
- Revision is a cross-cutting modifier over inline or block content.
- Do not introduce untyped layout escape hatches such as generic flex tables.

## MDX authoring rules

- Use the registered semantic components in `apps/docs/src/components/mdx/index.ts`; do not create page-local components or copy source HTML into MDX.
- Use Markdown headings, paragraphs, lists, fenced code blocks, and ordinary tables for ordinary document structure.
- Use `<DeclarationDoc>`, `<Declaration>`, and `<DeclarationDescription>` for declaration grammar and its description. When the source numbers multiple declaration variants, put each number on the matching declaration as `id="1"`, `id="2"`, and so on; never render declaration numbers as loose prose outside the component. Render the corresponding numbered descriptions as an ordinary Markdown ordered list (`1.`, `2.`), preserving their one-to-one order. Use the highlighted declaration component in `apps/docs/src/components/mdx/Declaration.astro` for function signatures with standard ranges.
- Use `<DescriptionList>` for semantic name/description pairs and `<DefectReportList>` for structured defect reports. Ordinary Markdown tables use flat row separators, never an outer frame or boxed cell grid. Do not substitute generic layout tables.
- Use `<Revision since="...">`, `until`, or `removed` when the revision modifies a block of content. Use `<InlineRevision since="...">`, `until`, or `removed` around the exact inline phrase represented by cppreference `t-rev-inl`; do not flatten its marker into parenthesized prose. Declaration-specific revisions belong on the declaration or declaration variant.
- Revision ranges use the shared rounded `RevisionMark`: sans-serif label, semantic icon, restrained color, and no border or shadow. In declaration lists, all `since` and `until` marks share one fixed width so their edges align. Never use monospace revision labels or ad hoc badges.
- Inline backticks denote code identifiers and expressions. They render as flat colored text, not chips or cards. Do not use backticks merely for emphasis.
- Fenced code blocks retain the shared rounded surface but have no border or shadow. They expand vertically and wrap long lines; never add an internal scrollbar or fixed maximum height.
- Write literal comparison operators as MDX-safe escaped characters (`\\<`, `\\<=`) in prose. Do not expose `&lt;` or other HTML entity spellings to readers. The deterministic renderer owns this escaping for generated MDX.
- Preserve every source anchor's visible text and destination. Normalize cppreference-internal relative or `.html` URLs to canonical documentation slugs during extraction; the renderer owns the `/docs/` route prefix. Preserve fragments and genuine external URLs unchanged. External Agents must not invent or rewrite link targets.
- Never use `dangerouslySetInnerHTML`, `<SourceHtml>`, or raw source HTML as accepted migrated output. Unsupported source patterns must remain review failures until modeled semantically.
- Reuse an existing component boundary before adding one. New components require a recurring C/C++ semantic role that normal Markdown and the registered components cannot express.

## Engineering

- TypeScript with explicit semicolons and double quotes.
- Zod schemas are the source of truth for external Agent outputs and renderer inputs.
- Core packages must remain Node.js-compatible. Bun-only APIs belong behind adapters.
- Keep model SDKs, provider credentials, prompt loops, retries, and orchestration outside this repository. The repository seam is file-based: Lossless Page IR/task manifest in, candidate semantic IR or MDX out.
- Run `bun run check`, `bun run typecheck`, `bun test`, `bun run build`, and the relevant CLI smoke command after changes.
- `apps/docs` is the production Astro static application. Content remains under `apps/docs/content/docs`; framework code lives under `apps/docs/src`.
