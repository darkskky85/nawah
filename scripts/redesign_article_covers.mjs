import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const ARTICLE_DIR=join(ROOT,'articles');
const COVER_DIR=join(ROOT,'assets','covers');

const palettes={
  tools:{bg:'#3F493B',panel:'#251C18',ink:'#FCF8EF',soft:'#CBD0C1',accent:'#D8B889',code:'TOOLS',label:'الأدوات'},
  learn:{bg:'#E8DDC8',panel:'#B8573D',ink:'#251C18',soft:'#6F665F',accent:'#9B4A35',code:'LEARN',label:'المعرفة'},
  earn:{bg:'#5B2D26',panel:'#C8B28C',ink:'#FCF8EF',soft:'#E4D5C8',accent:'#D3A36B',code:'BUILD',label:'الاقتصاد'},
  chatgpt:{bg:'#2A201B',panel:'#B8573D',ink:'#FCF8EF',soft:'#D7C9C0',accent:'#E5C08E',code:'CHAT',label:'ChatGPT'},
  claude:{bg:'#676D53',panel:'#E5DAC7',ink:'#FCF8EF',soft:'#DDE0D2',accent:'#D8B889',code:'CLAUDE',label:'Claude'},
  gemini:{bg:'#A77C3D',panel:'#3F493B',ink:'#251C18',soft:'#4F453D',accent:'#5B2D26',code:'GEMINI',label:'Gemini'},
  general:{bg:'#4A2923',panel:'#E5DAC7',ink:'#FCF8EF',soft:'#D8C8BD',accent:'#D3A36B',code:'NAWAH',label:'ملف خاص'}
};

