import type { Classification } from "@cppref/page-ir";

export interface ComponentContract {
  kind: Classification["kind"];
  exportName: string | null;
  purpose: string;
  requiredEvidence: readonly string[];
  rules: readonly string[];
}

export const componentRegistry = {
  "document-primitives": {
    kind: "document-primitives",
    exportName: null,
    purpose: "Headings, prose, lists, ordinary code blocks, and examples.",
    requiredEvidence: ["A source block maps to a normal document primitive."],
    rules: ["Prefer Markdown syntax.", "Do not wrap primitives in React components."],
  },
  "declaration-doc": {
    kind: "declaration-doc",
    exportName: "DeclarationDoc",
    purpose: "One or more declarations and the prose that documents them.",
    requiredEvidence: ["A t-dcl-begin declaration table or equivalent declaration grouping."],
    rules: ["Capture every declaration row.", "Keep the description in the same semantic node."],
  },
  "description-list": {
    kind: "description-list",
    exportName: "DescriptionList",
    purpose: "Term/description pairs such as member, return value, or option descriptions.",
    requiredEvidence: ["A t-dsc-begin table or an explicit term/description relation."],
    rules: ["Preserve term order.", "Do not infer absent descriptions."],
  },
  "parameter-list": {
    kind: "parameter-list",
    exportName: "ParameterList",
    purpose: "Function or template parameter names paired with descriptions.",
    requiredEvidence: ["A Parameters section with explicit name/description rows."],
    rules: ["Parameter names are immutable code text."],
  },
  revision: {
    kind: "revision",
    exportName: "Revision",
    purpose: "Inline or block content gated by language standard revisions.",
    requiredEvidence: ["A parsed t-since/t-until/t-rev marker."],
    rules: ["Revision composes with content.", "Never derive a revision from prose alone."],
  },
  "defect-report-list": {
    kind: "defect-report-list",
    exportName: "DefectReportList",
    purpose: "CWG/LWG defect reports with published and corrected behavior.",
    requiredEvidence: ["A defect-report table with kind, issue number, standard, and both behaviors."],
    rules: ["Preserve report order.", "Identifiers and standard values are immutable."],
  },
  "feature-test-macro": {
    kind: "feature-test-macro",
    exportName: null,
    purpose: "Feature-test macro name, values, standards, and feature descriptions.",
    requiredEvidence: ["An explicit feature-test macro table or section."],
    rules: ["Render as an ordinary Markdown table.", "Macro names and values are immutable code text."],
  },
  "unsupported-pattern": {
    kind: "unsupported-pattern",
    exportName: null,
    purpose: "Lossless fallback for content requiring human review.",
    requiredEvidence: ["No registered semantic contract can preserve the source relation."],
    rules: ["Emit raw HTML.", "Always set needsReview."],
  },
} as const satisfies Record<Classification["kind"], ComponentContract>;

export function lookupComponentContract(kind: Classification["kind"]): ComponentContract {
  return componentRegistry[kind];
}
