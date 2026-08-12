import {
  parse,
  serializeOuter,
  type DefaultTreeAdapterTypes,
} from "parse5";
import {
  losslessPageSchema,
  type LosslessPage,
  type LosslessSection,
  type RawBlock,
} from "@cppref/page-ir";

const ignoredClasses: Record<string, true> = {
  editsection: true,
  "mw-editsection": true,
  "t-navbar": true,
  "t-navbar-sep": true,
  "t-navbar-head": true,
  "t-navbar-menu": true,
  "t-example-live-link": true,
};

const ignoredTags: Record<string, true> = {
  script: true,
  style: true,
  noscript: true,
};

const blockTags: Record<string, true> = {
  p: true,
  pre: true,
  table: true,
  ul: true,
  ol: true,
  dl: true,
  blockquote: true,
  div: true,
};

export interface ExtractOptions {
  sourcePath: string;
  sourceUrl?: string;
  slugMap?: ReadonlyMap<string, string | null>;
}

type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function hasChildNodes(node: Node): node is ParentNode {
  return "childNodes" in node;
}

function classNames(element: Element): string[] {
  const classValue = element.attrs.find((attribute) => attribute.name === "class")?.value ?? "";
  return classValue.split(/\s+/u).filter(Boolean);
}

function attributeRecord(element: Element): Record<string, string> {
  return Object.fromEntries(element.attrs.map((attribute) => [attribute.name, attribute.value]));
}

function hasIgnoredIdentity(element: Element): boolean {
  const style = attributeRecord(element).style ?? "";
  return (
    ignoredTags[element.tagName] === true ||
    /display\s*:\s*none/iu.test(style) ||
    classNames(element).some((name) => ignoredClasses[name] === true)
  );
}

/**
 * Defect-report tables (`table.dsctable`) carry a header row and two meta
 * columns per row (DR label, applied standard). The semantic migration
 * re-emits those facts as `DefectReport` props (`kind`, `id`, `standard`),
 * so the label cells are structural chrome: excluding them from visible
 * text and links keeps the extracted evidence consistent with the
 * registered component contract.
 */
function isDefectReportTable(table: Element): boolean {
  const firstHeader = findFirstElement(table, (candidate) => candidate.tagName === "th");
  return normalizedText(firstHeader ?? table).trim() === "DR";
}

function isDefectReportMetaCell(element: Element): boolean {
  if (element.tagName !== "td" && element.tagName !== "th") return false;
  const row = element.parentNode;
  if (!row || !isElement(row) || row.tagName !== "tr") return false;
  let table: Node | null = row.parentNode;
  while (table) {
    if (isElement(table) && table.tagName === "table") break;
    table = isElement(table) ? table.parentNode : null;
  }
  if (!table || !isElement(table) || !classNames(table).includes("dsctable") || !isDefectReportTable(table)) return false;
  if (element.tagName === "th") return true;
  const cells = row.childNodes.filter(
    (node): node is Element => isElement(node) && (node.tagName === "td" || node.tagName === "th"),
  );
  const index = cells.indexOf(element);
  return index === 0 || index === 1;
}

/**
 * Structural chrome that the migrated semantic components re-emit from props
 * or from the row body: defect-report label cells, `t-dsc-begin` column
 * headers (`tr.t-dsc-hitem`), and member markers such as `[static]`
 * (`t-cmark`). Excluding these keeps extracted visible text consistent with
 * the registered component contracts.
 */
function isBlockChrome(element: Element): boolean {
  const classes = classNames(element);
  if (classes.some((name) => name === "t-cmark" || name === "t-mark-rev")) return true;
  const row = element.parentNode;
  if (row && isElement(row) && row.tagName === "tr" && classNames(row).includes("t-dsc-hitem")) return true;
  return isDefectReportMetaCell(element);
}

function findFirstElement(root: ParentNode, predicate: (element: Element) => boolean): Element | undefined {
  for (const child of root.childNodes) {
    if (!isElement(child)) continue;
    if (predicate(child)) return child;
    const nested = findFirstElement(child, predicate);
    if (nested) return nested;
  }
  return undefined;
}

function normalizedText(root: Node, skip?: (element: Element) => boolean): string {
  if ("value" in root) return root.value.replace(/\s+/gu, " ");
  if (isElement(root) && root.tagName === "br") return " ";
  if (!hasChildNodes(root) || (isElement(root) && (hasIgnoredIdentity(root) || skip?.(root)))) return "";
  const texts = root.childNodes.map((node) => normalizedText(node, skip));
  return texts
    .map((text, index) => {
      if (index === 0) return text;
      const previous = root.childNodes[index - 1];
      const current = root.childNodes[index];
      return isElement(previous) && isElement(current) ? ` ${text}` : text;
    })
    .join("")
    .replace(/\s+/gu, " ");
}

