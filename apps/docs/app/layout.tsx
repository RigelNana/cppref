import type { Metadata } from "next";
import { IBM_Plex_Mono, Nunito_Sans } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";


const sans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "cppreference modern",
    template: "%s · cppreference modern",
  },
  description: "A typed, reviewable migration of cppreference for modern documentation workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <RootProvider
          search={{
            options: { type: "static", api: "/search.json" },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
