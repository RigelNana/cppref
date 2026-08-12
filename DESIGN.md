---
name: cppreference modern
description: A clear, source-aware C and C++ reference aligned with Fumadocs.
colors:
  primary: "hsl(172 58% 32%)"
  paper: "hsl(42 25% 98%)"
  ink: "hsl(220 19% 15%)"
  line: "hsl(216 19% 88%)"
  muted: "hsl(215 12% 43%)"
  panel: "hsl(40 20% 96%)"
typography:
  display:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  control: "0.5rem"
  surface: "0.625rem"
spacing:
  compact: "0.75rem"
  standard: "1rem"
  section: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
---

# Design System: cppreference modern

## Overview

A modern reading interface for C and C++ reference content. Fumadocs owns the shell, navigation, controls, code blocks, spacing rhythm, and interaction language. Custom semantic components extend that language without competing with it.

## Typography

Nunito Sans is the single interface and prose family. Its rounded forms apply consistently to navigation, headings, controls, body copy, and revision labels. IBM Plex Mono is reserved for code, declarations, source IDs, paths, and compact machine metadata.

Repeated metadata roles must use identical font family, size, weight, line height, and alignment. A page-level revision and an inline declaration revision use the same shared mark.

## Layout

Documentation uses the Fumadocs three-region shell: collapsible navigation, readable content, and table of contents. Content remains linear. Semantic groupings use spacing and one-pixel rules rather than card containers.

## Shapes

Use two radii only: 8px for controls and compact interactive elements; 10px for surfaced content such as code and source fallbacks. Pills are limited to genuine status tokens. Do not mix square, near-square, and highly rounded controls on the same page.

## Components

- Declarations use a code column with an adjacent shared revision mark.
- Revision ranges use a rounded, tinted `RevisionMark` with a semantic icon and sans-serif label; the mark and its optional rounded content wash have no border or shadow. Declaration-row marks have equal width regardless of `since` or `until`.
- Inline revision phrases use the same color and typography as `RevisionMark`, but a compact icon-free capsule placed immediately after the affected phrase.
- Description, parameter, defect, and ordinary table rows use the same flat one-pixel separators; tables have no outer frame or boxed cell grid.
- Inline code and declaration grammar are flat accent text, never chips.
- Fenced code blocks keep the shared 10px radius but have no border or shadow; their content expands vertically and wraps instead of scrolling internally.
- Lucide icons may reinforce familiar actions, destinations, and semantic status, but never decorate every heading.

## Navigation

Folders without a unique overview page use Fumadocs folder triggers, not links to the same `/docs` route. Only the exact leaf page is active. The current branch opens automatically; other branches remain independently collapsible.

## Content fidelity

Migrated documentation must preserve the original visible technical content. Do not summarize, paraphrase, add explanatory prose, or present a shortened sample as migrated output. Layout and semantic markup may change; technical wording, code, link text, revisions, and ordering may not. Cppreference-internal destinations resolve to canonical `/docs/...` routes without `.html`; fragments and external destinations remain intact.

## Do

- Keep prose within a readable measure.
- Use Fumadocs primitives before creating custom chrome.
- Use thin rules and whitespace for hierarchy.
- Keep keyboard focus visible and honor reduced motion.

## Do not

- Do not place ordinary sections in cards.
- Do not repeat descriptions below the page title.
- Do not use migration implementation details as homepage marketing copy.
- Do not let multiple sidebar folders share the active URL.
- Do not use icons as decoration without a navigational or semantic purpose.
