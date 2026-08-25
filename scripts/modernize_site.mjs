import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');

async function listHtml(dir=ROOT){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')||entry.name==='node_modules'||entry.name==='outputs') continue;
    const path=join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await listHtml(path));
    else if(entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

function depthPrefix(path){
  const rel=relative(ROOT,path).replace(/\\/g,'/');
  return rel.includes('/')?'../':'';
}

function removeOptionalTracking(html){
  return html
    .replace(/\s*<!-- Google Analytics 4 -->\s*/g,'\n')
    .replace(/\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-Q1W4YR0JKX"><\/script>\s*/g,'\n')
    .replace(/\s*<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*gtag\('config', 'G-Q1W4YR0JKX'\);\s*<\/script>\s*/g,'\n')
    .replace(/\s*<!-- Google AdSense -->\s*/g,'\n')
    .replace(/\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-9743937026294029" crossorigin="anonymous"><\/script>\s*/g,'\n');
}

function modernizeForm(html){
  html=html.replace(/<form onsubmit="return subscribe\(event\)">([\s\S]*?)<\/form>/g,(whole,inside)=>{
    if(inside.includes('data-form-status')) return whole;
    inside=inside.replace(/<input([^>]*type="email"[^>]*)>/,(_,attrs)=>{
      let next=attrs;
      if(!/\bname=/.test(next)) next+=' name="email"';
      if(!/\bautocomplete=/.test(next)) next+=' autocomplete="email"';
      return `<input${next}>`;
    });
    return `<form class="newsletter-form" onsubmit="return subscribe(event)">${inside}<label class="form-hp" aria-hidden="true">اترك هذا الحقل فارغاً<input type="text" name="website" tabindex="-1" autocomplete="off"></label><p class="form-status" data-form-status role="status" aria-live="polite"></p></form>`;
  });
  return html;
}

function updateSchema(html){
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(whole,json)=>{
    try{
      const data=JSON.parse(json);
      if(data['@type']!=='Article') return whole;
      data.author={'@type':'Organization',name:'هيئة تحرير نَوَاة',url:'https://nawahlabs.com/editorial.html'};
      if(!data.dateModified||data.dateModified<'2026-08-25') data.dateModified='2026-08-25';
      data.publisher=data.publisher||{'@type':'Organization',name:'نَوَاة'};
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    }catch(e){return whole;}
  });
}

function modernize(html,path){
  const prefix=depthPrefix(path);
  const rel=relative(ROOT,path).replace(/\\/g,'/');
  html=removeOptionalTracking(html);
  if(!html.includes('class="skip-link"')) html=html.replace(/(<body[^>]*>)/,`$1\n<a class="skip-link" href="#main-content">تجاوز إلى المحتوى</a>`);
  if(!html.includes('id="main-content"')) html=html.replace(/<main(?=[\s>])/, '<main id="main-content"');
  html=html.replace(/\?v=(?:34|35|36|37|38|39|40|41|42|43)/g,'?v=44');
  html=html.replace(/((?:\.\.\/)?assets\/covers\/[^"'?]+)\.(?:svg|png)(?:\?v=\d+)?/g,'$1.png?v=44');
  html=html.replace(/(?:\.\.\/)?index\.html#store/g,match=>match.startsWith('../')?'../store.html':'store.html');
  html=html.replace(/<a href="((?:\.\.\/)?store\.html)" class="navlink">المتجر<\/a>/g,'<a href="$1" class="navlink nav-store-link">المتجر</a>');
  html=html.replace(/<nav class="nav-links" aria-label=/g,'<nav class="nav-links" id="navLinks" aria-label=');
  html=html.replace(/<div class="drawer" id="cartDrawer" role="dialog" aria-label="سلة المشتريات">/g,'<div class="drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-label="سلة المشتريات" aria-hidden="true">');
  html=html.replace(/<div class="toast" id="toast"><\/div>/g,'<div class="toast" id="toast" role="status" aria-live="polite"></div>');

  html=html.replace(/\s*<div style="font-size:\.85rem;color:var\(--muted\);margin-bottom:8px">لديك كود خصم؟[\s\S]*?<\/div>\s*<div style="display:flex;gap:8px;margin-bottom:14px">[\s\S]*?id="couponBtn">تطبيق<\/button>\s*<\/div>/g,'');
  html=html.replace(/إتمام الشراء الآمن 🔒/g,'مراجعة المنتجات والدفع');
  html=html.replace(/<div class="pay-methods"[\s\S]*?<\/div>/g,'');
  html=html.replace(/<p class="secure-note">[\s\S]*?<\/p>/g,'<p class="secure-note">ستراجع المنتجات وروابط الدفع بوضوح قبل الانتقال إلى مزود الدفع. السعر النهائي يظهر في صفحة المزود.</p>');
  html=html.replace(/واستخدم الرمز <code>NAWAH20<\/code> لخصم 20%\./g,'واطلع على العينة قبل الشراء، ثم اختر ما يخدم عملك فعلاً.');
  html=html.replace(/(?:استخدم|أدخل|جرّب) (?:الرمز |الكود )?<code>NAWAH20<\/code>[^<.]*(?:\.|)/g,'');

  html=modernizeForm(html);
  if(rel==='contact.html'){
    html=html.replace(/<form class="contact-form" onsubmit="contactSubmit\(event\)">[\s\S]*?<\/form>/,`<form class="contact-form" onsubmit="return contactSubmit(event)">
      <label><span>الاسم الكامل</span><input type="text" name="name" required minlength="2" maxlength="100" autocomplete="name"></label>
      <label><span>البريد الإلكتروني</span><input type="email" name="email" required autocomplete="email" inputmode="email"></label>
      <label><span>الموضوع</span><input type="text" name="subject" required minlength="3" maxlength="160"></label>
      <label><span>الرسالة</span><textarea name="message" required minlength="10" maxlength="6000" rows="7"></textarea></label>
      <label class="form-hp" aria-hidden="true">اترك هذا الحقل فارغاً<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-primary" type="submit">إرسال الرسالة</button>
      <p class="form-status" data-form-status role="status" aria-live="polite"></p>
    </form>`);
  }

  if(rel.startsWith('articles/')){
    html=html.replace(/https:\/\/nawahlabs\.com\/assets\/covers\/([^"']+)\.svg/g,'https://nawahlabs.com/assets/covers/$1.png');
    html=html.replace(/(https:\/\/nawahlabs\.com\/assets\/covers\/[^"'?]+\.png)(?:\?v=\d+)?/g,'$1?v=44');
    html=html.replace('<meta property="og:type" content="website">','<meta property="og:type" content="article">');
    html=html.replace(/<span class="ah-author"><span class="ah-avatar" aria-hidden="true">ن<\/span> فريق نَوَاة<\/span>/g,`<span class="ah-author"><span class="ah-avatar" aria-hidden="true">ن</span><a href="../editorial.html" rel="author">هيئة تحرير نَوَاة</a></span>`);
    html=updateSchema(html);
    const modified=html.match(/"dateModified":"([^"]+)"/)?.[1];
    if(modified){
      if(html.includes('property="article:modified_time"')) html=html.replace(/<meta property="article:modified_time" content="[^"]+">/,`<meta property="article:modified_time" content="${modified}">`);
      else html=html.replace(/(<meta property="article:published_time"[^>]+>)/,`$1\n<meta property="article:modified_time" content="${modified}">`);
      html=html.replace(/(?:<span class="ah-updated">آخر تحديث\s*)+<time datetime="[^"]+">[^<]+<\/time>(?:<\/span>)+/,`<span class="ah-updated">آخر تحديث <time datetime="${modified}">${modified}</time></span>`);
      if(!html.includes('class="ah-updated"')) html=html.replace(/<time datetime="[^"]+">[^<]+<\/time>/,`<span class="ah-updated">آخر تحديث <time datetime="${modified}">${modified}</time></span>`);
    }
    if(!html.includes('property="og:image:type"')) html=html.replace(/(<meta property="og:image:height"[^>]+>)/,`$1\n<meta property="og:image:type" content="image/png">`);
    if(!/<meta name="author"/.test(html)) html=html.replace(/(<link rel="canonical"[^>]+>)/,`$1\n<meta name="author" content="هيئة تحرير نَوَاة">`);
  }
  if(!/<meta property="og:locale"/.test(html)&&/<meta property="og:type"/.test(html)) html=html.replace(/(<meta property="og:type"[^>]+>)/,`$1\n<meta property="og:locale" content="ar_SA">`);
  const about=`<a href="${prefix}about.html">من نحن</a>`;
  if(html.includes(about)&&!html.includes(`href="${prefix}editorial.html">منهجية التحرير`)) html=html.replace(about,`${about}\n        <a href="${prefix}editorial.html">منهجية التحرير</a>`);

  html=html.replace(/<img(?![^>]*\bloading=)(?![^>]*\bfetchpriority="high")([^>]*)>/g,'<img loading="lazy" decoding="async"$1>');
  html=html.replace(/(<script src="(?:\.\.\/)?assets\/main\.js\?v=44" defer><\/script>)/,match=>html.includes('assets/consent.js?v=44')?match:`<script src="${prefix}assets/consent.js?v=44" defer></script>\n${match}`);
  if(rel==='index.html') html=html.replace(/\n<script>\s*const TM_DATA =[\s\S]*?<\/script>\s*(?=<\/body>)/,'');
  return html;
}

let changed=0;
for(const path of await listHtml()){
  const old=await readFile(path,'utf8');
  const next=modernize(old,path);
  if(next!==old){await writeFile(path,next,'utf8');changed++;}
}
console.log(`Modernized ${changed} HTML files.`);
