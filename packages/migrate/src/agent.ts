import { readFile } from "node:fs/promises";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  classificationSchema,
  semanticPageSchema,
  semanticSectionSchema,
  type Classification,
  type LosslessPage,
  type LosslessSection,
  type SemanticPage,
  type SemanticSection,
} from "@cppref/page-ir";
import { componentRegistry } from "./component-registry.ts";
import { createFallbackSemanticPage } from "./fallback.ts";

export interface AgentOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  instructionsPath?: string;
}

const classificationBatchSchema = z.object({
  classifications: z.array(classificationSchema),
});

export async function loadAgentInstructions(instructionsPath = "AGENTS.md"): Promise<string> {
  const paths = instructionsPath === "MIGRATION_RULES.md"
    ? [instructionsPath]
    : [instructionsPath, "MIGRATION_RULES.md"];
  const documents = await Promise.all(paths.map(async (filePath) => {
    const content = await readFile(filePath, "utf8");
    if (content.trim().length === 0) {
      throw new Error(`Agent instructions at ${filePath} are empty`);
    }
    return `<rules-file path=${JSON.stringify(filePath)}>\n${content}\n</rules-file>`;
  }));
  return documents.join("\n\n");
}

const agentSemanticSectionSchema = z.object({
  nodes: z.array(z.unknown()),
});

