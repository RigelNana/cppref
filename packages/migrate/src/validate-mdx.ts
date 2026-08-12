import type { LosslessPage } from "@cppref/page-ir";
import type { ValidationIssue, ValidationReport } from "./validate.ts";

const sourceMarkerPattern = /\{\/\*\s*source:([^*]+?)\s*\*\/\}/gu;
const forbiddenPattern = /<(?:SourceHtml|script|style)\b|dangerouslySetInnerHTML/gu;

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\\[<>{}]/gu, (value) => value.slice(1))
    .replace(/&(?:lt|gt|amp|quot);/gu, (entity) => ({ "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": "\"" })[entity]!)
    .replace(/<[^>]+>/gu, " ")
    .replace(/\{["']\s+["']\}/gu, " ")
    .replace(/`|\*|_|#|\[|\]|\(|\)|\|/gu, " ")
    .replace(/\s+/gu, "")
    .trim();
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
    if (block.visibleText && !compactMdx.includes(compact(block.visibleText))) {
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
