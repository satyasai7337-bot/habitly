// Minimal Node ESM loader so the project's source files can run under plain
// `node` (outside Next.js). It does two things:
//   1. resolves the project's "@/..." path alias to real files (adding the .js
//      extension Next lets you omit), and
//   2. loads the project's extension-less / non-"type:module" .js sources as ES
//      modules (the package isn't "type":"module", so Node would otherwise treat
//      them as CommonJS and choke on import/export).
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rel = specifier.slice(2);
    if (!path.extname(rel)) rel += ".js";
    return { url: pathToFileURL(path.join(root, rel)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".js")) {
    const filePath = fileURLToPath(url);
    if (filePath.startsWith(root) && !filePath.includes("node_modules")) {
      const source = await readFile(filePath, "utf8");
      return { format: "module", source, shortCircuit: true };
    }
  }
  return nextLoad(url, context);
}
