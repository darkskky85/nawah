import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const PAGE=join(ROOT,'tools.html');
const OUT=join(ROOT,'assets','tool-logos');
const original=await readFile(PAGE,'utf8');
const lines=original.split(/\r?\n/);
const tools=[];

for(const line of lines){
  if(!line.includes('class="tool-card"')) continue;
  const name=line.match(/<h3[^>]*data-tool-name="([^"]+)"/)?.[1]||line.match(/<h3>(?:<img[^>]+>)?<span>([^<]+)<\/span><\/h3>/)?.[1]||line.match(/<h3>([^<]+)<\/h3>/)?.[1];
  const href=line.match(/class="t-visit" href="([^"]+)"/)?.[1];
  if(!name||!href) continue;
  try{
    const host=new URL(href).hostname.toLowerCase().replace(/^www\./,'');
    const file=`${host.replace(/[^a-z0-9.-]+/g,'-')}.png`;
    tools.push({name,host,file});
  }catch{}
}

await mkdir(OUT,{recursive:true});
const unique=[...new Map(tools.map(tool=>[tool.file,tool])).values()];
const officialOverrides=new Map([
  ['aider.chat','https://aider.chat/assets/logo.svg'],
  ['phind.com','https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/phind/default.svg']
]);
let downloaded=0, failed=0;
let cursor=0;

async function worker(){
  while(cursor<unique.length){
    const tool=unique[cursor++];
    const target=join(OUT,tool.file);
    const icoTarget=target.replace(/\.png$/,'.ico');
    const svgTarget=target.replace(/\.png$/,'.svg');
    try{await access(target);continue;}catch{}
    try{await access(icoTarget);continue;}catch{}
    try{await access(svgTarget);continue;}catch{}
    try{
      if(officialOverrides.has(tool.host)){
        const official=await fetch(officialOverrides.get(tool.host),{headers:{'user-agent':'Mozilla/5.0'}});
        if(!official.ok) throw new Error(`official logo HTTP ${official.status}`);
        const bytes=Buffer.from(await official.arrayBuffer());
        if(bytes.length<100) throw new Error('empty official logo');
        await writeFile(svgTarget,bytes);
        downloaded++;
        continue;
      }
      const lookupHost=tool.host==='phind.com'?'www.phind.com':tool.host;
      const url=`https://www.google.com/s2/favicons?domain=${encodeURIComponent(lookupHost)}&sz=128`;
      const response=await fetch(url,{headers:{'user-agent':'NawahLabs/1.0'}});
      if(response.ok){
        const bytes=Buffer.from(await response.arrayBuffer());
        if(bytes.length<100) throw new Error('empty image');
        await writeFile(target,bytes);
      }else{
        const fallback=await fetch(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(lookupHost)}.ico`,{headers:{'user-agent':'NawahLabs/1.0'}});
        let source=fallback.ok?fallback:await fetch(`https://${lookupHost}/favicon.ico`,{headers:{'user-agent':'Mozilla/5.0'}});
        let output=icoTarget;
        if(!source.ok){
          const page=await fetch(`https://${lookupHost}/`,{headers:{'user-agent':'Mozilla/5.0'}});
          if(!page.ok) throw new Error(`HTTP ${response.status}/${fallback.status}/${source.status}/${page.status}`);
          const markup=await page.text();
          const tag=markup.match(/<link\b[^>]*\brel=["'][^"']*icon[^"']*["'][^>]*>/i)?.[0];
          const href=tag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
          if(!href) throw new Error('official icon link missing');
          source=await fetch(new URL(href,page.url),{headers:{'user-agent':'Mozilla/5.0'}});
          if(!source.ok) throw new Error(`official icon HTTP ${source.status}`);
          if(/svg/i.test(source.headers.get('content-type')||href)) output=svgTarget;
          else if(/png/i.test(source.headers.get('content-type')||href)) output=target;
        }
        const bytes=Buffer.from(await source.arrayBuffer());
        if(bytes.length<100) throw new Error('empty fallback image');
        await writeFile(output,bytes);
      }
      downloaded++;
    }catch(error){failed++;console.error(`${tool.host}: ${error.message}`);}
  }
}

await Promise.all(Array.from({length:12},()=>worker()));
const actual=new Map();
for(const tool of unique){
  try{await access(join(OUT,tool.file));actual.set(tool.file,tool.file);continue;}catch{}
  const ico=tool.file.replace(/\.png$/,'.ico');
  try{await access(join(OUT,ico));actual.set(tool.file,ico);continue;}catch{}
  const svg=tool.file.replace(/\.png$/,'.svg');
  try{await access(join(OUT,svg));actual.set(tool.file,svg);}catch{}
}
const lookup=new Map(tools.map(tool=>[tool.name,actual.get(tool.file)]));
const next=lines.map(line=>{
  if(!line.includes('class="tool-card"')) return line;
  const currentName=line.match(/<h3[^>]*data-tool-name="([^"]+)"/)?.[1]||line.match(/<h3>(?:<img[^>]+>)?<span>([^<]+)<\/span><\/h3>/)?.[1]||line.match(/<h3>([^<]+)<\/h3>/)?.[1];
  const file=lookup.get(currentName);
  const initial=[...currentName][0]?.toUpperCase()||'•';
  const heading=file?`<h3 data-tool-name="${currentName}"><img class="tool-logo" src="assets/tool-logos/${file}" width="40" height="40" loading="lazy" decoding="async" alt="" aria-hidden="true"><span>${currentName}</span></h3>`:`<h3 data-tool-name="${currentName}"><span class="tool-logo tool-logo-fallback" aria-hidden="true">${initial}</span><span>${currentName}</span></h3>`;
  return line.replace(/<h3[^>]*>[\s\S]*?<\/h3>/,heading);
}).join('\n');

await writeFile(PAGE,next,'utf8');
console.log(`Tool logos: ${tools.length} cards, ${unique.length} hosts, ${downloaded} downloaded, ${failed} failed.`);
