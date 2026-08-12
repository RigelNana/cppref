# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated and approved: TypeScript workspace, Bun for local migration tooling, Next.js with Fumadocs for the documentation and review application, and MDX as the rendered content format. Core migration modules remain Node.js-compatible.

## Users

C and C++ developers who need accurate, searchable reference documentation, plus maintainers reviewing automated cppreference migrations.

## Product Purpose

Migrate the local English cppreference HTML corpus to structured Markdown/MDX without changing technical content, then publish it as a modern documentation platform. Success means the content remains traceable to its source, renders correctly, and can be reviewed efficiently before publication.

## Positioning

The platform uses a lossless intermediate representation and constrained Agents to recover C/C++ documentation semantics from irregular MediaWiki HTML. Deterministic validation and source mappings make every migrated semantic object auditable instead of treating generated MDX as an opaque model response.

## Operating Context

- English source corpus: `ref/cppreference-en/reference/en`.
- Chinese source corpus follows after the English pipeline is stable.
- Cppdoc under `ref/cppdoc` provides the reference domain vocabulary and component boundaries.
- Migration runs as durable page and section jobs, with a side-by-side source/result review surface.
- Low-confidence classifications and validation failures enter a human review queue.

## Capabilities and Constraints

- Preserve visible technical content; do not summarize, invent, or silently omit it.
- Preserve source IDs, code, links, standard revisions, defect report identifiers, and table structure.
- Agent classification and semantic composition are required because HTML class combinations are not exhaustively classifiable by hand.
- Agents emit Zod-constrained semantic IR, not final MDX.
- Deterministic renderers produce MDX; deterministic Text, Code, and Structure gates validate it.
- Domain objects follow cppdoc's semantic seams: declarations, descriptions, parameters, revisions, defect reports, feature-test macros, typed references, and behavior terms.
- Ordinary headings, paragraphs, lists, and examples remain normal document primitives.
- The first supported corpus adapter is English MediaWiki 1.21.2 with GeSHi markup.

## Brand Commitments

The documentation experience should be modern, flat, highly readable, interactive, extensible, and familiar to users of contemporary programming-language documentation. It must not copy cppreference's visual presentation or cppdoc's Astro implementation.

## Evidence on Hand

- 6,640 local English HTML pages under `ref/cppreference-en/reference/en`.
- Existing cppdoc component implementations and migrated pages under `ref/cppdoc/src`.
- Slug map at `ref/cppdoc/migrate/slug_map.json`.
- Golden source candidates include `cpp/language/default_arguments.html` and `c/string/byte/memcpy.html`.
- No user testimonials, usage analytics, or production performance measurements are available; future UI must not fabricate them.

## Product Principles

1. Preserve content before improving presentation.
2. Model stable C/C++ semantics, not incidental HTML classes.
3. Keep Agent judgment constrained, traceable, and repairable.
4. Make review evidence first-class at every migration step.
5. Keep the content model independent of the rendering framework.

## Accessibility & Inclusion

The documentation and review surfaces must support keyboard navigation, visible focus states, reduced motion, responsive layouts, readable code and tables, and WCAG AA contrast.