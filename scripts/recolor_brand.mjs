import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const coverDir = join(root, "assets", "covers");
const palette = new Map([
  ["#34D3C0", "#7A8061"],
  ["#7B6FE0", "#B8573D"],
  ["#D98E2B", "#A77C3D"],
  ["#F0B45E", "#C99563"],
  ["#FFC107", "#D0A15B"],
  ["#FBFAF6", "#FCF8EF"],
  ["#221E66", "#251C18"],
  ["#FFFFFF", "#FCF8EF"],
  ["#0E8F8F", "#676D53"],
  ["#34308F", "#5B2D26"]
]);

const targets = (await readdir(coverDir)).filter(name => name.endsWith(".svg")).map(name => join(coverDir, name));
targets.push(join(root, "assets", "favicon.svg"));

let changed = 0;
for (const path of targets) {
  let svg = await readFile(path, "utf8");
  const before = svg;
  for (const [from, to] of palette) svg = svg.replaceAll(from, to).replaceAll(from.toLowerCase(), to);
  if (svg !== before) {
    await writeFile(path, svg, "utf8");
    changed += 1;
  }
}
console.log(`Recolored ${changed} SVG assets.`);

const cssPath = join(root, "assets", "style.css");
const cssPalette = new Map([
  ["#F4F2EC", "#F1EBDD"], ["#FFFEFB", "#FCF8EF"], ["#111827", "#251C18"], ["#657084", "#6F665F"],
  ["#221E66", "#251C18"], ["#34308F", "#5B2D26"], ["#7B6FE0", "#B8573D"], ["#14366F", "#5B2D26"],
  ["#193E7C", "#5B2D26"], ["#102D58", "#4A2923"], ["#102B55", "#4A2923"], ["#0A1834", "#35241F"],
  ["#0B1D3C", "#3B2A24"], ["#07142D", "#2A201B"], ["#07101F", "#2A201B"], ["#061126", "#211915"],
  ["#0C1424", "#1D1815"], ["#121D30", "#28211D"], ["#0F1929", "#241E1A"], ["#17253A", "#332A24"],
  ["#0E8F8F", "#B8573D"], ["#168FA4", "#B8573D"], ["#116D85", "#8F4938"], ["#0B6B6B", "#676D53"],
  ["#34D3C0", "#7A8061"], ["#7BE0EE", "#D3A36B"], ["#A7E9F0", "#E0C39A"], ["#57C6D8", "#C76E50"],
  ["#2BAFC1", "#B8573D"], ["#69D6A1", "#9BA17D"], ["#D98E2B", "#A77C3D"], ["#C9A45C", "#A77C3D"],
  ["#D9BE82", "#D3A36B"], ["#D7B873", "#C76E50"], ["#E6F3F4", "#E9D7CA"], ["#142F38", "#3B2922"],
  ["#B9C6D9", "#C9BEB2"], ["#8796AD", "#A99B91"], ["#94A5BC", "#B7A89D"], ["#ACB9CC", "#BDAFA5"]
]);
let css = await readFile(cssPath, "utf8");
for (const [from, to] of cssPalette) css = css.replaceAll(from, to).replaceAll(from.toLowerCase(), to);
await writeFile(cssPath, css, "utf8");
console.log("Recolored the global stylesheet.");
