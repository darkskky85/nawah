/* نَوَاة — عامل الخدمة (PWA) v2 */
const CACHE='nawah-v2';
const CORE=['index.html','archive.html','assets/style.css','assets/main.js','assets/data.js','assets/icon-192.png','manifest.json'];

/* مسارات تُجلب من الشبكة دائماً (الأخبار + بياناتها) كي لا تظهر نسخة قديمة */
const NETWORK_FIRST=['news.html','news-data.js','feed.xml'];
function isNetworkFirst(url){return NETWORK_FIRST.some(p=>url.pathname.includes(p));}

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin){return}

  /* الأخبار وبياناتها: الشبكة أولاً، والكاش احتياطي فقط عند انقطاع الاتصال */
  if(isNetworkFirst(u)){
    e.respondWith(
      fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r})
        .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html')))
    );
    return;
  }

  /* التنقّل بين الصفحات: الشبكة أولاً */
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
  } else {
    /* الملفات الثابتة: الكاش أولاً للسرعة */
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res})));
  }
});
