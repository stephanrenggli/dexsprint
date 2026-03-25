import { copyFile, readFile, writeFile } from "node:fs/promises";

const version = process.argv[2];

if (!version) {
  console.error("Expected a version argument, for example: npm run sync-site-version -- 1.2.3");
  process.exit(1);
}

const indexPath = new URL("../site/index.html", import.meta.url);
const changelogSourcePath = new URL("../CHANGELOG.md", import.meta.url);
const changelogTargetPath = new URL("../site/changelog.md", import.meta.url);
const current = await readFile(indexPath, "utf8");

const next = current
  .replace(
    /(<meta name="dexsprint-version" content=")([^"]+)(" \/>)/,
    `$1${version}$3`
  )
  .replace(
    /(<span id="site-version" class="site-version" aria-label="Site version">)v[^<]*(<\/span>)/,
    `$1v${version}$2`
  );

if (next === current) {
  console.error("Could not find the version markers in site/index.html");
  process.exit(1);
}

await writeFile(indexPath, next);
await copyFile(changelogSourcePath, changelogTargetPath);
