import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "manifests");
const artifactNames = [
  "release-manifest-Linux",
  "release-manifest-Windows",
  "release-manifest-macOS",
];
const files = artifactNames.map((name) =>
  path.join(root, name, "release-manifest.json"),
);

for (const file of files) {
  let info;
  try {
    info = await stat(file);
  } catch {
    throw new Error(`Expected operating-system manifest is missing: ${file}`);
  }
  if (!info.isFile()) throw new Error(`Manifest path is not a file: ${file}`);
}

function entries(items) {
  return [...items]
    .map(({ path: assetPath, bytes, sha256 }) => ({
      path: assetPath,
      bytes,
      sha256,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function canonical(manifest) {
  return {
    schema: manifest.schema,
    releaseId: manifest.releaseId,
    release: manifest.release,
    shellFiles: [...manifest.shellFiles].sort(),
    totals: manifest.totals,
    files: entries(manifest.files),
    packs: {
      core: entries(manifest.packs.core),
      mow: entries(manifest.packs.mow),
      vacuum: entries(manifest.packs.vacuum),
    },
  };
}

function validate(manifest, file) {
  if (manifest.schema !== 2)
    throw new Error(`${file} is not ReleaseManifestV2.`);
  const listed = entries(manifest.files);
  const packed = entries([
    ...manifest.packs.core,
    ...manifest.packs.mow,
    ...manifest.packs.vacuum,
  ]);
  const paths = listed.map((entry) => entry.path);
  if (new Set(paths).size !== paths.length)
    throw new Error(`${file} contains duplicate file paths.`);
  if (JSON.stringify(packed) !== JSON.stringify(listed))
    throw new Error(
      `${file} pack inventory does not equal its file inventory.`,
    );

  for (const entry of listed) {
    if (
      typeof entry.path !== "string" ||
      !entry.path.startsWith("./") ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    )
      throw new Error(`${file} contains an invalid file entry.`);
  }

  const releaseId = createHash("sha256")
    .update(
      listed
        .map((entry) => `${entry.path}:${entry.bytes}:${entry.sha256}`)
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 16);
  if (manifest.releaseId !== releaseId || manifest.release !== releaseId)
    throw new Error(`${file} release ID does not match its inventory.`);

  const totals = {
    files: listed.length,
    bytes: listed.reduce((sum, entry) => sum + entry.bytes, 0),
    javascriptBytes: listed
      .filter((entry) => entry.path.endsWith(".js"))
      .reduce((sum, entry) => sum + entry.bytes, 0),
  };
  if (JSON.stringify(manifest.totals) !== JSON.stringify(totals))
    throw new Error(`${file} totals do not match its inventory.`);
}

const parsed = await Promise.all(
  files.map(async (file) => ({
    file,
    manifest: JSON.parse(await readFile(file, "utf8")),
  })),
);
for (const item of parsed) validate(item.manifest, item.file);

const expected = JSON.stringify(canonical(parsed[0].manifest));
for (const item of parsed.slice(1)) {
  if (JSON.stringify(canonical(item.manifest)) !== expected) {
    throw new Error(
      `Release manifest differs: ${item.file} does not match ${parsed[0].file}.`,
    );
  }
}

console.log(
  `Release ${parsed[0].manifest.releaseId} is identical and internally valid across Linux, Windows, and macOS.`,
);
