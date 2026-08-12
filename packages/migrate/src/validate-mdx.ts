import type { LosslessPage } from "@cppref/page-ir";
import type { ValidationIssue, ValidationReport } from "./validate.ts";

const sourceMarkerPattern = /\{\/\*\s*source:([^*]+?)\s*\*\/\}/gu;
const forbiddenPattern = /<(?:SourceHtml|script|style)\b|dangerouslySetInnerHTML/gu;

/**
 * Normalization must be context-independent: the same source text appears
 * both as a bare immutable string (e.g. `immutable.code`) and embedded in
 * MDX syntax (fenced blocks, inline code, JSX props such as
 * `<Declaration code={...}>`). Any syntax-dependent rewriting of `<`/`>`
 * would normalize those two occurrences differently, so tag-like runs are
 * left untouched and only punctuation that MDX itself inserts (backticks,
 * brackets, pipes, stars) is removed. This keeps `std::ratio<1, 30>>` and
 * `a << b` intact on both sides.
 */
function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\\[<>{}]/gu, (value) => value.slice(1))
    .replace(/&(?:lt|gt|amp|quot);/gu, (entity) => ({ "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": "\"" })[entity]!)
    .replace(/\{["']\s+["']\}/gu, " ")
    .replace(/[\u200b-\u200d\ufeff]/gu, "")
    .replace(/`|\*|_|#|\[|\]|\(|\)|\||,/gu, " ")
    .replace(/\s+/gu, "")
    .trim();
}

/**
 * Visible text must be covered by the MDX as a token multiset rather than a
 * single contiguous normalized substring: semantic components legitimately
 * re-emit facts through props (`<DefectReport kind="lwg" id={69} .../>`),
 * and inline markers (`<InlineRevision since="C++11" />`) insert syntax
 * between the source's adjacent words. Tokenizing the NFKC-normalized raw
 * text on non-alphanumeric runs treats MDX syntax characters as separators,
 * so `duration_cast(C++11)` and `` [`duration_cast`](/docs/...) ``
 * `<InlineRevision since="C++11" />` yield the same token multiset.
 * Checking every word of the visible text still catches omissions and
 * invented content.
 */
function containsTokens(container: string, required: string): boolean {
  const counts = new Map<string, number>();
  for (const token of container.normalize("NFKC").split(/[^A-Za-z0-9]+/u).filter(Boolean)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const token of required.normalize("NFKC").split(/[^A-Za-z0-9]+/u).filter(Boolean)) {
    const remaining = counts.get(token) ?? 0;
    if (remaining <= 0) return false;
    counts.set(token, remaining - 1);
  }
  return true;
}

function compact(value: string): string {
  return normalize(value);
}

function revisionValue(token: string): string {
  if (token === "t-rev-inl" || token === "t-rev-begin") return "";
  return token.replace(/^t-(?:since|until|rev)-/u, "").replace(/^cxx/u, "C++").replace(/^c/u, "C");
}

function countByValue(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function validateDirectMdx(source: LosslessPage, mdx: string): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sourceBlocks = source.sections.flatMap((section) => section.blocks);
  const sourceIds = sourceBlocks.map((block) => block.sourceId);
  const coveredIds = [...mdx.matchAll(sourceMarkerPattern)].flatMap((match) =>
    match[1]!.split(",").map((sourceId) => sourceId.trim()).filter(Boolean),
  );
  const expectedCounts = countByValue(sourceIds);
  const actualCounts = countByValue(coveredIds);

  for (const sourceId of sourceIds) {
    const count = actualCounts.get(sourceId) ?? 0;
    if (count === 0) issues.push({ severity: "error", code: "missing-source", sourceId, message: `Source ID ${sourceId} is not covered.` });
    if (count > 1) issues.push({ severity: "error", code: "duplicate-source", sourceId, message: `Source ID ${sourceId} is covered ${count} times.` });
  }
  for (const sourceId of coveredIds) {
    if (!expectedCounts.has(sourceId)) issues.push({ severity: "error", code: "unknown-source", sourceId, message: `Unknown source ID ${sourceId} is covered.` });
  }
  if (sourceIds.length !== coveredIds.length || sourceIds.some((sourceId, index) => coveredIds[index] !== sourceId)) {
    issues.push({ severity: "error", code: "order-mismatch", message: "Covered source IDs do not preserve exact source order." });
  }

  if (forbiddenPattern.test(mdx)) {
    issues.push({ severity: "error", code: "needs-review", message: "Direct MDX contains a forbidden raw-HTML escape hatch." });
  }

  const normalizedMdx = normalize(mdx);
  const compactMdx = compact(mdx);
  for (const block of sourceBlocks) {
    for (const code of block.immutable.code) {
      if (!compactMdx.includes(compact(code))) {
        issues.push({ severity: "error", code: "missing-code", sourceId: block.sourceId, message: `Immutable code from ${block.sourceId} is missing.` });
      }
    }
    for (const link of block.immutable.links) {
      const destination = link.normalizedHref;
      if (!mdx.includes(destination) && !mdx.includes(`/docs/${destination}`)) {
        issues.push({ severity: "error", code: "missing-link", sourceId: block.sourceId, message: `Normalized link ${destination} from ${block.sourceId} is missing.` });
      }
      if (link.text && !normalizedMdx.includes(normalize(link.text))) {
        issues.push({ severity: "error", code: "missing-link", sourceId: block.sourceId, message: `Link text ${JSON.stringify(link.text)} from ${block.sourceId} is missing.` });
      }
    }
    for (const inlineRevision of block.immutable.inlineRevisions) {
      if (!mdx.includes("<InlineRevision") || !normalizedMdx.includes(normalize(inlineRevision.text))) {
        issues.push({ severity: "error", code: "missing-inline-revision", sourceId: block.sourceId, message: `Inline revision scope ${JSON.stringify(inlineRevision.text)} from ${block.sourceId} is missing or flattened.` });
      }
    }
    for (const revision of block.immutable.revisions) {
      const value = revisionValue(revision);
      if (value && !mdx.includes(revision) && !mdx.includes(value)) {
        issues.push({ severity: "error", code: "missing-revision", sourceId: block.sourceId, message: `Revision marker ${revision} from ${block.sourceId} is missing.` });
      }
    }
    if (block.visibleText && !containsTokens(mdx, block.visibleText)) {
      issues.push({ severity: "error", code: "missing-source", sourceId: block.sourceId, message: `Visible text from ${block.sourceId} is not represented in MDX.` });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    sourceCount: sourceIds.length,
    coveredCount: new Set(coveredIds).size,
    renderedHtml: normalizedMdx,
    issues,
  };
}