function decode(value=''){
  return value.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function plain(value=''){
  return decode(value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}
function xml(value=''){
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function keyFor(category=''){
  if(/ChatGPT/i.test(category))return 'chatgpt';
  if(/Claude/i.test(category))return 'claude';
  if(/Gemini/i.test(category))return 'gemini';
  if(/ربح|دخل|مشروع|اقتصاد|تسويق|أعمال|ريادة/.test(category))return 'earn';
  if(/تعلم|تعلّم|تعليم|أمان|خصوصية|مستقبل/.test(category))return 'learn';
  if(/أدوات|أداة|تقنية|محتوى|كتابة/.test(category))return 'tools';
  return 'general';
}
function compact(value=''){
  return value
    .replace(/\s*\([^)]{1,70}\)\s*/g,' ')
    .replace(/\s*[—–-]\s*دليل\s+(?:شامل|كامل|عملي).*$/,'')
    .replace(/\s+/g,' ')
    .trim();
}
function units(value=''){
  return [...value].reduce((sum,ch)=>sum+(/[A-Za-z0-9]/.test(ch)?.66:/[،.:؟!]/.test(ch)?.35:1),0);
}
function wrapTitle(value,max=27,maxLines=4){
  const words=compact(value).split(' ').filter(Boolean);
  const lines=[];
  let line='';
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(line&&units(next)>max){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  if(lines.length<=maxLines)return lines;
  const kept=lines.slice(0,maxLines-1);
  let tail=lines.slice(maxLines-1).join(' ');
  while(units(tail)>max&&tail.includes(' '))tail=tail.slice(0,tail.lastIndexOf(' '));
  kept.push(`${tail}…`);
  return kept;
}
function motif(key,p,seed){
  const dx=(seed%3)*9,dy=(seed%4)*7;
  const common=`fill="none" stroke="${p.accent}" stroke-width="4" opacity=".78"`;
  if(key==='tools')return `<g transform="translate(${dx} ${dy})"><rect x="72" y="190" width="78" height="78" ${common}/><rect x="166" y="190" width="126" height="78" ${common}/><rect x="72" y="284" width="126" height="126" ${common}/><rect x="214" y="284" width="78" height="126" ${common}/><circle cx="253" cy="229" r="12" fill="${p.accent}"/></g>`;
  if(key==='learn')return `<g transform="translate(${dx} ${dy})" ${common}><circle cx="182" cy="300" r="112"/><circle cx="182" cy="300" r="76"/><path d="M70 300h224M182 188v224"/><circle cx="182" cy="300" r="13" fill="${p.accent}"/></g>`;
  if(key==='earn')return `<g transform="translate(${dx} ${dy})"><path d="M68 405h70v-82h70v-76h70v-70" ${common}/><circle cx="103" cy="405" r="9" fill="${p.accent}"/><circle cx="173" cy="323" r="9" fill="${p.accent}"/><circle cx="243" cy="247" r="9" fill="${p.accent}"/><path d="M278 177l-20 10m20-10l-4 22" ${common}/></g>`;
  if(key==='chatgpt')return `<g transform="translate(${dx} ${dy})" ${common}><path d="M72 206h196v104H148l-43 36 10-36H72z"/><path d="M108 356h184v86H181l-36 29 8-29h-45z"/><circle cx="115" cy="258" r="8" fill="${p.accent}"/><circle cx="150" cy="258" r="8" fill="${p.accent}"/><circle cx="185" cy="258" r="8" fill="${p.accent}"/></g>`;
  if(key==='claude')return `<g transform="translate(${dx} ${dy})" ${common}><rect x="78" y="178" width="198" height="270"/><path d="M112 228h128M112 270h102M112 312h128M112 354h78M112 396h116"/><path d="M78 178l34-32h198v270l-34 32" opacity=".45"/></g>`;
  if(key==='gemini')return `<g transform="translate(${dx} ${dy})" ${common}><circle cx="145" cy="275" r="88"/><circle cx="222" cy="349" r="88"/><path d="M75 420L286 198M91 214l179 194"/><circle cx="183" cy="312" r="14" fill="${p.accent}"/></g>`;
  return `<g transform="translate(${dx} ${dy})" ${common}><path d="M72 392l78-178 70 114 70-151"/><circle cx="72" cy="392" r="10" fill="${p.accent}"/><circle cx="150" cy="214" r="10" fill="${p.accent}"/><circle cx="220" cy="328" r="10" fill="${p.accent}"/><circle cx="290" cy="177" r="10" fill="${p.accent}"/></g>`;
}
function makeSvg({title,category,file,index,minutes}){
  const key=keyFor(category),p=palettes[key];
  const lines=wrapTitle(title,title.length>88?30:27,4);
  const longest=Math.max(...lines.map(units));
  const font=lines.length>=4?50:lines.length===3?57:longest>25?61:67;
  const lineHeight=Math.round(font*1.24);
  const blockHeight=(lines.length-1)*lineHeight;
  const startY=Math.round(270-blockHeight/2);
  const titleSpans=lines.map((line,i)=>`<tspan x="1100" y="${startY+i*lineHeight}">${xml(line)}</tspan>`).join('');
  const stem=file.replace(/\.html$/,'');
  const issue=/^p\d+$/.test(stem)?stem.slice(1).padStart(2,'0'):stem.toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="title desc">
  <title id="title">${xml(title)}</title><desc id="desc">غلاف تحريري من نَوَاة ضمن قسم ${xml(category)}</desc>
  <rect width="1200" height="630" fill="${p.bg}"/>
  <rect width="390" height="630" fill="${p.panel}"/>
  <rect x="390" width="9" height="630" fill="${p.accent}"/>
  <path d="M428 82H1120M428 542H1120" stroke="${p.accent}" stroke-width="1" opacity=".42"/>
  <path d="M1120 82v38M428 504v38" stroke="${p.accent}" stroke-width="3"/>
  ${motif(key,p,index)}
  <text x="58" y="70" fill="${p.accent}" font-family="Alexandria,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3">NAWAH / ${issue}</text>
  <text x="58" y="550" fill="${p.accent}" font-family="Alexandria,Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2">${p.code}</text>
  <text x="58" y="584" fill="${p.accent}" opacity=".78" font-family="Arial,'Noto Naskh Arabic',sans-serif" font-size="22" font-weight="700">${xml(p.label)}</text>
  <text x="335" y="505" text-anchor="end" fill="${p.accent}" opacity=".2" font-family="Alexandria,Arial,sans-serif" font-size="158" font-weight="800">${issue}</text>
  <text x="1100" y="124" text-anchor="start" direction="rtl" unicode-bidi="embed" fill="${p.accent}" font-family="Arial,'Noto Naskh Arabic',sans-serif" font-size="25" font-weight="700">${xml(category)}</text>
  <text text-anchor="start" direction="rtl" unicode-bidi="embed" fill="${p.ink}" font-family="Arial,'Noto Naskh Arabic',sans-serif" font-size="${font}" font-weight="800">${titleSpans}</text>
  <text x="1100" y="580" text-anchor="start" direction="rtl" unicode-bidi="embed" fill="${p.soft}" font-family="Arial,'Noto Naskh Arabic',sans-serif" font-size="22" font-weight="600">${minutes.toLocaleString('ar-SA')} دقيقة قراءة معمّقة</text>
  <text x="428" y="580" fill="${p.soft}" font-family="Alexandria,Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="2">NAWAHLABS.COM</text>
  <circle cx="406" cy="82" r="6" fill="${p.accent}"/><circle cx="406" cy="542" r="6" fill="${p.accent}"/>
</svg>\n`;
}

const files=(await readdir(ARTICLE_DIR)).filter(name=>name.endsWith('.html')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
let written=0;
for(const [i,file] of files.entries()){
  const html=await readFile(join(ARTICLE_DIR,file),'utf8');
  const title=plain(html.match(/<h1 class="ah-title">([\s\S]*?)<\/h1>/)?.[1]||'');
  const category=plain(html.match(/<span class="ah-cat">([\s\S]*?)<\/span>/)?.[1]||'مقالات نَوَاة');
  const words=Number(html.match(/data-word-count="(\d+)"/)?.[1]||0);
  const minutes=Math.max(1,Math.ceil(words/155));
  const cover=file.replace(/\.html$/,'.svg');
  await writeFile(join(COVER_DIR,cover),makeSvg({title,category,file,index:i+1,minutes}),'utf8');
  written+=1;
}
console.log(`Redesigned ${written} editorial article covers.`);
