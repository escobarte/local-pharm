// Writes public/sw.js for the build that `next build` has just produced
// (package.json "build"). The file is generated, not committed.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { precacheList, renderServiceWorker } from "./render.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join("/"));
}

async function main(): Promise<void> {
  const buildId = (await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim();
  const source = await readFile(path.join(root, "lib/offline/sw.ts"), "utf8");
  const precache = precacheList(
    await filesIn(path.join(root, ".next/static")),
    await filesIn(path.join(root, "public/icons")),
  );
  // The worker's own code is part of the version: a change in it alone must also roll the cache.
  const version = `${buildId}-${createHash("sha256").update(source).update(precache.join("\n")).digest("hex").slice(0, 8)}`;

  await writeFile(path.join(root, "public/sw.js"), renderServiceWorker(source, { version, precache }));
  console.log(`public/sw.js: version ${version}, ${precache.length} files to precache`);
}

// A failed worker build must fail the deployment.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
