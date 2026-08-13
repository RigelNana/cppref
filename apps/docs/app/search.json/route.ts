import { search } from "@/lib/search";

export const dynamic = "force-static";

export function GET() {
  return search.staticGET();
}
