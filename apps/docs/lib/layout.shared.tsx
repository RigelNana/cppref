import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Braces } from "lucide-react";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Braces aria-hidden="true" className="size-4 text-fd-primary" />
          <span>cppreference</span>
        </span>
      ),
    },
    githubUrl: "https://github.com/RigelNana/cppref",
  };
}
