export interface RevisionRange {
  removed?: string | undefined;
  since?: string | undefined;
  until?: string | undefined;
}

export function revisionLabel({ removed, since, until }: RevisionRange): string {
  if (removed) return `${since ? `${since}–` : "until "}${removed}`;
  if (since && until) return `${since}–${until}`;
  if (since) return `since ${since}`;
  if (until) return `until ${until}`;
  return "revision-specific";
}
