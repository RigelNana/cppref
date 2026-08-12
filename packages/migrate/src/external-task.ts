import path from "node:path";
import type { LosslessPage } from "@cppref/page-ir";
import { componentRegistry } from "./component-registry.ts";

export interface ExternalMigrationPaths {
  sourceHtml: string;
  sourceIr: string;
  outputMdx: string;
  validationReport: string;
}

export interface ExternalMigrationTask {
  schemaVersion: 1;
  kind: "cppreference-external-migration";
  slug: string;
  language: "C" | "C++";
  paths: ExternalMigrationPaths;
  instructions: readonly string[];
  componentRegistry: typeof componentRegistry;
  validation: {
    command: "bun";
    args: string[];
  };
}

export function createExternalMigrationTask(
  page: LosslessPage,
  paths: ExternalMigrationPaths,
): ExternalMigrationTask {
  const repositoryRoot = process.cwd();
  const resolvedPaths = {
    sourceHtml: path.resolve(paths.sourceHtml),
    sourceIr: path.resolve(paths.sourceIr),
    outputMdx: path.resolve(paths.outputMdx),
    validationReport: path.resolve(paths.validationReport),
  };

  return {
    schemaVersion: 1,
    kind: "cppreference-external-migration",
    slug: page.meta.slug,
    language: page.meta.language,
    paths: resolvedPaths,
    instructions: [
      path.join(repositoryRoot, "AGENTS.md"),
      path.join(repositoryRoot, "MIGRATION_RULES.md"),
    ],
    componentRegistry,
    validation: {
      command: "bun",
      args: [
        "run",
        "validate:mdx",
        resolvedPaths.sourceHtml,
        resolvedPaths.outputMdx,
        resolvedPaths.validationReport,
      ],
    },
  };
}
