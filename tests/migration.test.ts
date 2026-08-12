import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { loadAgentInstructions } from "../packages/migrate/src/agent.ts";
import { extractEnglishPage, normalizeCppreferenceLink } from "../packages/migrate/src/extract.ts";
import { createFallbackSemanticPage } from "../packages/migrate/src/fallback.ts";
import { renderSemanticPage } from "../packages/migrate/src/render.ts";
import { validateMigration } from "../packages/migrate/src/validate.ts";
import { validateDirectMdx } from "../packages/migrate/src/validate-mdx.ts";

const cppSource = "ref/cppreference-en/reference/en/cpp/language/default_arguments.html";
const cSource = "ref/cppreference-en/reference/en/c/string/byte/memcpy.html";
const vectorSource = "ref/cppreference-en/reference/en/cpp/container/vector.html";
const vectorMdx = "apps/docs/content/docs/cpp/container/vector.mdx";

test("Agent calls load the repository migration rules", async () => {
  const instructions = await loadAgentInstructions();
  expect(instructions).toContain("This repository migrates the local cppreference HTML corpus");
  expect(instructions).toContain("InlineRevision");
  expect(instructions).toContain("links, revision markers");
  expect(instructions).toContain('<rules-file path="MIGRATION_RULES.md">');
  expect(instructions).toContain("页面提交检查表");
});

test("direct MDX validation enforces source coverage and rejects raw HTML escape hatches", async () => {
  const source = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
  const marked = source.sections
    .flatMap((section) => section.blocks)
    .map((block) => `{/* source:${block.sourceId} */}\n${block.visibleText}`)
    .join("\n\n");
  const report = validateDirectMdx(source, `---\ntitle: Test\n---\n\n${marked}\n<SourceHtml html={\"bad\"} />`);
  expect(report.coveredCount).toBe(source.fingerprint.sourceIds.length);
  expect(report.issues.some((issue) => issue.message.includes("forbidden raw-HTML"))).toBe(true);
});

test("the migrated vector page preserves ordered source coverage without raw HTML escape hatches", async () => {
  const source = extractEnglishPage(await readFile(vectorSource, "utf8"), { sourcePath: vectorSource });
  const mdx = await readFile(vectorMdx, "utf8");
  const report = validateDirectMdx(source, mdx);
  const structuralIssues = report.issues.filter((issue) =>
    ["duplicate-source", "unknown-source", "order-mismatch", "needs-review"].includes(issue.code),
  );

  expect(report.coveredCount).toBe(source.fingerprint.sourceIds.length);
  expect(structuralIssues).toEqual([]);
  expect(mdx).toMatch(/<Declaration\s+id="1"/u);
  expect(mdx).toContain('<Declaration id="2"');
  expect(mdx).toContain('since="C++17"');
});

describe("English cppreference extraction", () => {
  test("extracts stable ordered source IDs and immutable evidence", async () => {
    const page = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
    expect(page.meta.slug).toBe("cpp/language/default_arguments");
    expect(page.meta.language).toBe("C++");
    expect(page.fingerprint.sourceIds.length).toBeGreaterThan(30);
    expect(new Set(page.fingerprint.sourceIds).size).toBe(page.fingerprint.sourceIds.length);
    expect(page.fingerprint.codeBlocks.some((code) => code.includes("void point(int x = 3, int y = 4);"))).toBe(true);
    expect(page.fingerprint.headings).toContain("Defect reports");
  });

  test("uses the C language adapter metadata for C pages", async () => {
    const page = extractEnglishPage(await readFile(cSource, "utf8"), { sourcePath: cSource });
    expect(page.meta.slug).toBe("c/string/byte/memcpy");
    expect(page.meta.language).toBe("C");
    expect(page.fingerprint.visibleText).toContain("Copies count characters");
  });
});

describe("inline revision scope extraction", () => {
  test("captures the exact text owned by each cppreference t-rev-inl wrapper", async () => {
    const cppPage = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
    const cppRanges = cppPage.sections
      .flatMap((section) => section.blocks)
      .flatMap((block) => block.immutable.inlineRevisions);
    expect(cppRanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "and lambda-expressions,",
          marker: "(since C++11)",
          revisions: expect.arrayContaining(["t-since-cxx11"]),
        }),
        expect.objectContaining({
          text: "/move",
          marker: "(since C++11)",
          revisions: expect.arrayContaining(["t-since-cxx11"]),
        }),
      ]),
    );

    const cPage = extractEnglishPage(await readFile(cSource, "utf8"), { sourcePath: cSource });
    const cRanges = cPage.sections
      .flatMap((section) => section.blocks)
      .flatMap((block) => block.immutable.inlineRevisions);
    expect(cRanges).toContainEqual(
      expect.objectContaining({
        text: "(which is a violation of the restrict contract)",
        marker: "(since C99)",
        revisions: expect.arrayContaining(["t-since-c99"]),
      }),
    );
  });
});

