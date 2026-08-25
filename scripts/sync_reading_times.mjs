import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const articleDir = join(root, "articles");
const format = new Intl.NumberFormat("ar-SA");
const reading = new Map();

const articleNames = (await readdir(articleDir)).filter(name => name.endsWith(".html"));
for (const name of articleNames) {
  const path = join(articleDir, name);
  let html = await readFile(path, "utf8");
  const body = html.match(/<div class="article-body"(?: data-word-count="\d+")?>([\s\S]*?)<\/div><\/article>/)?.[1] || "";
  const text = body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  const minutes = Math.max(10, Math.ceil(words / 155));
  const slug = name.replace(/\.html$/, "");
  const fullLabel = `⏱ ${format.format(minutes)} دقيقة قراءة معمّقة · ${format.format(words)} كلمة`;
  const cardLabel = `${format.format(minutes)} دقيقة · ${format.format(words)} كلمة`;
  reading.set(slug, { words, minutes, fullLabel, cardLabel });

  html = html.replace(/<div class="article-body"(?: data-word-count="\d+")?>/, `<div class="article-body" data-word-count="${words}">`);
  html = html.replace(/⏱\s*[^<]*?(?:دقائق|دقيقة)\s+قراءة(?:\s+معمّقة)?(?:\s*·\s*[^<]*?كلمة)?/g, fullLabel);
  await writeFile(path, html, "utf8");
}

const archivePath = join(root, "archive.html");
let archive = await readFile(archivePath, "utf8");
archive = archive.replace(/<div class="card-meta"><span>[^<]*<\/span><a class="read-link" href="articles\/([^"/]+)\.html"/g, (match, slug) => {
  const item = reading.get(slug);
  if (!item) return match;
  return `<div class="card-meta"><span>${item.cardLabel}</span><a class="read-link" href="articles/${slug}.html"`;
});
await writeFile(archivePath, archive, "utf8");

const homePath = join(root, "index.html");
let home = await readFile(homePath, "utf8");
const p17 = reading.get("p17");
const p47 = reading.get("p47");
if (p17) home = home.replace(/<div class="home-cover-foot"><span>[^<]*<\/span>/, `<div class="home-cover-foot"><span>${p17.cardLabel}</span>`);
if (p47) home = home.replace(/<small>الرؤية القادمة · [^<]*<\/small>/, `<small>الرؤية القادمة · ${p47.cardLabel}</small>`);
await writeFile(homePath, home, "utf8");

console.log(`Synced reading time for ${reading.size} articles at 155 words per minute.`);
