#!/usr/bin/env node
/**
 * Generates dist/day-01/index.html ... dist/day-21/index.html from
 * content/lessons.json + src/templates/lesson.html.
 *
 * Static output only -- no server, no build-time secrets. The audio player
 * and quiz logic in the template fetch from the access-worker at RUNTIME
 * (browser-side), so this script never needs to know about Stripe/Twilio/DB.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_PATH = path.resolve(ROOT, "../../content/lessons.json");
const TEMPLATE_PATH = path.join(ROOT, "src/templates/lesson.html");
const DIST_DIR = path.join(ROOT, "dist");

// The public base URL of the deployed access-worker -- override per
// environment via WORKER_BASE_URL if not building for production.
const WORKER_BASE_URL = process.env.WORKER_BASE_URL ?? "https://pulse.quantumreadyea.org";

function main() {
  const { lessons } = JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
  const template = readFileSync(TEMPLATE_PATH, "utf-8");

  mkdirSync(DIST_DIR, { recursive: true });

  for (const lesson of lessons) {
    const dayStr = String(lesson.day).padStart(2, "0");
    const outDir = path.join(DIST_DIR, `day-${dayStr}`);
    mkdirSync(outDir, { recursive: true });

    const html = template
      .replaceAll("{{TITLE}}", escapeHtml(lesson.title))
      .replaceAll("{{DAY}}", String(lesson.day))
      .replaceAll("{{DAY_JSON}}", JSON.stringify(lesson.day))
      .replaceAll("{{HOOK}}", escapeHtml(lesson.hook))
      .replaceAll("{{ARTICLE_BODY}}", paragraphize(lesson.articleBody))
      .replaceAll("{{AUDIO_FILE}}", lesson.audioFile)
      .replaceAll("{{WORKER_BASE_URL}}", WORKER_BASE_URL);

    writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
    console.log(`[✓] Built dist/day-${dayStr}/index.html`);
  }

  // Copy static assets (css, etc.) alongside the generated pages
  const assetsSrc = path.join(ROOT, "src/assets");
  const assetsDest = path.join(DIST_DIR, "assets");
  if (existsSync(assetsSrc)) {
    cpSync(assetsSrc, assetsDest, { recursive: true });
  }

  console.log(`Done. ${lessons.length} lesson pages written to dist/.`);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function paragraphize(text) {
  return String(text)
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
}

main();
