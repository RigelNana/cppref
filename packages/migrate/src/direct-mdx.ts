import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import {
  Type,
  createModels,
  createProvider,
  envApiKeyAuth,
  type AssistantMessage,
  type Model,
} from "@earendil-works/pi-ai";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import type { LosslessPage } from "@cppref/page-ir";
import { loadAgentInstructions, type AgentOptions } from "./agent.ts";
import { componentRegistry } from "./component-registry.ts";

export type DirectMdxOptions = AgentOptions;

function readInstructionsTool(instructionsPath: string): AgentTool {
  return {
    name: "read_agent_instructions",
    label: "Read migration rules",
    description: "Read AGENTS.md and the complete MIGRATION_RULES.md specification. You must call this before migrating.",
    parameters: Type.Object({}),
    executionMode: "sequential",
    execute: async () => ({
      content: [{ type: "text", text: await loadAgentInstructions(instructionsPath) }],
      details: { paths: instructionsPath === "MIGRATION_RULES.md" ? [instructionsPath] : [instructionsPath, "MIGRATION_RULES.md"] },
    }),
  };
}

function createDirectAgent(options: DirectMdxOptions, instructionsPath: string, systemPrompt: string): Agent {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required for direct migration");

  const modelId = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const baseUrl = options.baseURL ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model: Model<"openai-responses"> = {
    id: modelId,
    name: modelId,
    api: "openai-responses",
    provider: "deepseek-responses",
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 128_000,
  };
  const provider = createProvider({
    id: "deepseek-responses",
    name: "DeepSeek Responses",
    baseUrl,
    auth: { apiKey: envApiKeyAuth("DeepSeek API key", ["DEEPSEEK_API_KEY"]) },
    models: [model],
    api: openAIResponsesApi(),
  });
  const models = createModels({
    authContext: {
      env: async (name) => name === "DEEPSEEK_API_KEY" ? apiKey : process.env[name],
      fileExists: async () => false,
    },
  });
  models.setProvider(provider);

  return new Agent({
    initialState: {
      systemPrompt,
      model,
      thinkingLevel: "off",
      tools: [readInstructionsTool(instructionsPath)],
      messages: [],
    },
    streamFn: models.streamSimple.bind(models),
    toolExecution: "sequential",
    maxRetryDelayMs: 15_000,
  });
}

function pagePayload(page: LosslessPage): string {
  return JSON.stringify({
    meta: page.meta,
    sections: page.sections
      .filter((section) => section.blocks.length > 0)
      .map((section) => ({
        heading: section.heading,
        headingLevel: section.headingLevel,
        anchor: section.anchor,
        blocks: section.blocks.map((block) => ({
          sourceId: block.sourceId,
          tagName: block.tagName,
          classes: block.classes,
          visibleText: block.visibleText,
          immutable: block.immutable,
          html: block.html,
        })),
      })),
  });
}

function assistantText(message: AssistantMessage): string {
  if (message.stopReason === "error") throw new Error(message.errorMessage ?? "Direct migration Agent failed");
  return message.content
    .filter((part): part is Extract<AssistantMessage["content"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function migratePageDirectlyToMdx(page: LosslessPage, options: DirectMdxOptions = {}): Promise<string> {
  const instructionsPath = options.instructionsPath ?? "AGENTS.md";
  const systemPrompt = [
    "You migrate one complete cppreference Lossless Page IR directly to production Fumadocs MDX in one Agent session.",
    "Your first action must be calling read_agent_instructions. Treat its result as mandatory repository rules. After reading it, migrate the complete supplied page in the next response without further tool calls.",
    "Return the complete MDX document only, starting with YAML frontmatter. Do not wrap it in a Markdown fence and do not explain it.",
    "Preserve every visible technical fact verbatim apart from Markdown delimiters and required MDX escaping. Never summarize, paraphrase, invent, or omit content.",
    "Emit each exact {/* source:SOURCE_ID */} marker immediately before that source block's representation, exactly once and in input order. Never invent markers for sections.",
    "Render every supplied section heading once at its supplied level and preserve its anchor. The page title belongs only in frontmatter; do not repeat it as an H1.",
    "Preserve every immutable code string, normalized link destination, link label, inline revision scope, block revision, and table relation. Internal Markdown destinations add /docs/; DocLink dest values do not.",
    "For numbered declaration variants, set id on each Declaration and put its since/until/removed revision on that Declaration. Never emit loose declaration numbers. Render matching numbered description blocks as a Markdown ordered list in the same order.",
    "Use registered child-based components exactly: DescriptionList > DescriptionItem > DescriptionTerm + DescriptionBody; ParameterList > Parameter name; DefectReportList > DefectReport kind id standard > PublishedBehavior + CorrectedBehavior. DocLink takes dest. Declaration takes code and language props.",
    "Use Markdown primitives and registered components only. Never emit object/array props for semantic content, raw HTML tags, SourceHtml, dangerouslySetInnerHTML, imports, scripts, styles, page-local components, or unsupported component names.",
    `Registered contracts: ${JSON.stringify(componentRegistry)}`,
  ].join("\n");
  const agent = createDirectAgent(options, instructionsPath, systemPrompt);
  await agent.prompt(pagePayload(page));
  const response = [...agent.state.messages].reverse().find((message): message is AssistantMessage => message.role === "assistant");
  if (!response) throw new Error("Direct migration Agent returned no assistant message");
  return `${assistantText(response)}\n`;
}
