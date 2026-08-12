import { z } from "zod";

export const cxxRevisionSchema = z.enum([
  "C89",
  "C95",
  "C99",
  "C11",
  "C17",
  "C23",
  "C29",
  "C++98",
  "C++11",
  "C++14",
  "C++17",
  "C++20",
  "C++23",
  "C++26",
  "C++29",
]);

export const revisionInfoSchema = z.object({
  since: cxxRevisionSchema.optional(),
  until: cxxRevisionSchema.optional(),
  removed: cxxRevisionSchema.optional(),
  traits: z
    .array(
      z.object({
        trait: z.string().min(1),
        since: cxxRevisionSchema,
      }),
    )
    .optional(),
});

export const sourceRangeSchema = z.object({
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  startLine: z.number().int().positive().optional(),
  startColumn: z.number().int().nonnegative().optional(),
  endLine: z.number().int().positive().optional(),
  endColumn: z.number().int().nonnegative().optional(),
});

export const sourceLinkSchema = z.object({
  text: z.string(),
  href: z.string(),
  normalizedHref: z.string().min(1),
  kind: z.enum(["internal", "fragment", "external"]),
  title: z.string().optional(),
});

export const sourceInlineRevisionSchema = z.object({
  text: z.string().min(1),
  html: z.string().min(1),
  marker: z.string().min(1),
  revisions: z.array(z.string().min(1)).min(1),
});


export const tableSpanSchema = z.object({
  sourceId: z.string().min(1),
  rowSpan: z.number().int().positive(),
  colSpan: z.number().int().positive(),
});

export const immutableFieldsSchema = z.object({
  code: z.array(z.string()),
  links: z.array(sourceLinkSchema),
  inlineRevisions: z.array(sourceInlineRevisionSchema),
  revisions: z.array(z.string()),
  tableSpans: z.array(tableSpanSchema),
});

export const rawBlockSchema = z.object({
  sourceId: z.string().min(1),
  order: z.number().int().nonnegative(),
  tagName: z.string().min(1),
  domPath: z.string().min(1),
  html: z.string(),
  visibleText: z.string(),
  classes: z.array(z.string()),
  attributes: z.record(z.string(), z.string()),
  headingContext: z.array(z.string()),
  previousSourceId: z.string().optional(),
  nextSourceId: z.string().optional(),
  sourceRange: sourceRangeSchema.optional(),
  immutable: immutableFieldsSchema,
});

export const pageMetaSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  language: z.enum(["C", "C++"]),
  locale: z.literal("en"),
  sourcePath: z.string().min(1),
  sourceUrl: z.string().url(),
  adapter: z.literal("english-geshi"),
});

export const losslessSectionSchema = z.object({
  sourceId: z.string().min(1),
  heading: z.string(),
  headingLevel: z.number().int().min(1).max(6),
  anchor: z.string().optional(),
  blocks: z.array(rawBlockSchema),
});

export const sourceFingerprintSchema = z.object({
  headings: z.array(z.string()),
  codeBlocks: z.array(z.string()),
  linkTargets: z.array(z.string()),
  visibleText: z.string(),
  sourceIds: z.array(z.string()),
});

export const losslessPageSchema = z.object({
  schemaVersion: z.literal(1),
  meta: pageMetaSchema,
  sections: z.array(losslessSectionSchema),
  fingerprint: sourceFingerprintSchema,
});

export const classificationKindSchema = z.enum([
  "document-primitives",
  "declaration-doc",
  "description-list",
  "parameter-list",
  "revision",
  "defect-report-list",
  "feature-test-macro",
  "unsupported-pattern",
]);

export const classificationSchema = z.object({
  kind: classificationKindSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().min(1)),
  needsReview: z.boolean(),
});

export const textInlineSchema = z.object({
  type: z.literal("text"),
  value: z.string(),
});

export const codeInlineSchema = z.object({
  type: z.literal("code"),
  value: z.string(),
});

export const docLinkInlineSchema = z.object({
  type: z.literal("doc-link"),
  dest: z.string().min(1),
  section: z.string().optional(),
  content: z.array(z.union([textInlineSchema, codeInlineSchema])),
});

export const headerRefInlineSchema = z.object({
  type: z.literal("header-ref"),
  language: z.enum(["C", "C++"]),
  name: z.string().min(1),
  displayName: z.string().optional(),
});

