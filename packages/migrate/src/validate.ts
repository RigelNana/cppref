import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import type { InlineNode, LosslessPage, SemanticPage } from "@cppref/page-ir";
import { renderSemanticPage } from "./render.ts";

export interface ValidationIssue {
  severity: "error" | "review";
  code:
    | "missing-source"
    | "duplicate-source"
    | "unknown-source"
    | "order-mismatch"
    | "missing-code"
    | "missing-link"
    | "missing-inline-revision"
    | "missing-revision"
    | "missing-table-span"
    | "needs-review";
  message: string;
  sourceId?: string;
}

export interface ValidationReport {
  ok: boolean;
  sourceCount: number;
  coveredCount: number;
  renderedHtml: string;
  issues: ValidationIssue[];
}

function normalize(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function inlineText(inline: InlineNode): string {
  switch (inline.type) {
    case "text":
    case "code":
      return inline.value;
    case "doc-link":
    case "behavior-term":
    case "inline-revision":
      return inline.content.map(inlineText).join("");
    case "header-ref":
      return inline.displayName ?? inline.name;
  }
}

function countByValue(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function renderedTextFromMdx(mdx: string): string {
  const fragment = parseFragment(mdx);
  const visit = (node: DefaultTreeAdapterTypes.Node): string => {
    if ("value" in node) return node.value;
    if (!("childNodes" in node)) return "";
    return node.childNodes.map(visit).join(" ");
  };
  return normalize(visit(fragment));
}

function assertOrderedCoverage(sourceIds: string[], coveredIds: string[], issues: ValidationIssue[]): void {
  const expectedCounts = countByValue(sourceIds);
  const actualCounts = countByValue(coveredIds);
  for (const sourceId of sourceIds) {
    const count = actualCounts.get(sourceId) ?? 0;
    if (count === 0) {
      issues.push({ severity: "error", code: "missing-source", sourceId, message: `Source ID ${sourceId} is not covered.` });
    } else if (count > 1) {
      issues.push({ severity: "error", code: "duplicate-source", sourceId, message: `Source ID ${sourceId} is covered ${count} times.` });
    }
  }
  for (const sourceId of coveredIds) {
    if (!expectedCounts.has(sourceId)) {
      issues.push({ severity: "error", code: "unknown-source", sourceId, message: `Unknown source ID ${sourceId} is covered.` });
    }
  }
  if (sourceIds.length !== coveredIds.length || sourceIds.some((sourceId, index) => coveredIds[index] !== sourceId)) {
    issues.push({ severity: "error", code: "order-mismatch", message: "Covered source IDs do not preserve exact source order." });
  }
}

export function validateMigration(source: LosslessPage, rendered: SemanticPage): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sourceBlocks = source.sections.flatMap((section) => section.blocks);
  const semanticNodes = rendered.sections.flatMap((section) => section.nodes);
  const sourceIds = sourceBlocks.map((block) => block.sourceId);
  const coveredIds = semanticNodes.flatMap((node) => node.sourceIds);
  assertOrderedCoverage(sourceIds, coveredIds, issues);

  const mdx = renderSemanticPage(rendered);
  const renderedText = renderedTextFromMdx(mdx);
  const mdxNormalized = normalize(mdx);

  for (const block of sourceBlocks) {
    const node = semanticNodes.find((candidate) => candidate.sourceIds.includes(block.sourceId));
    const rawHtml = node?.node.type === "raw-html" ? node.node.html : undefined;
    const rawSourcePreserved = rawHtml === block.html;
    if (rawSourcePreserved) continue;
    const searchableOutput = rawHtml ?? mdx;
    for (const code of block.immutable.code) {
      if (!searchableOutput.includes(code)) {
        issues.push({ severity: "error", code: "missing-code", sourceId: block.sourceId, message: `Immutable code from ${block.sourceId} is missing.` });
      }
    }
    for (const link of block.immutable.links) {
      const renderedDestination =
        node?.node.type === "paragraph"
          ? node.node.content.some(
              (inline) =>
                inline.type === "doc-link" &&
                `${inline.dest}${inline.section ? `#${inline.section}` : ""}` === link.normalizedHref,
            )
          : false;
      const escapedNormalizedHref = link.normalizedHref.replaceAll("&", "&amp;");
      const rawDestination = rawHtml?.includes(link.normalizedHref) || rawHtml?.includes(escapedNormalizedHref);
      if (!renderedDestination && !rawDestination) {
        issues.push({
          severity: "error",
          code: "missing-link",
          sourceId: block.sourceId,
          message: `Normalized link ${link.normalizedHref} (source ${link.href}) from ${block.sourceId} is missing.`,
        });
      }
      const linkText = normalize(link.text);
      if (linkText && !renderedText.includes(linkText) && !normalize(searchableOutput).includes(linkText)) {
        issues.push({
          severity: "error",
          code: "missing-link",
          sourceId: block.sourceId,
          message: `Link text ${JSON.stringify(link.text)} from ${block.sourceId} is missing.`,
        });
      }
    }
    for (const inlineRevision of block.immutable.inlineRevisions) {
      const sourceText = normalize(inlineRevision.text);
      const matchingRevision =
        node?.node.type === "paragraph"
          ? node.node.content.find(
              (inline) =>
                inline.type === "inline-revision" &&
                normalize(inline.content.map(inlineText).join("")) === sourceText,
            )
          : undefined;
      if (!matchingRevision && rawHtml === undefined) {
        issues.push({
          severity: "error",
          code: "missing-inline-revision",
          sourceId: block.sourceId,
          message: `Inline revision scope ${JSON.stringify(inlineRevision.text)} from ${block.sourceId} is missing or was flattened.`,
        });
      }
    }
    for (const revision of block.immutable.revisions) {
      const revisionValue = revision.replace(/^t-(?:since|until|rev)-/u, "").replace(/^cxx/u, "C++").replace(/^c/u, "C");
      if (!searchableOutput.includes(revision) && !searchableOutput.includes(revisionValue)) {
        issues.push({ severity: "error", code: "missing-revision", sourceId: block.sourceId, message: `Revision marker ${revision} from ${block.sourceId} is missing.` });
      }
    }
    for (const span of block.immutable.tableSpans) {
      const representsRowSpan = searchableOutput.includes(`rowspan="${span.rowSpan}"`) || searchableOutput.includes(`rowSpan={${span.rowSpan}}`);
      const representsColSpan = searchableOutput.includes(`colspan="${span.colSpan}"`) || searchableOutput.includes(`colSpan={${span.colSpan}}`);
      if ((span.rowSpan > 1 && !representsRowSpan) || (span.colSpan > 1 && !representsColSpan)) {
        issues.push({ severity: "error", code: "missing-table-span", sourceId: block.sourceId, message: `Table span ${span.sourceId} is not represented.` });
      }
    }
    if (block.visibleText && !renderedText.includes(normalize(block.visibleText)) && !mdxNormalized.includes(normalize(block.visibleText))) {
      issues.push({ severity: "error", code: "missing-source", sourceId: block.sourceId, message: `Visible text from ${block.sourceId} is not represented in rendered output.` });
    }
  }

  for (const node of semanticNodes) {
    if (node.classification.needsReview) {
      issues.push({
        severity: "review",
        code: "needs-review",
        sourceId: node.sourceIds[0],
        message: `${node.classification.kind} requires human review: ${node.classification.evidence.join("; ")}`,
      });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    sourceCount: sourceIds.length,
    coveredCount: new Set(coveredIds).size,
    renderedHtml: renderedText,
    issues,
  };
}
