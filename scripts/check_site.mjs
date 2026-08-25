import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

async function files(dir, ext) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) out.push(...await files(path, ext));
    else if (item.name.endsWith(ext)) out.push(path);
  }
  return out;
}

const htmlFiles = await files(root, ".html");
let checkedLinks = 0;

const homeHtml = await readFile(join(root, "index.html"), "utf8");
for (const target of ["archive.html", "news.html", "store.html", "tools.html", "generators.html", "ats-checker.html", "glossary.html"]) {
  if (!homeHtml.includes(`href="${target}"`)) errors.push(`index.html: missing top navigation shortcut ${target}`);
}
const homeSections = (homeHtml.match(/<section\b/g) || []).length;
if (homeSections !== 4) errors.push(`index.html: expected 4 concise home sections, found ${homeSections}`);
if ((homeHtml.match(/class="home-product-thumb"/g) || []).length !== 3) errors.push("index.html: expected three product cover cards");

for (const path of htmlFiles) {
  const rel = path.slice(root.length + 1);
  const html = await readFile(path, "utf8");
  for (const tag of ["html", "head", "body"]) {
    if ((html.match(new RegExp(`<${tag}[ >]`, "gi")) || []).length !== 1) errors.push(`${rel}: expected one <${tag}>`);
    if ((html.match(new RegExp(`</${tag}>`, "gi")) || []).length !== 1) errors.push(`${rel}: expected one </${tag}>`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${rel}: duplicate id ${id}`);
    seen.add(id);
  }
  if (html.includes("family=Changa")) errors.push(`${rel}: old font import remains`);
  if (html.includes("style.css?") && !html.includes("style.css?v=44")) errors.push(`${rel}: stale CSS cache version`);
  if (html.includes("main.js?") && !html.includes("main.js?v=44")) errors.push(`${rel}: stale JS cache version`);
  if (!html.includes('<meta name="theme-color" content="#2A201B">')) errors.push(`${rel}: old browser theme color remains`);
  if (html.includes('id="navLinks"') && !html.includes('id="navToggle"')) errors.push(`${rel}: mobile navigation has no toggle`);
  if (!html.includes('class="skip-link"') || !html.includes('id="main-content"')) errors.push(`${rel}: skip navigation landmark missing`);
  if (/googletagmanager\.com\/gtag|pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/.test(html)) errors.push(`${rel}: optional tracking loads before consent`);
  if (html.includes('assets/main.js?v=44') && !html.includes('assets/consent.js?v=44')) errors.push(`${rel}: consent controller missing`);
  if (/assets\/covers\/[^"'?]+\.svg/.test(html)) errors.push(`${rel}: browser-facing SVG cover remains`);
  if (/NAWAH20|couponInput|couponBtn/.test(html)) errors.push(`${rel}: misleading client-side coupon remains`);

  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(raw) || raw.includes("${") || raw.includes("'+")) continue;
    const clean = decodeURIComponent(raw.split("#")[0].split("?")[0]);
    if (!clean) continue;
    let target = clean.startsWith("/") ? join(root, clean.slice(1)) : resolve(dirname(path), clean);
    if (!extname(target)) target = join(target, "index.html");
    checkedLinks += 1;
    try { await access(target); }
    catch { errors.push(`${rel}: missing local target ${raw}`); }
  }
}

const articleFiles = (await files(join(root, "articles"), ".html"));
if (articleFiles.length !== 50) errors.push(`expected 50 articles, found ${articleFiles.length}`);
let minWords = Infinity;
let totalWords = 0;
for (const path of articleFiles) {
  const html = await readFile(path, "utf8");
  const rel = path.slice(root.length + 1);
  const guideCount = (html.match(/class="nawah-field-guide"/g) || []).length;
  if (guideCount !== 1) errors.push(`${rel}: expected one field guide, found ${guideCount}`);
  if (!html.includes('href="#field-guide"')) errors.push(`${rel}: guide missing from table of contents`);
  if (!html.includes('class="nfg-sources"')) errors.push(`${rel}: official source block missing`);
  if (!html.includes('class="nfg-deep-dive"')) errors.push(`${rel}: expanded analysis missing`);
  if (!html.includes('href="#deep-dive"')) errors.push(`${rel}: expanded analysis missing from table of contents`);
  const body = html.match(/<div class="article-body"(?: data-word-count="\d+")?>([\s\S]*?)<\/div><\/article>/)?.[1] || "";
  const text = body.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  minWords = Math.min(minWords, words);
  totalWords += words;
  if (words < 2000) errors.push(`${rel}: only ${words} words`);
  const declaredWords = Number(html.match(/class="article-body" data-word-count="(\d+)"/)?.[1] || 0);
  if (declaredWords !== words) errors.push(`${rel}: declared word count ${declaredWords} does not match ${words}`);
  if (!/⏱\s*[٠-٩0-9٬,]+\s*دقيقة قراءة معمّقة\s*·\s*[٠-٩0-9٬,]+\s*كلمة/.test(html)) errors.push(`${rel}: detailed reading time missing`);
  if (html.includes('src="https://nawahlabs.com/assets/covers/')) errors.push(`${rel}: hero cover still uses remote asset`);
  const socialCover = html.match(/<meta property="og:image" content="https:\/\/nawahlabs\.com\/assets\/covers\/([^"/]+\.png)\?v=44">/)?.[1];
  if (!socialCover) errors.push(`${rel}: PNG social preview missing`);
  else { try { await access(join(root, "assets", "covers", socialCover)); } catch { errors.push(`${rel}: missing social cover file ${socialCover}`); } }
  if (!html.includes('href="../editorial.html" rel="author">هيئة تحرير نَوَاة</a>')) errors.push(`${rel}: transparent editorial byline missing`);
  if (!html.includes('"url":"https://nawahlabs.com/editorial.html"')) errors.push(`${rel}: structured author profile missing`);
  if ((html.match(/class="ah-updated"/g) || []).length !== 1) errors.push(`${rel}: expected exactly one updated-date label`);
  for (const oldColor of ["#34D3C0", "#7B6FE0", "#34308F"]) if (html.toUpperCase().includes(oldColor)) errors.push(`${rel}: old cover color remains ${oldColor}`);
}

const css = await readFile(join(root, "assets", "style.css"), "utf8");
for (const oldColor of ["#221E66", "#34308F", "#7B6FE0", "#34D3C0", "#0E8F8F", "#168FA4", "#7BE0EE"]) {
  if (css.toUpperCase().includes(oldColor)) errors.push(`style.css: old AI palette color remains ${oldColor}`);
}
const strippedCss = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
const openBraces = (strippedCss.match(/{/g) || []).length;
const closeBraces = (strippedCss.match(/}/g) || []).length;
if (openBraces !== closeBraces) errors.push(`style.css: unbalanced braces ${openBraces}/${closeBraces}`);

const coverFiles = await files(join(root, "assets", "covers"), ".svg");
if (coverFiles.length !== 50) errors.push(`expected 50 editorial SVG covers, found ${coverFiles.length}`);
for (const path of coverFiles) {
  const svg = await readFile(path, "utf8");
  const name = path.split(/[\\/]/).pop();
  if (!svg.includes('viewBox="0 0 1200 630"') || !svg.includes('NAWAH /') || !svg.includes('<tspan')) errors.push(`${name}: new editorial cover system missing`);
  if (/linearGradient|radialGradient|font-family="[^\"]*Changa/.test(svg)) errors.push(`${name}: old cover styling remains`);
  if (/text-anchor="end"\s+direction="rtl"/.test(svg)) errors.push(`${name}: RTL cover text uses the clipped alignment`);
  try { await access(path.replace(/\.svg$/, ".png")); } catch { errors.push(`${name}: matching PNG social cover missing`); }
}

const p43 = await readFile(join(root, "articles", "p43.html"), "utf8");
if ((p43.match(/class="vt-card"/g) || []).length !== 10) errors.push("articles/p43.html: expected ten named verified tools");
if (!p43.includes("ChatGPT Free") || !p43.includes("NotebookLM") || !p43.includes("HuggingChat")) errors.push("articles/p43.html: named tool coverage incomplete");
if (!css.includes("object-fit:contain!important") || css.includes("float:right;margin:7px 0 0 12px")) errors.push("style.css: article reading layout fix missing");

const contentIndex = JSON.parse(await readFile(join(root, "assets", "article-index.json"), "utf8"));
if (contentIndex.count !== 50 || contentIndex.articles?.length !== 50) errors.push("article-index.json: expected 50 indexed articles");
if (!homeHtml.includes('class="newsletter-form"') || !homeHtml.includes('data-form-status')) errors.push("index.html: production newsletter form missing");
const contactHtml = await readFile(join(root, "contact.html"), "utf8");
for (const name of ["name", "email", "subject", "message"]) if (!contactHtml.includes(`name="${name}"`)) errors.push(`contact.html: field name ${name} missing`);
for (const required of ["store.html", "editorial.html", "checkout.html", "saved.html", "api/subscribe.js", "api/contact.js", "topics/chatgpt.html", "topics/claude.html", "topics/gemini.html", "topics/ai-tools.html", "topics/ai-business.html", "topics/learn-ai.html"]) {
  try { await access(join(root, required)); } catch { errors.push(`${required}: required improvement missing`); }
}

const archiveHtml = await readFile(join(root, "archive.html"), "utf8");
if (!archiveHtml.includes('class="archive-feature"') || !archiveHtml.includes('class="topic-directory"')) errors.push("archive.html: upgraded editorial discovery missing");
if (!css.includes(".archive-feature") || !css.includes(".topic-grid") || !css.includes(".home-product-thumb")) errors.push("style.css: v41 presentation system missing");

const storeHtml = await readFile(join(root, "store.html"), "utf8");
if ((storeHtml.match(/class="store-product(?:\s|\")/g) || []).length !== 3) errors.push("store.html: expected exactly three product showcases");
for (const slug of ["prompts-library", "six-figure-templates", "cv-templates"]) {
  if (!storeHtml.includes(`products/${slug}.html`)) errors.push(`store.html: missing product ${slug}`);
}

const toolsHtml = await readFile(join(root, "tools.html"), "utf8");
const toolCards = (toolsHtml.match(/class="tool-card"/g) || []).length;
const toolBrands = (toolsHtml.match(/<h3 data-tool-name=/g) || []).length;
if (toolCards !== 200) errors.push(`tools.html: expected 200 tool cards, found ${toolCards}`);
if (toolBrands !== toolCards) errors.push(`tools.html: expected one brand mark per tool, found ${toolBrands}/${toolCards}`);
if (!css.includes("HOME EDITORIAL FIT & TOOL BRANDS / V42") || !css.includes("CLIP-SAFE EDITORIAL MEDIA / V43") || !css.includes("COMPACT HOME JOURNEY / V44")) errors.push("style.css: compact homepage system missing");

console.log(JSON.stringify({
  htmlFiles: htmlFiles.length,
  articles: articleFiles.length,
  checkedLocalLinks: checkedLinks,
  minimumArticleWords: minWords,
  averageArticleWords: Math.round(totalWords / articleFiles.length),
  cssRulesBalanced: openBraces === closeBraces,
  errors
}, null, 2));

if (errors.length) process.exitCode = 1;
