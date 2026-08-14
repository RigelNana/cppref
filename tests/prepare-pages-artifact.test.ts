import { expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparePagesArtifact } from "../apps/docs/scripts/prepare-pages-artifact";

test("removes duplicate full payloads and optional docs layout prefetches", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "cppref-pages-artifact-"));

  try {
    const routeDirectory = join(outputDirectory, "docs", "cpp", "language", "26");
    const routePayloadPath = join(routeDirectory, "index.txt");
    const fullPayloadPath = join(routeDirectory, "__next._full.txt");
    const pagePayloadPath = join(routeDirectory, "__next.docs.$oc$slug.__PAGE__.txt");
    const docsLayoutPrefetchPath = join(routeDirectory, "__next.docs.txt");
    const payload = Buffer.alloc(256 * 1024, "route payload");
    await mkdir(routeDirectory, { recursive: true });
    await Promise.all([
      writeFile(routePayloadPath, payload),
      writeFile(fullPayloadPath, payload),
      writeFile(pagePayloadPath, "page payload"),
      writeFile(docsLayoutPrefetchPath, "docs layout prefetch"),
    ]);

    await expect(preparePagesArtifact(outputDirectory)).resolves.toEqual({
      removedBytes: payload.length + Buffer.byteLength("docs layout prefetch"),
      removedFiles: 2,
    });
    await expect(access(fullPayloadPath)).rejects.toThrow();
    await expect(access(docsLayoutPrefetchPath)).rejects.toThrow();
    expect(await readFile(routePayloadPath)).toEqual(payload);
    expect(await readFile(pagePayloadPath, "utf8")).toBe("page payload");
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

test("retains every full payload when any route payload differs", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "cppref-pages-artifact-"));

  try {
    const firstRoute = join(outputDirectory, "first");
    const secondRoute = join(outputDirectory, "second");
    const firstFullPayload = join(firstRoute, "__next._full.txt");
    const secondFullPayload = join(secondRoute, "__next._full.txt");
    const docsLayoutPrefetchPath = join(firstRoute, "__next.docs.txt");
    await Promise.all([
      mkdir(firstRoute, { recursive: true }),
      mkdir(secondRoute, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(firstRoute, "index.txt"), "identical"),
      writeFile(firstFullPayload, "identical"),
      writeFile(join(secondRoute, "index.txt"), "route-data"),
      writeFile(docsLayoutPrefetchPath, "docs layout prefetch"),
      writeFile(secondFullPayload, "other-data"),
    ]);

    await expect(preparePagesArtifact(outputDirectory)).rejects.toThrow(
      "differs from the route payload",
    );
    expect(await readFile(firstFullPayload, "utf8")).toBe("identical");
    expect(await readFile(secondFullPayload, "utf8")).toBe("other-data");
    expect(await readFile(docsLayoutPrefetchPath, "utf8")).toBe("docs layout prefetch");
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});