describe("cppreference link normalization", () => {
  test("rewrites relative HTML links to canonical local documentation URLs", () => {
    expect(normalizeCppreferenceLink("function.html", "cpp/language/default_arguments")).toEqual({
      href: "cpp/language/function",
      kind: "internal",
    });
    expect(normalizeCppreferenceLink("../wide/wmemcpy.html#Notes", "c/string/byte/memcpy")).toEqual({
      href: "c/string/wide/wmemcpy#Notes",
      kind: "internal",
    });
  });

  test("applies mapped destination slugs before rendering local links", () => {
    const slugMap = new Map([["cpp/language/function", "cpp/language/functions/function"]]);
    expect(normalizeCppreferenceLink("function.html", "cpp/language/default_arguments", slugMap)).toEqual({
      href: "cpp/language/functions/function",
      kind: "internal",
    });
  });

  test("preserves page fragments and external URLs", () => {
    expect(normalizeCppreferenceLink("#Defect_reports", "cpp/language/default_arguments")).toEqual({
      href: "#Defect_reports",
      kind: "fragment",
    });
    expect(normalizeCppreferenceLink("http://www.gotw.ca/publications/mill18.htm", "cpp/language/default_arguments")).toEqual({
      href: "http://www.gotw.ca/publications/mill18.htm",
      kind: "external",
    });
  });

  test("stores source and normalized destinations for every extracted link", async () => {
    const page = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
    const functionLink = page.sections
      .flatMap((section) => section.blocks)
      .flatMap((block) => block.immutable.links)
      .find((link) => link.href === "function.html");
    expect(functionLink).toMatchObject({
      text: "function declaration",
      normalizedHref: "cpp/language/function",
      kind: "internal",
    });
  });
});

describe("normalized link validation", () => {
  test("rejects original relative HTML destinations after semantic migration", async () => {
    const source = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
    const block = source.sections
      .flatMap((section) => section.blocks)
      .find((candidate) => candidate.immutable.links.some((link) => link.href === "function.html"))!;
    const link = block.immutable.links.find((candidate) => candidate.href === "function.html")!;
    const semantic = createFallbackSemanticPage(source);
    const node = semantic.sections.flatMap((section) => section.nodes).find((candidate) => candidate.sourceIds.includes(block.sourceId))!;
    node.node = {
      type: "paragraph",
      content: [{ type: "doc-link", dest: link.href, content: [{ type: "text", value: link.text }] }],
    };
    node.classification = {
      kind: "document-primitives",
      sourceIds: [block.sourceId],
      confidence: 1,
      evidence: ["test paragraph"],
      needsReview: false,
    };
    node.sourceMap = [{ sourceId: block.sourceId, role: "paragraph" }];

    const report = validateMigration(source, semantic);
    expect(report.issues.some((issue) => issue.code === "missing-link" && issue.sourceId === block.sourceId)).toBe(true);
  });
});

describe("inline revision validation", () => {
  test("rejects an extracted inline revision flattened into ordinary text", async () => {
    const source = extractEnglishPage(await readFile(cSource, "utf8"), { sourcePath: cSource });
    const block = source.sections
      .flatMap((section) => section.blocks)
      .find((candidate) => candidate.immutable.inlineRevisions.length > 0)!;
    const semantic = createFallbackSemanticPage(source);
    const node = semantic.sections.flatMap((section) => section.nodes).find((candidate) => candidate.sourceIds.includes(block.sourceId))!;
    node.node = {
      type: "paragraph",
      content: [{ type: "text", value: block.visibleText }],
    };
    node.classification = {
      kind: "document-primitives",
      sourceIds: [block.sourceId],
      confidence: 1,
      evidence: ["test paragraph"],
      needsReview: false,
    };
    node.sourceMap = [{ sourceId: block.sourceId, role: "paragraph" }];

    const report = validateMigration(source, semantic);
    expect(report.issues.some((issue) => issue.code === "missing-inline-revision" && issue.sourceId === block.sourceId)).toBe(true);
  });
});

describe("deterministic rendering and coverage", () => {
  test("renders every fallback source ID exactly once", async () => {
    const source = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
    const semantic = createFallbackSemanticPage(source);
    const mdx = renderSemanticPage(semantic);
    const report = validateMigration(source, semantic);

    expect(report.sourceCount).toBe(source.fingerprint.sourceIds.length);
    expect(report.coveredCount).toBe(source.fingerprint.sourceIds.length);
    for (const sourceId of source.fingerprint.sourceIds) {
      expect(mdx).toContain(`source:${sourceId}`);
    }
  });

  test("escapes MDX syntax without emitting visible HTML entities", () => {
    const mdx = renderSemanticPage({
      schemaVersion: 1,
      meta: {
        slug: "cpp/test",
        title: "Escaping",
        language: "C++",
        locale: "en",
        sourcePath: "test.html",
        sourceUrl: "https://en.cppreference.com/w/cpp/test",
        adapter: "english-geshi",
      },
      sections: [
        {
          sourceId: "test:section",
          heading: "Escaping",
          headingLevel: 1,
          nodes: [
            {
              sourceIds: ["test:0000"],
              sourceMap: [{ sourceId: "test:0000", role: "paragraph" }],
              classification: {
                kind: "document-primitives",
                sourceIds: ["test:0000"],
                confidence: 1,
                evidence: ["paragraph"],
                needsReview: false,
              },
              node: {
                type: "paragraph",
                content: [{ type: "text", value: "a < b <= c" }],
              },
            },
          ],
        },
      ],
    });

    expect(mdx).toContain("a \\< b \\<= c");
    expect(mdx).not.toContain("&lt;");
  });

  test("rejects missing semantic coverage", async () => {
    const source = extractEnglishPage(await readFile(cSource, "utf8"), { sourcePath: cSource });
    const semantic = createFallbackSemanticPage(source);
    semantic.sections.find((section) => section.nodes.length > 0)!.nodes.shift();
    const report = validateMigration(source, semantic);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "missing-source")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "order-mismatch")).toBe(true);
  });
});