function codeText(element: Element): string[] {
  const values: string[] = [];
  const visit = (node: Node): void => {
    if (!isElement(node)) return;
    const classes = classNames(node);
    if (node.tagName === "pre" || classes.includes("mw-geshi") || classes.includes("source-cpp") || classes.includes("source-c")) {
      const text = normalizedTextPreservingLines(node).trimEnd();
      if (text.length > 0) values.push(text);
      return;
    }
    node.childNodes.forEach(visit);
  };
  visit(element);
  return [...new Set(values)];
}

function normalizedTextPreservingLines(root: Node): string {
  if ("value" in root) return root.value.replace(/\r\n?/gu, "\n");
  if (!hasChildNodes(root) || (isElement(root) && hasIgnoredIdentity(root))) return "";
  return root.childNodes.map(normalizedTextPreservingLines).join("");
}
export interface NormalizedLink {
  href: string;
  kind: "internal" | "fragment" | "external";
}

const cppreferenceHostPattern = /^(?:[a-z]{2}\.)?cppreference\.com$/iu;


function removeHtmlSuffix(pathname: string): string {
  return pathname.replace(/\.html$/iu, "").replace(/\/index$/iu, "");
}

function canonicalTargetSlug(sourceSlug: string): string {
  return sourceSlug.split("/").map((segment) => segment.replaceAll("_", "-")).join("/");
}

