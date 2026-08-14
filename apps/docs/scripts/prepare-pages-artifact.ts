import { open, readdir, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface DuplicatePayload {
  fullPayloadPath: string;
  routePayloadPath: string;
  size: number;
}

export interface PreparedPagesArtifact {
  removedBytes: number;
  removedFiles: number;
}

async function collectArtifactPayloads(
  directory: string,
  fullPayloadPaths: string[],
  docsLayoutPrefetchPaths: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectArtifactPayloads(path, fullPayloadPaths, docsLayoutPrefetchPaths);
    } else if (entry.isFile() && entry.name === "__next._full.txt") {
      fullPayloadPaths.push(path);
    } else if (entry.isFile() && entry.name === "__next.docs.txt") {
      docsLayoutPrefetchPaths.push(path);
    }
  }
}

async function filesAreEqual(
  leftPath: string,
  rightPath: string,
  size: number,
  leftBuffer: Buffer,
  rightBuffer: Buffer,
): Promise<boolean> {
  const [leftFile, rightFile] = await Promise.all([open(leftPath, "r"), open(rightPath, "r")]);

  try {
    let offset = 0;
    while (offset < size) {
      const length = Math.min(leftBuffer.length, size - offset);
      const [leftRead, rightRead] = await Promise.all([
        leftFile.read(leftBuffer, 0, length, offset),
        rightFile.read(rightBuffer, 0, length, offset),
      ]);

      if (leftRead.bytesRead !== rightRead.bytesRead) return false;
      if (
        !leftBuffer
          .subarray(0, leftRead.bytesRead)
          .equals(rightBuffer.subarray(0, rightRead.bytesRead))
      ) {
        return false;
      }
      if (leftRead.bytesRead === 0) return offset === size;
      offset += leftRead.bytesRead;
    }

    return true;
  } finally {
    await Promise.all([leftFile.close(), rightFile.close()]);
  }
}

export async function preparePagesArtifact(
  outputDirectory: string,
): Promise<PreparedPagesArtifact> {
  const fullPayloadPaths: string[] = [];
  const docsLayoutPrefetchPaths: string[] = [];
  await collectArtifactPayloads(
    outputDirectory,
    fullPayloadPaths,
    docsLayoutPrefetchPaths,
  );

  if (fullPayloadPaths.length === 0) {
    throw new Error(`No Next.js full segment payloads found under ${outputDirectory}.`);
  }

  const leftBuffer = Buffer.allocUnsafe(64 * 1024);
  const rightBuffer = Buffer.allocUnsafe(64 * 1024);
  const duplicates: DuplicatePayload[] = [];
  for (const fullPayloadPath of fullPayloadPaths) {
    const routePayloadPath = join(dirname(fullPayloadPath), "index.txt");
    const [fullPayload, routePayload] = await Promise.all([
      stat(fullPayloadPath),
      stat(routePayloadPath),
    ]);

    if (
      fullPayload.size !== routePayload.size ||
      !(await filesAreEqual(
        fullPayloadPath,
        routePayloadPath,
        fullPayload.size,
        leftBuffer,
        rightBuffer,
      ))
    ) {
      throw new Error(
        `Refusing to remove ${fullPayloadPath}: it differs from the route payload ${routePayloadPath}.`,
      );
    }

    duplicates.push({ fullPayloadPath, routePayloadPath, size: fullPayload.size });
  }

  let removedBytes = duplicates.reduce((total, duplicate) => total + duplicate.size, 0);
  for (const duplicate of duplicates) {
    await unlink(duplicate.fullPayloadPath);
  }

  // Next.js can reconstruct this optional layout prefetch from the retained route tree,
  // page segment, and route payload. Omitting it keeps the Pages artifact below 1 GiB.
  for (const docsLayoutPrefetchPath of docsLayoutPrefetchPaths) {
    removedBytes += (await stat(docsLayoutPrefetchPath)).size;
    await unlink(docsLayoutPrefetchPath);
  }

  return {
    removedBytes,
    removedFiles: duplicates.length + docsLayoutPrefetchPaths.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputDirectory = fileURLToPath(new URL("../out", import.meta.url));
  const result = await preparePagesArtifact(outputDirectory);
  console.log(
    `Removed ${result.removedFiles} redundant Next.js export payloads (${result.removedBytes} bytes).`,
  );
}