export const behaviorTermInlineSchema = z.object({
  type: z.literal("behavior-term"),
  kind: z.enum([
    "well-defined",
    "implementation-defined",
    "unspecified",
    "undefined",
    "ill-formed",
    "ill-formed-no-diagnostic-required",
  ]),
  content: z.array(z.union([textInlineSchema, codeInlineSchema])),
});

export const inlineRevisionSchema = z.object({
  type: z.literal("inline-revision"),
  revision: revisionInfoSchema,
  content: z.array(
    z.union([
      textInlineSchema,
      codeInlineSchema,
      docLinkInlineSchema,
      headerRefInlineSchema,
      behaviorTermInlineSchema,
    ]),
  ),
});


export const inlineNodeSchema = z.discriminatedUnion("type", [
  textInlineSchema,
  codeInlineSchema,
  docLinkInlineSchema,
  headerRefInlineSchema,
  behaviorTermInlineSchema,
  inlineRevisionSchema,
]);

export type InlineNode = z.infer<typeof inlineNodeSchema>;

const paragraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineNodeSchema),
});

const codeBlockSchema = z.object({
  type: z.literal("code-block"),
  language: z.enum(["c", "cpp", "text"]),
  code: z.string(),
});

const rawHtmlBlockSchema = z.object({
  type: z.literal("raw-html"),
  html: z.string(),
});

const contentBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  codeBlockSchema,
  rawHtmlBlockSchema,
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

const declarationVariantSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  language: z.enum(["c", "cpp"]),
  revision: revisionInfoSchema.optional(),
});

const declarationDocSchema = z.object({
  type: z.literal("declaration-doc"),
  id: z.number().int().positive().optional(),
  declarations: z.array(declarationVariantSchema).min(1),
  description: z.array(contentBlockSchema),
  revision: revisionInfoSchema.optional(),
});

const descriptionItemSchema = z.object({
  terms: z.array(inlineNodeSchema).min(1),
  description: z.array(contentBlockSchema),
  kind: z.string().optional(),
  revision: revisionInfoSchema.optional(),
});

const descriptionListSchema = z.object({
  type: z.literal("description-list"),
  items: z.array(descriptionItemSchema).min(1),
});

const parameterListSchema = z.object({
  type: z.literal("parameter-list"),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.array(contentBlockSchema),
      }),
    )
    .min(1),
});

const revisionBlockSchema = z.object({
  type: z.literal("revision"),
  revision: revisionInfoSchema,
  content: z.array(contentBlockSchema).min(1),
});

const defectReportListSchema = z.object({
  type: z.literal("defect-report-list"),
  reports: z
    .array(
      z.object({
        kind: z.enum(["cwg", "lwg"]),
        id: z.number().int().positive(),
        standard: cxxRevisionSchema,
        publishedBehavior: z.array(contentBlockSchema),
        correctedBehavior: z.array(contentBlockSchema),
      }),
    )
    .min(1),
});

const semanticNodeValueSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  codeBlockSchema,
  rawHtmlBlockSchema,
  declarationDocSchema,
  descriptionListSchema,
  parameterListSchema,
  revisionBlockSchema,
  defectReportListSchema,
]);

export const semanticNodeSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceMap: z.array(
    z.object({
      sourceId: z.string().min(1),
      role: z.string().min(1),
    }),
  ),
  classification: classificationSchema,
  node: semanticNodeValueSchema,
});

export const semanticSectionSchema = z.object({
  sourceId: z.string().min(1),
  heading: z.string(),
  headingLevel: z.number().int().min(1).max(6),
  anchor: z.string().optional(),
  nodes: z.array(semanticNodeSchema),
});

export const semanticPageSchema = z.object({
  schemaVersion: z.literal(1),
  meta: pageMetaSchema,
  sections: z.array(semanticSectionSchema),
});

export type CxxRevision = z.infer<typeof cxxRevisionSchema>;
export type RevisionInfo = z.infer<typeof revisionInfoSchema>;
export type RawBlock = z.infer<typeof rawBlockSchema>;
export type LosslessSection = z.infer<typeof losslessSectionSchema>;
export type LosslessPage = z.infer<typeof losslessPageSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type SemanticNode = z.infer<typeof semanticNodeSchema>;
export type SemanticSection = z.infer<typeof semanticSectionSchema>;
export type SemanticPage = z.infer<typeof semanticPageSchema>;