function resolveRelativeSlug(href: string, currentSlug: string): string {
  const base = new URL(`https://en.cppreference.com/w/${currentSlug}`);
  return removeHtmlSuffix(new URL(href, `${base.href.slice(0, base.href.lastIndexOf("/") + 1)}`).pathname.replace(/^\/w\//u, "").replace(/^\/reference\/en\//u, "").replace(/^\//u, ""));
}

export function normalizeCppreferenceLink(
  href: string,
  currentSlug: string,
  slugMap?: ReadonlyMap<string, string | null>,
): NormalizedLink {
  const trimmed = href.trim();
  if (trimmed.startsWith("#")) {
    return { href: trimmed, kind: "fragment" };
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(trimmed) && !/^https?:/iu.test(trimmed)) {
    return { href: trimmed, kind: "external" };
  }


  let sourceSlug: string | undefined;
  let hash = "";
  if (/^(?:https?:)?\/\//iu.test(trimmed)) {
    const parsed = new URL(trimmed, "https://en.cppreference.com");
    if (!cppreferenceHostPattern.test(parsed.hostname)) {
      return { href: trimmed, kind: "external" };
    }
    hash = parsed.hash;
    if (parsed.pathname.startsWith("/w/")) {
      sourceSlug = removeHtmlSuffix(parsed.pathname.slice(3));
    } else if (parsed.pathname.startsWith("/reference/en/")) {
      sourceSlug = removeHtmlSuffix(parsed.pathname.slice("/reference/en/".length));
    } else {
      return { href: trimmed, kind: "external" };
    }
  } else {
    const hashIndex = trimmed.indexOf("#");
    const relativePath = hashIndex < 0 ? trimmed : trimmed.slice(0, hashIndex);
    hash = hashIndex < 0 ? "" : trimmed.slice(hashIndex);
    sourceSlug = resolveRelativeSlug(relativePath, currentSlug);
  }

  if (sourceSlug === undefined) {
    return { href: trimmed, kind: "external" };
  }
  const mappedSlug = slugMap?.get(sourceSlug);
  const destinationSlug = mappedSlug ?? canonicalTargetSlug(sourceSlug);
  return {
    href: `${destinationSlug.replace(/^\//u, "")}${hash}`,
    kind: "internal",
  };
}


function isInsideCodeElement(node: Node): boolean {
  let current: Node | null = isElement(node) ? node.parentNode : null;
  while (current) {
    if (
      isElement(current) &&
      (current.tagName === "pre" || classNames(current).some((name) => /^(?:mw-geshi|source-cpp|source-c)$/u.test(name)))
    ) {
      return true;
    }
    current = isElement(current) ? current.parentNode : null;
  }
  return false;
}

function links(
  element: Element,
  currentSlug: string,
  slugMap?: ReadonlyMap<string, string | null>,
): Array<{ text: string; href: string; normalizedHref: string; kind: "internal" | "fragment" | "external"; title?: string }> {
  const values: Array<{ text: string; href: string; normalizedHref: string; kind: "internal" | "fragment" | "external"; title?: string }> = [];
  const visit = (node: Node): void => {
    if (!isElement(node)) return;
    if (isBlockChrome(node)) return;
    if (node.tagName === "a") {
      if (hasIgnoredIdentity(node) || isInsideCodeElement(node)) return;
      const attributes = attributeRecord(node);
      if (attributes.href && !/#cite_(?:note|ref)-/u.test(attributes.href)) {
        const normalized = normalizeCppreferenceLink(attributes.href, currentSlug, slugMap);
        values.push({
          text: normalizedText(node).trim(),
          href: attributes.href,
          normalizedHref: normalized.href,
          kind: normalized.kind,
          ...(attributes.title ? { title: attributes.title } : {}),
        });
      }
    }
    node.childNodes.forEach(visit);
  };
  visit(element);
  return values;
}

function revisionTokens(element: Element): string[] {
  const values = new Set<string>();
  const visit = (node: Node): void => {
    if (!isElement(node)) return;
    for (const name of classNames(node)) {
      if (/^t-(?:since|until|rev)-/u.test(name)) values.add(name);
    }
    node.childNodes.forEach(visit);
  };
  visit(element);
  return [...values];
}

function inlineRevisions(element: Element): Array<{ text: string; html: string; marker: string; revisions: string[] }> {
  const values: Array<{ text: string; html: string; marker: string; revisions: string[] }> = [];
  const visit = (node: Node): void => {
    if (!isElement(node)) return;
    if (classNames(node).includes("t-rev-inl")) {
      const markerElement = findFirstElement(
        node,
        (candidate) => candidate !== node && classNames(candidate).includes("t-mark-rev"),
      );
      const marker = normalizedText(markerElement ?? node).trim();
      const text = (markerElement
        ? normalizedText(node).replace(normalizedText(markerElement), "").trim()
        : normalizedText(node).trim()).replace(/[\u200b-\u200d\ufeff]/gu, "");
      values.push({
        text,
        html: serializeOuter(node),
        marker,
        revisions: revisionTokens(node),
      });
      return;
    }
    node.childNodes.forEach(visit);
  };
  visit(element);
  return values;
}

function tableSpans(element: Element, sourceId: string): Array<{ sourceId: string; rowSpan: number; colSpan: number }> {
  const values: Array<{ sourceId: string; rowSpan: number; colSpan: number }> = [];
  let cellIndex = 0;
  const visit = (node: Node): void => {
    if (!isElement(node)) return;
    if (node.tagName === "td" || node.tagName === "th") {
      const attributes = attributeRecord(node);
      values.push({
        sourceId: `${sourceId}:cell-${cellIndex}`,
        rowSpan: Number.parseInt(attributes.rowspan ?? "1", 10),
        colSpan: Number.parseInt(attributes.colspan ?? "1", 10),
      });
      cellIndex += 1;
    }
    node.childNodes.forEach(visit);
  };
  visit(element);
  return values;
}

function elementPath(element: Element, root: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current) {
    const parent: ParentNode | null = current.parentNode;
    if (!parent || !("childNodes" in parent)) {
      parts.unshift(current.tagName);
      break;
    }
    const siblings = parent.childNodes.filter(
      (node): node is Element => isElement(node) && node.tagName === current?.tagName,
    );
    const position = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName}:nth-of-type(${position})`);
    if (current === root) break;
    current = "tagName" in parent ? parent : null;
  }
  return parts.join(" > ");
}

function shouldOwnBlock(element: Element, contentRoot: Element): boolean {
  if (blockTags[element.tagName] !== true || hasIgnoredIdentity(element)) return false;
  const parent = element.parentNode;
  if (!parent || parent === contentRoot || !isElement(parent)) return true;
  if (element.tagName === "pre" || element.tagName === "table") {
    return !classNames(parent).some((name) => name === "mw-geshi" || name === "t-example");
  }
  if (element.tagName === "div") {
    const classes = classNames(element);
    return classes.some((name) =>
      /^(?:mw-geshi|t-example|t-dcl-begin|t-dsc-begin|t-par-begin|t-rev-begin|t-example-live-link)$/u.test(name),
    );
  }
  return !["div", "td", "th", "li", "dd", "blockquote"].includes(parent.tagName);
}

function collectContentSequence(contentRoot: Element): Element[] {
  const result: Element[] = [];
  const visit = (parent: ParentNode): void => {
    for (const child of parent.childNodes) {
      if (!isElement(child) || hasIgnoredIdentity(child)) continue;
      if (/^h[1-6]$/u.test(child.tagName) || shouldOwnBlock(child, contentRoot)) {
        result.push(child);
        continue;
      }
      visit(child);
    }
  };
  visit(contentRoot);
  return result;
}

function headingData(element: Element): { text: string; level: number; anchor?: string } {
  const headline = findFirstElement(element, (candidate) => classNames(candidate).includes("mw-headline"));
  const attributes = attributeRecord(headline ?? element);
  const text = normalizedText(headline ?? element).trim();
  return {
    text,
    level: Number.parseInt(element.tagName.slice(1), 10),
    ...(attributes.id ? { anchor: attributes.id } : {}),
  };
}

function sourceIdFor(slug: string, order: number): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9]+/gu, "-").replace(/^-|-$/gu, "").toLowerCase();
  return `${safeSlug || "page"}:${String(order).padStart(4, "0")}`;
}

function sourceRange(element: Element): RawBlock["sourceRange"] {
  const location = element.sourceCodeLocation;
  if (!location) return undefined;
  return {
    startOffset: location.startOffset,
    endOffset: location.endOffset,
    startLine: location.startLine,
    startColumn: location.startCol - 1,
    endLine: location.endLine,
    endColumn: location.endCol - 1,
  };
}

function inferSlug(sourcePath: string): string {
  const marker = "/reference/en/";
  const normalized = sourcePath.replaceAll("\\", "/");
  const pathPart = normalized.includes(marker) ? normalized.split(marker)[1]! : normalized;
  return pathPart.replace(/\.html$/u, "").replace(/\/index$/u, "");
}

function inferSourceUrl(slug: string): string {
  return `https://en.cppreference.com/w/${slug}`;
}

function inferLanguage(slug: string): "C" | "C++" {
  return slug.startsWith("c/") ? "C" : "C++";
}

export function extractEnglishPage(html: string, options: ExtractOptions): LosslessPage {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const contentRoot = findFirstElement(document, (element) => attributeRecord(element).id === "mw-content-text");
  if (!contentRoot) throw new Error("cppreference content root #mw-content-text was not found");

  const slug = inferSlug(options.sourcePath);
  const titleElement = findFirstElement(document, (element) => element.tagName === "title");
  const title = normalizedText(titleElement ?? contentRoot).replace(/\s+-\s+cppreference\.com\s*$/u, "").trim();
  const sections: LosslessSection[] = [];
  const rootSection: LosslessSection = {
    sourceId: `${sourceIdFor(slug, 0)}:section`,
    heading: title,
    headingLevel: 1,
    blocks: [],
  };
  sections.push(rootSection);
  let currentSection = rootSection;
  const headingContext: string[] = [title];
  let blockOrder = 0;

  for (const element of collectContentSequence(contentRoot)) {
    if (/^h[1-6]$/u.test(element.tagName)) {
      const heading = headingData(element);
      headingContext.splice(heading.level - 1);
      headingContext[heading.level - 1] = heading.text;
      currentSection = {
        sourceId: `${sourceIdFor(slug, blockOrder)}:section`,
        heading: heading.text,
        headingLevel: heading.level,
        ...(heading.anchor ? { anchor: heading.anchor } : {}),
        blocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    const visibleText = normalizedText(element, isBlockChrome).trim();
    if (visibleText.length === 0 && element.tagName !== "table") continue;
    const sourceId = sourceIdFor(slug, blockOrder);
    currentSection.blocks.push({
      sourceId,
      order: blockOrder,
      tagName: element.tagName,
      domPath: elementPath(element, contentRoot),
      html: serializeOuter(element),
      visibleText,
      classes: classNames(element),
      attributes: attributeRecord(element),
      headingContext: headingContext.filter(Boolean),
      ...(sourceRange(element) ? { sourceRange: sourceRange(element) } : {}),
      immutable: {
        code: codeText(element),
        links: links(element, slug, options.slugMap),
        inlineRevisions: inlineRevisions(element),
        revisions: revisionTokens(element),
        tableSpans: tableSpans(element, sourceId),
      },
    });
    blockOrder += 1;
  }

  const blocks = sections.flatMap((section) => section.blocks);
  blocks.forEach((block, index) => {
    if (index > 0) block.previousSourceId = blocks[index - 1]!.sourceId;
    if (index < blocks.length - 1) block.nextSourceId = blocks[index + 1]!.sourceId;
  });

  return losslessPageSchema.parse({
    schemaVersion: 1,
    meta: {
      slug,
      title,
      language: inferLanguage(slug),
      locale: "en",
      sourcePath: options.sourcePath,
      sourceUrl: options.sourceUrl ?? inferSourceUrl(slug),
      adapter: "english-geshi",
    },
    sections,
    fingerprint: {
      headings: sections.map((section) => section.heading),
      codeBlocks: blocks.flatMap((block) => block.immutable.code),
      linkTargets: blocks.flatMap((block) => block.immutable.links.map((link) => link.href)),
      visibleText: blocks.map((block) => block.visibleText).join("\n"),
      sourceIds: blocks.map((block) => block.sourceId),
    },
  });
}
