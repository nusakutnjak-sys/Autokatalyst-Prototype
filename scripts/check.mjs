#!/usr/bin/env node
/*
  Site check — runs as the Vercel build step (npm run build).

  Fails the build on anything that would ship broken or break the Webflow
  handoff rules:
    · a link, anchor or asset that does not resolve
    · a style attribute or <style> block in the markup
    · a page without exactly one <h1>, or an <img> without alt
    · nav or footer markup that differs between pages
    · a literal colour or image url() in style.css, or an ID selector
    · a var() that points at a variable nobody declares — an unresolved
      var() drops the whole declaration without any error
  Zero dependencies. Usage: node scripts/check.mjs
*/

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "public");
const errors = [];
const warnings = [];

const read = (path) => readFileSync(join(root, path), "utf8");
const pages = readdirSync(root).filter((file) => file.endsWith(".html")).sort();

/* ---------------------------------------------------------------- Markup */

function pageForPath(pathname) {
  const clean = pathname.replace(/^\//, "").replace(/\/$/, "");
  const candidates = clean ? [clean, clean + ".html", join(clean, "index.html")] : ["index.html"];
  return candidates.find((candidate) => existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile());
}

const ids = new Map();
const docs = new Map();
for (const page of pages) {
  const html = read(page);
  docs.set(page, html);
  ids.set(page, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
}

function slice(html, open, close) {
  const start = html.indexOf(open);
  const end = html.indexOf(close, start);
  return start === -1 || end === -1 ? "" : html.slice(start, end + close.length);
}

let navReference = null;
let footerReference = null;

for (const [page, html] of docs) {
  if (/\sstyle="/.test(html)) errors.push(`${page}: style="" attribute in markup`);
  if (/<style[\s>]/.test(html)) errors.push(`${page}: <style> block in markup`);

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) errors.push(`${page}: expected one <h1>, found ${h1s}`);

  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(match[0])) errors.push(`${page}: <img> without alt — ${match[0].slice(0, 80)}`);
  }

  for (const match of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;

    const [pathAndQuery, hash] = value.split("#");
    const path = pathAndQuery.split("?")[0];

    if (!path) {
      if (hash && !ids.get(page).has(hash)) errors.push(`${page}: anchor #${hash} has no target on the page`);
      continue;
    }

    if (/\.[a-z0-9]+$/i.test(path)) {
      if (!existsSync(join(root, path))) errors.push(`${page}: missing asset ${path}`);
      continue;
    }

    const target = pageForPath(path);
    if (!target) {
      errors.push(`${page}: link to missing page ${value}`);
    } else if (hash && !ids.get(target).has(hash)) {
      errors.push(`${page}: link ${value} — no #${hash} on ${target}`);
    }
  }

  /* The dark page carries the inverse treatment in its markup. */
  const nav = slice(html, '<nav class="nav_component"', "</nav>").replace(/ is-inverse/g, "");
  const footer = slice(html, '<footer class="footer_wrap"', "</footer>");
  navReference = navReference || nav;
  footerReference = footerReference || footer;
  if (nav !== navReference) errors.push(`${page}: nav markup differs from ${pages[0]}`);
  if (footer !== footerReference) errors.push(`${page}: footer markup differs from ${pages[0]}`);
}

/* ------------------------------------------------------------------- CSS */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const cssFiles = ["css/tokens.css", "css/core.css", "css/style.css"];
const css = Object.fromEntries(cssFiles.map((file) => [file, stripComments(read(file))]));

const declared = new Set();
for (const text of Object.values(css)) {
  for (const match of text.matchAll(/(--[a-z0-9_-]+)\s*:/gi)) declared.add(match[1]);
}
for (const [file, text] of Object.entries(css)) {
  for (const match of text.matchAll(/var\(\s*(--[a-z0-9_-]+)/gi)) {
    if (!declared.has(match[1])) errors.push(`${file}: var(${match[1]}) is never declared`);
  }
}

const style = css["css/style.css"];

for (const match of style.matchAll(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi)) {
  const line = style.slice(0, match.index).split("\n").length;
  errors.push(`css/style.css:${line}: literal colour ${match[0]} — use a --_color--- variable`);
}

const withoutFontFaces = style.replace(/@font-face\s*{[^}]*}/g, "");
if (/url\(/.test(withoutFontFaces)) errors.push("css/style.css: url() outside @font-face — images belong in the markup");

for (const block of style.matchAll(/([^{}]+){/g)) {
  const selector = block[1].trim();
  if (selector.startsWith("@")) continue;
  if (/(^|[\s,>+~])#[a-z]/i.test(selector)) errors.push(`css/style.css: ID selector in "${selector}"`);
}

for (const rule of style.matchAll(/([^{}]+){([^{}]*)}/g)) {
  const declarations = rule[2];
  for (const match of declarations.matchAll(/(?<![\w.-])(\d*\.?\d+)px\b/g)) {
    if (match[1] === "1") continue;
    if (/9999px/.test(match[0])) continue;
    warnings.push(`css/style.css: ${match[0]} in "${rule[1].trim().slice(0, 60)}" — dimensions are rem`);
  }
}

/* ---------------------------------------------------------------- Report */

for (const warning of warnings) console.warn("warn  " + warning);
for (const error of errors) console.error("error " + error);

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s) across ${pages.length} pages`);
  process.exit(1);
}
console.log(`✓ ${pages.length} pages checked — links, anchors, assets, markup rules and CSS variables all resolve`);
