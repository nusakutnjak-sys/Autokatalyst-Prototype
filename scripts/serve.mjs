#!/usr/bin/env node
/*
  Zero-dependency static server for local preview.

  Mirrors the Vercel config in vercel.json: clean URLs (/about serves
  about.html), trailing slashes stripped, and a 404 page when a file is
  missing. Nothing here ships — Vercel serves the site directly.

  Usage: node scripts/serve.mjs [directory] [port]
*/

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..", process.argv[2] || "site");
const port = Number(process.argv[3] || process.env.PORT || 5500);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/* Resolves a request path the way Vercel's cleanUrls does. */
async function locate(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const target = join(root, clean);
  if (target !== root && !target.startsWith(root + sep)) return null;

  const candidates = [target, target + ".html", join(target, "index.html")];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    response.writeHead(308, { Location: url.pathname.slice(0, -1) + url.search });
    response.end();
    return;
  }

  const file = await locate(url.pathname);
  const status = file ? 200 : 404;
  const body = file || (await locate("/404"));

  if (!body) {
    response.writeHead(404, { "Content-Type": TYPES[".txt"] });
    response.end("Not found");
    return;
  }

  response.writeHead(status, {
    "Content-Type": TYPES[extname(body).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache"
  });
  response.end(await readFile(body));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
