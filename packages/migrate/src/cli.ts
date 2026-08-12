import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { losslessPageSchema, semanticPageSchema } from "@cppref/page-ir";
import { createExternalMigrationTask } from "./external-task.ts";
import { extractEnglishPage } from "./extract.ts";
import { createFallbackSemanticPage } from "./fallback.ts";
import { renderSemanticPage } from "./render.ts";
import { validateMigration } from "./validate.ts";
import { validateDirectMdx } from "./validate-mdx.ts";

function requiredArg(args: string[], index: number, usage: string): string {
  const value = args[index];
  if (!value) throw new Error(`Missing argument. Usage: ${usage}`);
  return value;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

interface SlugMapEntry {
  cppref: string;
  cppdoc: string | null;
}

async function loadSlugMap(): Promise<Map<string, string | null>> {
  const mapPath = path.resolve("ref/cppdoc/migrate/slug_map.json");
  const entries = JSON.parse(await readFile(mapPath, "utf8")) as SlugMapEntry[];
  return new Map(entries.map((entry) => [entry.cppref, entry.cppdoc]));
}

async function extractCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run extract <source.html> <page-ir.json>");
  const outputPath = requiredArg(args, 1, "bun run extract <source.html> <page-ir.json>");
  const html = await readFile(sourcePath, "utf8");
  const page = extractEnglishPage(html, { sourcePath, slugMap: await loadSlugMap() });
  await writeJson(outputPath, page);
  console.log(`Extracted ${page.fingerprint.sourceIds.length} blocks to ${outputPath}`);
}

async function renderCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run render <semantic-ir.json> <page.mdx>");
  const outputPath = requiredArg(args, 1, "bun run render <semantic-ir.json> <page.mdx>");
  const page = semanticPageSchema.parse(JSON.parse(await readFile(sourcePath, "utf8")));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderSemanticPage(page), "utf8");
  console.log(`Rendered ${outputPath}`);
}

async function goldenCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run golden <source.html> <output-dir>");
  const outputDirectory = requiredArg(args, 1, "bun run golden <source.html> <output-dir>");
  const html = await readFile(sourcePath, "utf8");
  const source = extractEnglishPage(html, { sourcePath, slugMap: await loadSlugMap() });
  const semantic = createFallbackSemanticPage(source);
  const report = validateMigration(source, semantic);
  const baseName = source.meta.slug.replaceAll("/", "__");
  await writeJson(path.join(outputDirectory, `${baseName}.source.json`), source);
  await writeJson(path.join(outputDirectory, `${baseName}.semantic.json`), semantic);
  await writeJson(path.join(outputDirectory, `${baseName}.validation.json`), report);
  await writeFile(path.join(outputDirectory, `${baseName}.mdx`), renderSemanticPage(semantic), "utf8");
  console.log(
    `Golden ${source.meta.slug}: ${report.sourceCount} source blocks, ${report.coveredCount} covered, ${report.issues.length} issues`,
  );
  if (!report.ok) process.exitCode = 1;
}

async function prepareExternalCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run migrate:prepare <source.html> <task-dir> <output.mdx>");
  const taskDirectory = requiredArg(args, 1, "bun run migrate:prepare <source.html> <task-dir> <output.mdx>");
  const outputPath = requiredArg(args, 2, "bun run migrate:prepare <source.html> <task-dir> <output.mdx>");
  const html = await readFile(sourcePath, "utf8");
  const source = extractEnglishPage(html, { sourcePath, slugMap: await loadSlugMap() });
  const baseName = source.meta.slug.replaceAll("/", "__");
  const sourceIrPath = path.join(taskDirectory, `${baseName}.source.json`);
  const taskPath = path.join(taskDirectory, `${baseName}.task.json`);
  const reportPath = path.join(taskDirectory, `${baseName}.validation.json`);
  const task = createExternalMigrationTask(source, {
    sourceHtml: sourcePath,
    sourceIr: sourceIrPath,
    outputMdx: outputPath,
    validationReport: reportPath,
  });
  await writeJson(sourceIrPath, source);
  await writeJson(taskPath, task);
  console.log(`Prepared external migration task ${taskPath}`);
  console.log(`External Agent writes ${task.paths.outputMdx}`);
  console.log(`Validate with: ${task.validation.command} ${task.validation.args.join(" ")}`);
}
async function validateMdxCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run packages/migrate/src/cli.ts validate-mdx <source.html> <page.mdx> [report.json]");
  const mdxPath = requiredArg(args, 1, "bun run packages/migrate/src/cli.ts validate-mdx <source.html> <page.mdx> [report.json]");
  const reportPath = args[2];
  const html = await readFile(sourcePath, "utf8");
  const source = extractEnglishPage(html, { sourcePath, slugMap: await loadSlugMap() });
  const report = validateDirectMdx(source, await readFile(mdxPath, "utf8"));
  if (reportPath) await writeJson(reportPath, report);
  console.log(
    `Validated MDX ${source.meta.slug}: ${report.sourceCount} source blocks, ${report.coveredCount} covered, ${report.issues.length} issues`,
  );
  if (!report.ok) process.exitCode = 1;
}


async function validateCommand(args: string[]): Promise<void> {
  const sourcePath = requiredArg(args, 0, "bun run packages/migrate/src/cli.ts validate <source.json> <semantic.json>");
  const semanticPath = requiredArg(args, 1, "bun run packages/migrate/src/cli.ts validate <source.json> <semantic.json>");
  const source = losslessPageSchema.parse(JSON.parse(await readFile(sourcePath, "utf8")));
  const semantic = semanticPageSchema.parse(JSON.parse(await readFile(semanticPath, "utf8")));
  const report = validateMigration(source, semantic);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case "extract":
    await extractCommand(args);
    break;
  case "render":
    await renderCommand(args);
    break;
  case "golden":
    await goldenCommand(args);
    break;
  case "validate":
    await validateCommand(args);
    break;
  case "prepare-external":
    await prepareExternalCommand(args);
    break;
  case "validate-mdx":
    await validateMdxCommand(args);
    break;
  default:
    throw new Error("Usage: cli.ts <extract|prepare-external|render|golden|validate|validate-mdx> ...");
}
