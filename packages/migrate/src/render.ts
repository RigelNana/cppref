import type {
  ContentBlock,
  InlineNode,
  RevisionInfo,
  SemanticNode,
  SemanticPage,
} from "@cppref/page-ir";

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("<", "\\<");
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function renderInline(inline: InlineNode): string {
  switch (inline.type) {
    case "text":
      return escapeText(inline.value);
    case "code":
      return `\`${inline.value.replaceAll("`", "\\`")}\``;
    case "doc-link":
      return `<DocLink dest="${escapeAttribute(inline.dest)}"${inline.section ? ` section="${escapeAttribute(inline.section)}"` : ""}>${inline.content.map(renderInline).join("")}</DocLink>`;
    case "header-ref":
      return `<HeaderRef language="${inline.language}" name="${escapeAttribute(inline.name)}"${inline.displayName ? ` displayName="${escapeAttribute(inline.displayName)}"` : ""} />`;
    case "behavior-term":
      return `<BehaviorTerm kind="${inline.kind}">${inline.content.map(renderInline).join("")}</BehaviorTerm>`;
    case "inline-revision":
      return `<InlineRevision${revisionAttributes(inline.revision)}>${inline.content.map(renderInline).join("")}</InlineRevision>`;
  }
}

function revisionAttributes(revision: RevisionInfo): string {
  const attributes = [
    revision.since ? `since="${revision.since}"` : "",
    revision.until ? `until="${revision.until}"` : "",
    revision.removed ? `removed="${revision.removed}"` : "",
  ].filter(Boolean);
  return attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
}

function renderContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.content.map(renderInline).join("");
    case "code-block":
      return `\`\`\`${block.language}\n${block.code}\n\`\`\``;
    case "raw-html":
      return `<SourceHtml html={${JSON.stringify(block.html)}} />`;
  }
}

function renderSemanticNode(node: SemanticNode): string {
  const marker = `{/* source:${node.sourceIds.join(",")} */}`;
  switch (node.node.type) {
    case "paragraph":
    case "code-block":
    case "raw-html":
      return `${marker}\n${renderContentBlock(node.node)}`;
    case "declaration-doc": {
      const declarations = node.node.declarations
        .map(
          (declaration) =>
            `<Declaration code={${JSON.stringify(declaration.code)}} language="${declaration.language}"${declaration.id ? ` id="${escapeAttribute(declaration.id)}"` : ""}${declaration.id ? " grammar" : ""}${declaration.revision ? revisionAttributes(declaration.revision) : ""} />`,
        )
        .join("\n");
      const description = node.node.description.map(renderContentBlock).join("\n\n");
      return `${marker}\n<DeclarationDoc${node.node.id ? ` id={${node.node.id}}` : ""}${node.node.revision ? revisionAttributes(node.node.revision) : ""}>\n${declarations}\n<DeclarationDescription>\n${description}\n</DeclarationDescription>\n</DeclarationDoc>`;
    }
    case "description-list": {
      const items = node.node.items
        .map((item) => {
          const terms = item.terms.map(renderInline).join("");
          const description = item.description.map(renderContentBlock).join("\n\n");
          return `<DescriptionItem${item.kind ? ` kind="${escapeAttribute(item.kind)}"` : ""}${item.revision ? revisionAttributes(item.revision) : ""}>\n<DescriptionTerm>${terms}</DescriptionTerm>\n<DescriptionBody>\n${description}\n</DescriptionBody>\n</DescriptionItem>`;
        })
        .join("\n");
      return `${marker}\n<DescriptionList>\n${items}\n</DescriptionList>`;
    }
    case "parameter-list": {
      const items = node.node.items
        .map(
          (item) =>
            `<Parameter name="${escapeAttribute(item.name)}">\n${item.description.map(renderContentBlock).join("\n\n")}\n</Parameter>`,
        )
        .join("\n");
      return `${marker}\n<ParameterList>\n${items}\n</ParameterList>`;
    }
    case "revision":
      return `${marker}\n<Revision${revisionAttributes(node.node.revision)}>\n${node.node.content.map(renderContentBlock).join("\n\n")}\n</Revision>`;
    case "defect-report-list": {
      const reports = node.node.reports
        .map(
          (report) =>
            `<DefectReport kind="${report.kind}" id={${report.id}} standard="${report.standard}">\n<PublishedBehavior>\n${report.publishedBehavior.map(renderContentBlock).join("\n\n")}\n</PublishedBehavior>\n<CorrectedBehavior>\n${report.correctedBehavior.map(renderContentBlock).join("\n\n")}\n</CorrectedBehavior>\n</DefectReport>`,
        )
        .join("\n");
      return `${marker}\n<DefectReportList>\n${reports}\n</DefectReportList>`;
    }
  }
}

export function renderSemanticPage(page: SemanticPage): string {
  const body = page.sections
    .map((section, index) => {
      const includeHeading = index > 0 || section.heading !== page.meta.title;
      const heading = includeHeading
        ? `<h${section.headingLevel}${section.anchor ? ` id="${escapeAttribute(section.anchor)}"` : ""}>${escapeText(section.heading)}</h${section.headingLevel}>\n\n`
        : "";
      return `${heading}${section.nodes.map(renderSemanticNode).join("\n\n")}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");

  return `---\ntitle: ${JSON.stringify(page.meta.title)}\ndescription: ${JSON.stringify(`Migrated from ${page.meta.sourceUrl}`)}\nsource_url: ${JSON.stringify(page.meta.sourceUrl)}\nlanguage: ${JSON.stringify(page.meta.language)}\n---\n\n${body}\n`;
}
