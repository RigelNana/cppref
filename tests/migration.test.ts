import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { extractEnglishPage, normalizeCppreferenceLink } from "../packages/migrate/src/extract.ts";
import { createExternalMigrationTask } from "../packages/migrate/src/external-task.ts";
import { createFallbackSemanticPage } from "../packages/migrate/src/fallback.ts";
import { renderSemanticPage } from "../packages/migrate/src/render.ts";
import { validateMigration } from "../packages/migrate/src/validate.ts";
import { validateDirectMdx } from "../packages/migrate/src/validate-mdx.ts";

const cppSource = "ref/cppreference-en/reference/en/cpp/language/default_arguments.html";
const cSource = "ref/cppreference-en/reference/en/c/string/byte/memcpy.html";
const vectorSource = "ref/cppreference-en/reference/en/cpp/container/vector.html";
const assertSource = "ref/cppreference-en/reference/en/cpp/language/static_assert.html";
const assertMdx = "apps/docs/content/docs/cpp/language/declarations/static_assert.mdx";

test("external migration tasks expose files, rules, contracts, and deterministic validation", async () => {
  const page = extractEnglishPage(await readFile(cppSource, "utf8"), { sourcePath: cppSource });
  const task = createExternalMigrationTask(page, {
    sourceHtml: cppSource,
    sourceIr: "/tmp/default-arguments.source.json",
    outputMdx: "/tmp/default-arguments.mdx",
    validationReport: "/tmp/default-arguments.validation.json",
  });
  expect(task.kind).toBe("cppreference-external-migration");
  expect(task.instructions.map((instruction) => instruction.split("/").at(-1))).toEqual([
    "AGENTS.md",
    "MIGRATION_RULES.md",
  ]);
  expect(task.instructions.every((instruction) => instruction.startsWith("/"))).toBe(true);
  expect(task.componentRegistry["declaration-doc"].exportName).toBe("DeclarationDoc");
  expect(task.validation.args).toContain("validate:mdx");
  expect(task.validation.args).toContain(task.paths.outputMdx);
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

test("the migrated static_assert page preserves ordered source coverage without raw HTML escape hatches", async () => {
  const source = extractEnglishPage(await readFile(assertSource, "utf8"), { sourcePath: assertSource });
  const mdx = await readFile(assertMdx, "utf8");
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

  test("decodes encoded operator paths and emits static-host-safe slugs", () => {
    const slugMap = new Map([
      ["cpp/container/vector/operator=", "cpp/library/container/vector/operator="],
      ["cpp/container/mdspan/extents/operator==", "cpp/library/container/mdspan/extents/operator=="],
    ]);
    expect(normalizeCppreferenceLink("operator%3D.html", "cpp/container/vector/assign", slugMap)).toEqual({
      href: "cpp/library/container/vector/operator_assignment",
      kind: "internal",
    });
    expect(
      normalizeCppreferenceLink(
        "https://en.cppreference.com/w/cpp/container/mdspan/extents/operator%3D%3D",
        "cpp/container/mdspan/extents",
        slugMap,
      ),
    ).toEqual({
      href: "cpp/library/container/mdspan/extents/operator_eq",
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

describe("semantic MDX validation", () => {
  const countSource = "ref/cppreference-en/reference/en/cpp/chrono/duration/count.html";
  const countMdx = `---
title: "std::chrono::duration<Rep,Period>::count"
description: "Returns the number of ticks for this duration."
source_url: "https://en.cppreference.com/w/cpp/chrono/duration/count"
language: "C++"
---

{/* source:cpp-chrono-duration-count:0000 */}
<DeclarationDoc>
  <Declaration language="cpp" since="C++11" code={\`constexpr rep count() const;\`} />
</DeclarationDoc>

{/* source:cpp-chrono-duration-count:0001 */}
Returns the number of ticks for this duration.

## Parameters

{/* source:cpp-chrono-duration-count:0002 */}
(none)

## Return value

{/* source:cpp-chrono-duration-count:0003 */}
The number of ticks for this duration.

## Example

{/* source:cpp-chrono-duration-count:0004 */}
\`\`\`cpp
#include <chrono>
#include <iostream>

int main()
{
    std::chrono::milliseconds ms{3}; // 3 milliseconds
    // 6000 microseconds constructed from 3 milliseconds
    std::chrono::microseconds us = 2 * ms;
    // 30Hz clock using fractional ticks
    std::chrono::duration<double, std::ratio<1, 30>> hz30(3.5);

    std::cout << "3 ms duration has " << ms.count() << " ticks\\n"
              << "6000 us duration has " << us.count() << " ticks\\n"
              << "3.5 30Hz duration has " << hz30.count() << " ticks\\n";
}
\`\`\`

Output:

\`\`\`text
3 ms duration has 3 ticks
6000 us duration has 6000 ticks
3.5 30Hz duration has 3.5 ticks
\`\`\`

## See also

{/* source:cpp-chrono-duration-count:0005 */}
<DescriptionList>
  <DescriptionItem>
    <DescriptionTerm>[\`duration_cast\`](/docs/cpp/library/chrono/duration/duration_cast) <InlineRevision since="C++11" /></DescriptionTerm>
    <DescriptionBody>converts a duration to another, with a different tick interval (function template)</DescriptionBody>
  </DescriptionItem>
</DescriptionList>
`;

  test("component props and inline markers satisfy visible-text and code coverage", async () => {
    const slugMap = new Map(
      (JSON.parse(await readFile("ref/cppdoc/migrate/slug_map.json", "utf8")) as Array<{ cppref: string; cppdoc: string | null }>).map((entry) => [entry.cppref, entry.cppdoc]),
    );
    const source = extractEnglishPage(await readFile(countSource, "utf8"), { sourcePath: countSource, slugMap });
    const report = validateDirectMdx(source, countMdx);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  test("example control text is excluded from visible text", async () => {
    const source = extractEnglishPage(await readFile(countSource, "utf8"), { sourcePath: countSource });
    const example = source.sections.flatMap((section) => section.blocks).find((block) => block.classes.includes("t-example"));
    expect(example?.visibleText).not.toContain("Run this code");
  });

  test("links inside code elements are not extracted", async () => {
    const source = extractEnglishPage(await readFile(countSource, "utf8"), { sourcePath: countSource });
    const example = source.sections.flatMap((section) => section.blocks).find((block) => block.classes.includes("t-example"));
    expect(example?.immutable.links).toEqual([]);
  });

  test("defect report meta cells are excluded from visible text and links", async () => {
    const source = extractEnglishPage(await readFile(vectorSource, "utf8"), { sourcePath: vectorSource });
    const block = source.sections.flatMap((section) => section.blocks).find((candidate) => candidate.immutable.links.some((link) => link.text.startsWith("LWG")));
    expect(block).toBeUndefined();
    const report = source.sections.flatMap((section) => section.blocks).find((candidate) => candidate.visibleText.includes("Behavior as published"));
    expect(report).toBeUndefined();
  });

  test("citation backlinks are not extracted as links", async () => {
    const source = extractEnglishPage(await readFile("ref/cppreference-en/reference/en/cpp/chrono/c/tm.html", "utf8"), { sourcePath: "ref/cppreference-en/reference/en/cpp/chrono/c/tm.html" });
    const citeLinks = source.sections.flatMap((section) => section.blocks).flatMap((block) => block.immutable.links.filter((link) => /cite_(?:note|ref)-/u.test(link.href)));
    expect(citeLinks).toEqual([]);
  });

  test("technical specification revision tokens require their visible labels", () => {
    const source = {
      meta: { slug: "cpp/language/x", title: "X", language: "C++", locale: "en", sourcePath: "x", sourceUrl: "https://en.cppreference.com/w/cpp/language/x", adapter: "english-geshi" },
      sections: [
        {
          sourceId: "x:section",
          heading: "X",
          headingLevel: 1,
          blocks: [
            {
              sourceId: "x:0000",
              order: 0,
              tagName: "p",
              domPath: "p",
              html: "<p>x</p>",
              visibleText: "synchronized/atomic (TM TS)",
              classes: [],
              attributes: {},
              headingContext: ["X"],
              immutable: { code: [], links: [], inlineRevisions: [], revisions: ["t-since-tm_ts", "t-since-concepts-ts"], tableSpans: [] },
            },
          ],
        },
      ],
    } as never;
    const mdx = "x\n\n{/* source:x:0000 */}\n[`synchronized`](/docs/x)/[`atomic`](/docs/x) (TM TS) (Concepts TS)";
    const report = validateDirectMdx(source as never, mdx);
    expect(report.issues).toEqual([]);
  });

  test("inline revision scopes with mid-content links and dual markers validate", () => {
    const source = {
      meta: { slug: "cpp/language/x", title: "X", language: "C++", locale: "en", sourcePath: "x", sourceUrl: "https://en.cppreference.com/w/cpp/language/x", adapter: "english-geshi" },
      sections: [
        {
          sourceId: "x:section",
          heading: "X",
          headingLevel: 1,
          blocks: [
            {
              sourceId: "x:0000",
              order: 0,
              tagName: "p",
              domPath: "p",
              html: "<p>x</p>",
              visibleText: "a prvalue temporary until C++17",
              classes: [],
              attributes: {},
              headingContext: ["X"],
              immutable: {
                code: [],
                links: [{ text: "declaration specifier sequence", href: "x.html", normalizedHref: "cpp/language/declarations", kind: "internal" }],
                inlineRevisions: [
                  { text: "prvalue temporary", html: "", marker: "(until C++17)", revisions: ["t-rev-inl", "t-since-cxx11", "t-until-cxx17"] },
                  { text: "declaration specifier sequence can only contain type specifiers", html: "", marker: "(since C++11)", revisions: ["t-rev-inl", "t-since-cxx11"] },
                ],
                revisions: [],
                tableSpans: [],
              },
            },
          ],
        },
      ],
    } as never;
    const mdx =
      "x\n\n{/* source:x:0000 */}\na <InlineRevision since=\"C++11\" until=\"C++17\">prvalue temporary</InlineRevision> <InlineRevision since=\"C++11\">[`declaration specifier sequence`](/docs/cpp/language/declarations) can only contain type specifiers</InlineRevision> until C++17";
    const report = validateDirectMdx(source as never, mdx);
    expect(report.issues).toEqual([]);
  });

  test("hidden MathJax source spans are excluded from visible text", async () => {
    const source = extractEnglishPage(await readFile("ref/cppreference-en/reference/en/cpp/chrono/duration/abs.html", "utf8"), { sourcePath: "ref/cppreference-en/reference/en/cpp/chrono/duration/abs.html" });
    const texts = source.sections.flatMap((section) => section.blocks).map((block) => block.visibleText);
    expect(texts.join("\n")).not.toContain("small");
    expect(texts.some((text) => text.includes("|x|"))).toBe(true);
  });

  test("zero-width characters are stripped from inline revision scopes", async () => {
    const source = extractEnglishPage(await readFile("ref/cppreference-en/reference/en/cpp/chrono/c/tm.html", "utf8"), { sourcePath: "ref/cppreference-en/reference/en/cpp/chrono/c/tm.html" });
    const scope = source.sections.flatMap((section) => section.blocks).flatMap((block) => block.immutable.inlineRevisions).find((revision) => revision.text.includes("61"));
    expect(scope?.text.replace(/\s+/gu, "")).toBe("[0,61]");
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
