import {
  semanticPageSchema,
  type Classification,
  type LosslessPage,
  type RawBlock,
  type SemanticNode,
  type SemanticPage,
} from "@cppref/page-ir";

function documentClassification(block: RawBlock): Classification {
  return {
    kind: "document-primitives",
    sourceIds: [block.sourceId],
    confidence: 1,
    evidence: [`Source element is <${block.tagName}> and is preserved without semantic grouping.`],
    needsReview: false,
  };
}

function fallbackClassification(block: RawBlock): Classification {
  return {
    kind: "unsupported-pattern",
    sourceIds: [block.sourceId],
    confidence: 1,
    evidence: [`Source element <${block.tagName}> requires semantic classification.`],
    needsReview: true,
  };
}

function nodeForBlock(block: RawBlock): SemanticNode {
  const requiresRawHtml =
    block.tagName !== "p" ||
    block.immutable.links.length > 0 ||
    block.immutable.revisions.length > 0;
  if (!requiresRawHtml && block.immutable.code.length === 0) {
    const classification = documentClassification(block);
    return {
      sourceIds: [block.sourceId],
      sourceMap: [{ sourceId: block.sourceId, role: "paragraph" }],
      classification,
      node: {
        type: "paragraph",
        content: [{ type: "text", value: block.visibleText }],
      },
    };
  }

  if (!requiresRawHtml && block.immutable.code.length > 0) {
    const classification = documentClassification(block);
    return {
      sourceIds: [block.sourceId],
      sourceMap: [{ sourceId: block.sourceId, role: "paragraph" }],
      classification,
      node: {
        type: "paragraph",
        content: [{ type: "text", value: block.visibleText }],
      },
    };
  }

  const classification = fallbackClassification(block);
  return {
    sourceIds: [block.sourceId],
    sourceMap: [{ sourceId: block.sourceId, role: "raw-html" }],
    classification,
    node: {
      type: "raw-html",
      html: block.html,
    },
  };
}

export function createFallbackSemanticPage(page: LosslessPage): SemanticPage {
  return semanticPageSchema.parse({
    schemaVersion: 1,
    meta: page.meta,
    sections: page.sections.map((section) => ({
      sourceId: section.sourceId,
      heading: section.heading,
      headingLevel: section.headingLevel,
      ...(section.anchor ? { anchor: section.anchor } : {}),
      nodes: section.blocks.map(nodeForBlock),
    })),
  });
}
