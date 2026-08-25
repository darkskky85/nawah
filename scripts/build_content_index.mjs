import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const SITE='https://nawahlabs.com';

function decode(value=''){
  return value.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n));
}
function text(value=''){
  return decode(value.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}
function attr(html,name){return decode(html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`,'i'))?.[1]||'');}
function canonical(html){return html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]||'';}
function schema(html,type){
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{const data=JSON.parse(match[1]);if(data['@type']===type)return data;}catch(e){}
  }
  return {};
}
function xml(value=''){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}

const articleFiles=(await readdir(join(ROOT,'articles'))).filter(x=>x.endsWith('.html')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const articles=[];
for(const file of articleFiles){
  const html=await readFile(join(ROOT,'articles',file),'utf8');
  const articleSchema=schema(html,'Article');
  const body=html.match(/<div class="article-body"[^>]*>([\s\S]*?)<div class="ad-slot side-ad"/)?.[1]||html.match(/<div class="article-body"[^>]*>([\s\S]*?)<\/article>/)?.[1]||'';
  const plain=text(body.replace(/<nav class="toc"[\s\S]*?<\/nav>/,'').replace(/<div class="share-bar"[\s\S]*?<\/div>/,''));
  const title=text(html.match(/<h1 class="ah-title">([\s\S]*?)<\/h1>/)?.[1]||articleSchema.headline||'');
  const description=attr(html,'description')||articleSchema.description||'';
  const section=text(html.match(/<span class="ah-cat">([\s\S]*?)<\/span>/)?.[1]||articleSchema.articleSection||'مقالات');
  const declared=Number(html.match(/data-word-count="(\d+)"/)?.[1]||0);
  const words=declared||plain.split(/\s+/).filter(Boolean).length;
  articles.push({
    t:title,d:description,sub:section,type:'مقال',u:`articles/${file}`,
    published:articleSchema.datePublished||'',modified:articleSchema.dateModified||articleSchema.datePublished||'',
    words,minutes:Math.max(1,Math.ceil(words/155)),
    h:plain.slice(0,4200),k:`${title} ${section} ${description}`
  });
}
await writeFile(join(ROOT,'assets','article-index.json'),JSON.stringify({version:1,generatedAt:new Date().toISOString(),count:articles.length,articles}), 'utf8');

async function listHtml(dir=ROOT){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')||['node_modules','scripts','api'].includes(entry.name))continue;
    const p=join(dir,entry.name);
    if(entry.isDirectory())out.push(...await listHtml(p));else if(entry.name.endsWith('.html'))out.push(p);
  }
  return out;
}
const urls=[];
for(const file of await listHtml()){
  const html=await readFile(file,'utf8');
  if(/<meta name="robots" content="[^"]*noindex/i.test(html))continue;
  const loc=canonical(html);if(!loc||!loc.startsWith(SITE))continue;
  const rel=relative(ROOT,file).replace(/\\/g,'/');
  const s=schema(html,'Article');
  const info=await stat(file);
  const lastmod=s.dateModified||s.datePublished||info.mtime.toISOString().slice(0,10);
  const changefreq=rel==='news.html'?'hourly':rel==='index.html'||rel==='archive.html'?'weekly':'monthly';
  const priority=rel==='index.html'?'1.0':rel.startsWith('articles/')?'0.8':['archive.html','tools.html','generators.html','ats-checker.html','glossary.html'].includes(rel)?'0.9':'0.7';
  urls.push({loc,lastmod,changefreq,priority});
}
urls.sort((a,b)=>a.loc.localeCompare(b.loc));
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${xml(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(join(ROOT,'sitemap.xml'),sitemap,'utf8');
console.log(`Indexed ${articles.length} articles and generated ${urls.length} sitemap entries.`);
