import Link from "next/link";
import { highlight } from "fumadocs-core/highlight";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { CxxSyntax } from "./cxx-syntax";
import { RevisionMark } from "./revision-mark";


interface RevisionProps extends PropsWithChildren {
  since?: string;
  until?: string;
  removed?: string;
}

function revisionLabel({ since, until, removed }: Omit<RevisionProps, "children">): string {
  if (removed) return `${since ? `${since}–` : "until "}${removed}`;
  if (since && until) return `${since}–${until}`;
  if (since) return `since ${since}`;
  if (until) return `until ${until}`;
  return "revision-specific";
}


export function DocLink({ dest, section, children }: PropsWithChildren<{ dest: string; section?: string }>) {
  const normalizedDest = dest.replace(/^\/?(?:docs\/)?/u, "");
  const href = `/docs/${normalizedDest}${section ? `#${section}` : ""}`;
  return (
    <Link className="cpp-doc-link" href={href}>
      {children}
    </Link>
  );
}

export function HeaderRef({ language, name, displayName }: { language: "C" | "C++"; name: string; displayName?: string }) {
  const segment = language === "C" ? "c" : "cpp";
  return (
    <Link className="cpp-header-ref" href={`/docs/${segment}/header/${name.replace(/[<>]/gu, "")}`}>
      <code>{displayName ?? name}</code>
    </Link>
  );
}

export function BehaviorTerm({ kind, children }: PropsWithChildren<{ kind: string }>) {
  return (
    <span className="cpp-behavior-term" data-kind={kind}>
      {children}
    </span>
  );
}

export function InlineRevision({
  since,
  until,
  removed,
  children,
}: RevisionProps) {
  return (
    <span className="cpp-inline-revision">
      <span className="cpp-inline-revision__range">
        <span className="cpp-inline-revision__content">{children}</span>
        <RevisionMark className="cpp-inline-revision__mark" icon={false}>
          {revisionLabel({ since, until, removed })}
        </RevisionMark>
      </span>
    </span>
  );
}


export function Revision({ since, until, removed, children }: RevisionProps) {
  return (
    <aside className="cpp-revision">
      <RevisionMark className="cpp-revision-tag">{revisionLabel({ since, until, removed })}</RevisionMark>
      <div className="cpp-revision__content">{children}</div>
    </aside>
  );
}

export function DeclarationDoc({ id, since, until, removed, children }: PropsWithChildren<{ id?: number } & Omit<RevisionProps, "children">>) {
  const label = (since || until || removed) ? revisionLabel({ since, until, removed }) : undefined;
  return (
    <section className="cpp-declaration-doc" data-declaration-id={id}>
      {label && <div className="cpp-declaration cpp-declaration--revision"><span className="cpp-declaration__id">{label}</span></div>}
      {children}
    </section>
  );
}

export async function Declaration({
  code,
  language,
  id,
  since,
  until,
  removed,
  grammar = false,
}: {
  code: string;
  language: "c" | "cpp";
  id?: string;
  grammar?: boolean;
} & Omit<RevisionProps, "children">) {
  const revision = since || until || removed ? revisionLabel({ since, until, removed }) : undefined;
  const highlighted = grammar
    ? undefined
    : await highlight(code, {
        lang: language,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
        components: {
          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
          code: ({ children }: { children?: ReactNode }) => <code>{children}</code>,
        },
      });

  return (
    <div className="cpp-declaration" data-language={language}>
      {id && <span className="cpp-declaration__id">{id}</span>}
      {grammar ? <CxxSyntax code={code} /> : <span className="cpp-declaration__code">{highlighted}</span>}
      {revision && <RevisionMark className="cpp-declaration__standard">{revision}</RevisionMark>}
    </div>
  );
}

export function DeclarationDescription({ children }: PropsWithChildren) {
  return <div className="cpp-domain-card__body">{children}</div>;
}

export function DescriptionList({ children }: PropsWithChildren) {
  return <div className="cpp-description-list">{children}</div>;
}

export function DescriptionItem({ children, kind }: PropsWithChildren<{ kind?: string }>) {
  return <div className="cpp-description-item" data-kind={kind}>{children}</div>;
}

export function DescriptionTerm({ children }: PropsWithChildren) {
  return <div className="cpp-description-term">{children}</div>;
}

export function DescriptionBody({ children }: PropsWithChildren) {
  return <div>{children}</div>;
}

export function ParameterList({ children }: PropsWithChildren) {
  return <div className="cpp-parameter-list">{children}</div>;
}

export function Parameter({ name, children }: PropsWithChildren<{ name: string }>) {
  return (
    <div className="cpp-parameter">
      <code className="cpp-parameter__name">{name}</code>
      <div>{children}</div>
    </div>
  );
}

export function DefectReportList({ children }: PropsWithChildren) {
  return <div className="cpp-defect-list">{children}</div>;
}

export function DefectReport({ kind, id, standard, children }: PropsWithChildren<{ kind: "cwg" | "lwg" | "paper"; id: number | string; standard: string }>) {
  const label = kind === "paper" ? String(id) : `${kind.toUpperCase()} ${id}`;
  return (
    <article className="cpp-defect-report">
      <div className="cpp-defect-report__meta">
        {kind === "paper" ? <PaperLink paper={String(id)}>{label}</PaperLink> : <strong>{label}</strong>}
        <div>{standard}</div>
      </div>
      <div className="cpp-defect-report__change">{children}</div>
    </article>
  );
}

export function PublishedBehavior({ children }: PropsWithChildren) {
  return <div className="cpp-defect-report__behavior"><div className="cpp-defect-report__label">Published</div><div>{children}</div></div>;
}

export function CorrectedBehavior({ children }: PropsWithChildren) {
  return <div className="cpp-defect-report__behavior"><div className="cpp-defect-report__label">Corrected</div><div>{children}</div></div>;
}

export function PaperLink({ paper, children }: PropsWithChildren<{ paper: string }>) {
  return <a className="cpp-paper-link" href={`https://wg21.link/${paper}`} rel="noreferrer">{children ?? paper}</a>;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    DocLink,
    HeaderRef,
    BehaviorTerm,
    Revision,
    InlineRevision,
    DeclarationDoc,
    Declaration,
    DeclarationDescription,
    DescriptionList,
    DescriptionItem,
    DescriptionTerm,
    DescriptionBody,
    ParameterList,
    Parameter,
    DefectReportList,
    DefectReport,
    PublishedBehavior,
    CorrectedBehavior,
    PaperLink,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

export type MdxComponentProps = ComponentProps<"div"> & { children?: ReactNode };

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