export function createMigrationModel(options: AgentOptions) {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required for Agent classification and migration");
  const provider = createOpenAI({
    apiKey,
    baseURL: options.baseURL ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    name: "deepseek",
  });
  return provider.responses(options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash");
}

export const migrationProviderOptions = {};

function sectionPayload(section: LosslessSection): string {
  return JSON.stringify({
    heading: section.heading,
    headingLevel: section.headingLevel,
    blocks: section.blocks.map((block) => ({
      sourceId: block.sourceId,
      tagName: block.tagName,
      classes: block.classes,
      headingContext: block.headingContext,
      visibleText: block.visibleText,
      immutable: block.immutable,
      html: block.html,
    })),
  });
}

function assertExactCoverage(section: LosslessSection, classifications: Classification[]): void {
  const expected = section.blocks.map((block) => block.sourceId);
  const actual = classifications.flatMap((classification) => classification.sourceIds);
  if (expected.length !== actual.length || expected.some((sourceId, index) => actual[index] !== sourceId)) {
    throw new Error(
      `Agent classification coverage mismatch for section ${section.heading}: expected ${expected.join(", ")}, received ${actual.join(", ")}`,
    );
  }
  if (new Set(actual).size !== actual.length) {
    throw new Error(`Agent classification returned duplicate source IDs for section ${section.heading}`);
  }
}

export async function classifySection(
  section: LosslessSection,
  options: AgentOptions = {},
): Promise<Classification[]> {
  if (section.blocks.length === 0) return [];
  const repositoryInstructions = await loadAgentInstructions(options.instructionsPath);
  const result = await generateText({
    model: createMigrationModel(options),
    output: Output.object({
      schema: classificationBatchSchema,
      name: "cppreference_classification_batch",
      description: "An ordered, exhaustive semantic classification of one cppreference section.",
    }),
    providerOptions: migrationProviderOptions,
    maxRetries: 2,
    instructions: [
      "Repository migration rules follow. They are mandatory:\n<repository-rules>\n" + repositoryInstructions + "\n</repository-rules>",
      "You classify cppreference HTML blocks into registered semantic component kinds.",
      "Return source IDs once each, in source order, with no omissions or duplicates.",
      "Group adjacent blocks only when one semantic object requires all of them.",
      "Use unsupported-pattern and needsReview=true when evidence is ambiguous.",
      "Do not rewrite content and do not emit MDX.",
      `Registry: ${JSON.stringify(componentRegistry)}`,
    ].join("\n"),
    prompt: sectionPayload(section),
  });
  const classifications = classificationBatchSchema.parse(result.output).classifications;
  assertExactCoverage(section, classifications);
  return classifications;
}

export async function migrateSection(
  section: LosslessSection,
  classifications: Classification[],
  options: AgentOptions = {},
): Promise<SemanticSection> {
  assertExactCoverage(section, classifications);
  const repositoryInstructions = await loadAgentInstructions(options.instructionsPath);
  const result = await generateText({
    model: createMigrationModel(options),
    output: Output.object({
      schema: agentSemanticSectionSchema,
      description: "A source-mapped semantic Page IR section; never MDX.",
    }),
    temperature: 0,
    providerOptions: migrationProviderOptions,
    instructions: [
      "Repository migration rules follow. They are mandatory:\n<repository-rules>\n" + repositoryInstructions + "\n</repository-rules>",
      "Transform classified cppreference blocks into semantic Page IR.",
      "Return only the nodes array. The application copies section identity and validates the complete Page IR.",
      "Return one output node for each classification, in classification order. Its sourceIds and sourceMap must contain all and only that classification's source IDs, with no overlap between nodes.",
      "Inside declaration-doc descriptions, description-list items, parameter items, revisions, and defect-report fields, emit only paragraph, code-block, or raw-html content blocks. Represent phrase-level revision scopes as inline-revision nodes inside a paragraph; never nest a revision block there.",
      "Omit absent optional properties. Never emit null.",
      "Preserve link text exactly and use each source link's normalizedHref as the output destination; never emit source-relative .html URLs. Convert every immutable.inlineRevisions entry into one inline-revision node whose content is exactly the recorded text and whose revision comes only from the recorded tokens.",
      "Use raw-html only for unsupported-pattern; set needsReview=true there. Never emit MDX, JSX, Markdown, imports, or component names.",
    ].join("\n"),
    prompt: JSON.stringify({ source: JSON.parse(sectionPayload(section)), classifications }),
  });
  const agentSection = agentSemanticSectionSchema.parse(result.output);
  const migrated = semanticSectionSchema.parse({
    sourceId: section.sourceId,
    heading: section.heading,
    headingLevel: section.headingLevel,
    ...(section.anchor ? { anchor: section.anchor } : {}),
    nodes: agentSection.nodes,
  });
  const semanticCoverage = migrated.nodes.flatMap((node) => node.sourceIds);
  const expected = section.blocks.map((block) => block.sourceId);
  if (expected.length !== semanticCoverage.length || expected.some((id, index) => semanticCoverage[index] !== id)) {
    throw new Error(`Agent migration coverage mismatch for section ${section.heading}`);
  }
  return migrated;
}

export async function migratePageWithAgent(
  page: LosslessPage,
  options: AgentOptions = {},
): Promise<SemanticPage> {
  const sections: SemanticSection[] = [];
  for (const section of page.sections) {
    if (section.blocks.length === 0) {
      sections.push({
        sourceId: section.sourceId,
        heading: section.heading,
        headingLevel: section.headingLevel,
        ...(section.anchor ? { anchor: section.anchor } : {}),
        nodes: [],
      });
      continue;
    }
    const classifications = await classifySection(section, options);
    try {
      sections.push(await migrateSection(section, classifications, options));
    } catch (error) {
      console.warn(
        `Agent semantic migration failed for ${page.meta.slug} / ${section.heading}; preserving the section as deterministic fallback.`,
        error,
      );
      const fallback = createFallbackSemanticPage({
        ...page,
        sections: [section],
        fingerprint: {
          headings: [section.heading],
          codeBlocks: section.blocks.flatMap((block) => block.immutable.code),
          linkTargets: section.blocks.flatMap((block) => block.immutable.links.map((link) => link.normalizedHref)),
          visibleText: section.blocks.map((block) => block.visibleText).join(" "),
          sourceIds: section.blocks.map((block) => block.sourceId),
        },
      });
      sections.push(fallback.sections[0]!);
    }
  }
  return semanticPageSchema.parse({ schemaVersion: 1, meta: page.meta, sections });
}
