import type { PropsWithChildren } from "react";
import { Milestone } from "lucide-react";

interface RevisionMarkProps extends PropsWithChildren {
  className?: string;
  icon?: boolean;
}

export function RevisionMark({ children, className = "", icon = true }: RevisionMarkProps) {
  return (
    <span className={`cpp-revision-mark ${className}`.trim()}>
      {icon && <Milestone aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

