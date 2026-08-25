/* نَوَاة — السكربت الموحد للموقع متعدد الصفحات */
const R = window.NAWAH_ROOT || "";
const $ = s => document.querySelector(s);
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* الرسائل المنبثقة */
let toastTimer;
function showToast(msg){
  const t = $('#toast'); if(!t) return;
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(()=> t.style.display='none', 3200);
}
window.showToast = showToast;

/* قياس سلوك مفيد من دون كسر التجربة عند رفض القياس */
function trackEvent(name, params={}){
  try{
    if(typeof window.gtag === 'function') window.gtag('event', name, params);
  }catch(e){}
}
window.nawahTrack = trackEvent;

/* بطاقة ملف المحرر: ميل ورقي هادئ يتبع المؤشر من دون إزعاج الجوال */
(function(){
  const stage=document.querySelector('.home-cover-stage');
  const cover=stage?.querySelector('.home-cover-story');
  if(!stage||!cover||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(pointer: coarse)').matches) return;
  let frame=0;
  const reset=()=>{
    cover.style.setProperty('--cover-rx','0deg');
    cover.style.setProperty('--cover-ry','0deg');
    cover.style.setProperty('--mark-x','0px');
    cover.style.setProperty('--mark-y','0px');
    cover.style.setProperty('--copy-x','0px');
    cover.style.setProperty('--copy-y','0px');
  };
  stage.addEventListener('pointermove',event=>{
    const rect=stage.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width-.5;
    const y=(event.clientY-rect.top)/rect.height-.5;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      cover.style.setProperty('--cover-rx',`${(-y*4).toFixed(2)}deg`);
      cover.style.setProperty('--cover-ry',`${(x*5).toFixed(2)}deg`);
      cover.style.setProperty('--mark-x',`${(-x*14).toFixed(1)}px`);
      cover.style.setProperty('--mark-y',`${(-y*11).toFixed(1)}px`);
      cover.style.setProperty('--copy-x',`${(x*4).toFixed(1)}px`);
      cover.style.setProperty('--copy-y',`${(y*3).toFixed(1)}px`);
    });
  },{passive:true});
  stage.addEventListener('pointerleave',reset,{passive:true});
  cover.addEventListener('blur',reset);
})();

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g, ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);
}

function normalizeArabic(value=''){
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
    .replace(/[إأآٱ]/g,'ا')
    .replace(/ؤ/g,'و')
    .replace(/ئ/g,'ي')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

/* الوضع الليلي */
(function(){
  const saved = store.get('theme');
  if(saved === 'dark'){ document.documentElement.setAttribute('data-theme','dark'); }
  const btn = $('#themeBtn'); if(!btn) return;
  const sync = ()=> btn.textContent = document.documentElement.getAttribute('data-theme')==='dark' ? '☀' : '☾';
  sync();
  btn.addEventListener('click', ()=>{
    const dark = document.documentElement.getAttribute('data-theme')==='dark';
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    store.set('theme', dark ? 'light' : 'dark'); sync();
  });
})();

/* شريط التقدم + زر الأعلى */
(function(){
  const top = document.createElement('button');
  top.id='toTop'; top.textContent='↑'; top.setAttribute('aria-label','العودة إلى أعلى الصفحة');
  top.onclick = ()=> window.scrollTo({top:0, behavior:'smooth'});
  document.body.appendChild(top);
  window.addEventListener('scroll', ()=>{
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    const bar = $('#progress'); if(bar) bar.style.width = p + '%';
    top.classList.toggle('show', window.scrollY > 500);
  }, {passive:true});
})();

/* بحث عربي متسامح مع الهمزات والتشكيل والأخطاء الجزئية */
(function(){
  const inp = $('#siteSearch'), box = $('#searchResults');
  if(!inp || !box) return;
  let items = typeof SEARCH_INDEX === 'undefined' ? [] : SEARCH_INDEX.map(i=>({...i}));
  let loaded = false, active = -1, reportTimer;

  async function loadFullIndex(){
    if(loaded) return;
    loaded = true;
    try{
      const res = await fetch(`${R}assets/article-index.json?v=44`, {cache:'force-cache'});
      if(!res.ok) return;
      const data = await res.json();
      const byUrl = new Map(items.map(i=>[i.u,i]));
      (data.articles||[]).forEach(i=>byUrl.set(i.u, {...byUrl.get(i.u), ...i}));
      items = [...byUrl.values()];
    }catch(e){}
  }

  function scoreItem(item, raw){
    const q = normalizeArabic(raw);
    const tokens = q.split(' ').filter(Boolean);
    const title = normalizeArabic(item.t||'');
    const sub = normalizeArabic(item.sub||'');
    const text = normalizeArabic(`${item.k||''} ${item.d||''} ${item.h||''}`);
    let score = 0;
    if(title===q) score += 120;
    if(title.startsWith(q)) score += 70;
    if(title.includes(q)) score += 48;
    if(sub.includes(q)) score += 24;
    if(text.includes(q)) score += 18;
    for(const token of tokens){
      if(title.includes(token)) score += 14;
      else if(text.includes(token)) score += 5;
      else return 0;
    }
    return score;
  }

  function setActive(next){
    const links = [...box.querySelectorAll('[role="option"]')];
    if(!links.length){ active=-1; inp.removeAttribute('aria-activedescendant'); return; }
    active = (next + links.length) % links.length;
    links.forEach((a,i)=>a.classList.toggle('is-active', i===active));
    inp.setAttribute('aria-activedescendant', links[active].id);
  }

  function render(){
    const raw = inp.value.trim();
    if(raw.length < 2){ box.classList.remove('open'); box.innerHTML=''; return; }
    const hits = items.map(item=>({item,score:scoreItem(item,raw)}))
      .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.item);
    active = -1;
    box.innerHTML = hits.length ? hits.map((h,i)=>
      `<a id="search-option-${i}" role="option" href="${R}${escapeHtml(h.u)}"><span class="sr-type">${escapeHtml(h.type||'مقال')} · ${escapeHtml(h.sub||'نَوَاة')}</span><strong>${escapeHtml(h.t)}</strong>${h.d?`<small>${escapeHtml(h.d)}</small>`:''}</a>`
    ).join('') : `<div class="sr-empty">لم نجد نتيجة لـ«${escapeHtml(raw)}». جرّب كلمة أقصر مثل «سيرة» أو «Claude».</div>`;
    box.classList.add('open');
    clearTimeout(reportTimer);
    reportTimer=setTimeout(()=>trackEvent(hits.length?'search':'search_no_results',{search_term:raw,results:hits.length}),650);
  }

  inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-controls','searchResults');
  inp.addEventListener('focus', ()=>loadFullIndex().then(()=>{ if(inp.value.trim().length>1) render(); }));
  inp.addEventListener('input', render);
  inp.addEventListener('keydown', e=>{
    if(!box.classList.contains('open')) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); setActive(active+1); }
    if(e.key==='ArrowUp'){ e.preventDefault(); setActive(active-1); }
    if(e.key==='Enter' && active>=0){ e.preventDefault(); box.querySelectorAll('[role="option"]')[active].click(); }
    if(e.key==='Escape'){ box.classList.remove('open'); inp.removeAttribute('aria-activedescendant'); }
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('.search-box')) box.classList.remove('open'); });
})();

/* السلة */
let cart = store.get('cart') || [];
function saveCart(){ store.set('cart', cart); }
function addToCart(id){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  if(!cart.find(x=>x.id===id)){ cart.push({id:p.id, name:p.name, icon:p.icon, price:p.price}); saveCart(); renderCart(); }
  trackEvent('add_to_cart',{currency:'SAR',value:p.price,items:[{item_id:String(p.id),item_name:p.name,price:p.price}]});
  showToast(`✅ أُضيف «${p.name}» إلى السلة`);
}
function removeFromCart(id){ cart = cart.filter(x=>x.id!==id); saveCart(); renderCart(); trackEvent('remove_from_cart',{item_id:String(id)}); }
window.addToCart = addToCart; window.removeFromCart = removeFromCart;
function renderCart(){
  const count = $('#cartCount'); if(count) count.textContent = cart.length;
  const box = $('#cartItems'), foot = $('#cartFooter');
  if(!box) return;
  if(!cart.length){ box.innerHTML = '<p class="empty-cart">سلتك فارغة بعد.<br>تصفّح المتجر واختر ما يناسب رحلتك 🛍️</p>'; foot.style.display='none'; return; }
  box.innerHTML = cart.map(p=>`<div class="cart-item"><span>${p.icon} ${p.name}</span><span style="display:flex;gap:10px;align-items:center"><strong>${p.price.toLocaleString('ar-SA')} ر.س</strong><button onclick="removeFromCart(${p.id})" aria-label="إزالة من السلة">🗑</button></span></div>`).join('');
  const sum = cart.reduce((s,p)=>s+p.price,0);
  $('#cartTotal').textContent = `${sum.toLocaleString('ar-SA')} ر.س`;
  foot.style.display = 'block';
}
(function(){
  const d = $('#cartDrawer'); if(!d) return;
  const openBtn=$('#cartBtn'), closeBtn=$('#cartClose'), panel=d.querySelector('.drawer-panel');
  let lastFocus=null;
  function openDrawer(){ lastFocus=document.activeElement; d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.classList.add('drawer-lock'); setTimeout(()=>closeBtn&&closeBtn.focus(),0); }
  function closeDrawer(){ d.classList.remove('open'); d.setAttribute('aria-hidden','true'); document.body.classList.remove('drawer-lock'); if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  if(openBtn) openBtn.addEventListener('click', openDrawer);
  if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
  d.addEventListener('click', e=>{ if(e.target.id==='cartDrawer') closeDrawer(); });
  d.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ closeDrawer(); return; }
    if(e.key!=='Tab' || !panel) return;
    const focusable=[...panel.querySelectorAll('button,a[href],input:not([disabled])')].filter(x=>x.offsetParent!==null);
    if(!focusable.length) return;
    const first=focusable[0], last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
  });
  $('#checkoutBtn').addEventListener('click', ()=>{
    if(!cart.length) return;
    trackEvent('begin_checkout',{currency:'SAR',value:cart.reduce((s,p)=>s+p.price,0),items:cart.map(p=>({item_id:String(p.id),item_name:p.name,price:p.price}))});
    location.href=R+'checkout.html';
  });
  renderCart();
})();

/* شبكة المنتجات في الرئيسية */
(function(){
  const g = $('#productsGrid'); if(!g || typeof PRODUCTS === 'undefined') return;
  const order = [...PRODUCTS].sort((a,b)=> (b.available?1:0)-(a.available?1:0) || a.id-b.id);
  g.innerHTML = order.map(p=>`
    <div class="product${p.available?' is-available':''}">
      ${p.available?'<span class="prod-badge avail">✅ متوفر الآن</span>':'<span class="prod-badge soon">🆕 قريباً</span>'}
      <div class="prod-icon" aria-hidden="true">${p.icon}</div>
      <div class="ptype">${p.type}</div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <ul class="prod-feats">${(p.feats||[]).slice(0,3).map(f=>`<li>${f}</li>`).join('')}</ul>
      <div class="price-row">
        <div class="price">${p.price.toLocaleString('ar-SA')} <small>ر.س</small></div>
        <a class="prod-link" href="${R}products/${p.slug}.html">التفاصيل ←</a>
      </div>
      <div class="prod-actions">
        ${p.available
          ? `<button class="add-btn" onclick="buyNow(${p.id})">اشترِ الآن</button><button class="cart-add" onclick="addToCart(${p.id})" aria-label="أضف للسلة">🛒</button>`
          : `<a class="add-btn ghost" href="${R}products/${p.slug}.html">اعرف المزيد</a>`}
      </div>
    </div>`).join('');
})();

/* اكتشاف الأرشيف: موضوع + بحث عربي + مدة قراءة */
(function(){
  const grid = $('#archiveGrid'); if(!grid) return;
  const cards = [...grid.querySelectorAll('.post-card')];
  const chips = [...document.querySelectorAll('#archiveCats .cat-chip')];
  const cats=$('#archiveCats');
  const controls=document.createElement('div'); controls.className='archive-discovery';
  controls.innerHTML='<label><span>ابحث داخل الخمسين مقالاً</span><input type="search" id="archiveQuery" placeholder="مثال: سيرة، أتمتة، Claude" autocomplete="off"></label><label><span>مدة القراءة</span><select id="archiveDuration"><option value="all">كل المدد</option><option value="quick">حتى 16 دقيقة</option><option value="deep">17 دقيقة فأكثر</option></select></label><label><span>ترتيب النتائج</span><select id="archiveSort"><option value="editorial">ترتيب المحرر</option><option value="shortest">الأقصر أولاً</option><option value="deepest">الأعمق أولاً</option><option value="title">حسب العنوان</option></select></label><p id="archiveCount" aria-live="polite"></p>';
  cats?.insertAdjacentElement('beforebegin',controls);
  const query=controls.querySelector('#archiveQuery'), duration=controls.querySelector('#archiveDuration'), sort=controls.querySelector('#archiveSort'), count=controls.querySelector('#archiveCount');
  const arabicDigits='٠١٢٣٤٥٦٧٨٩';
  const minuteOf=card=>{const raw=card.querySelector('.card-meta span')?.textContent||'';const n=raw.match(/[٠-٩0-9]+/)?.[0]||'0';return Number([...n].map(ch=>arabicDigits.includes(ch)?arabicDigits.indexOf(ch):ch).join(''));};
  const collator=new Intl.Collator('ar',{sensitivity:'base'});
  cards.forEach((card,index)=>card.dataset.archiveOrder=String(index));
  const state={cat:'الكل',q:'',duration:'all',sort:'editorial'};
  function apply(){
    const ordered=[...cards].sort((a,b)=>{
      if(state.sort==='shortest') return minuteOf(a)-minuteOf(b);
      if(state.sort==='deepest') return minuteOf(b)-minuteOf(a);
      if(state.sort==='title') return collator.compare(a.querySelector('h3')?.textContent||'',b.querySelector('h3')?.textContent||'');
      return Number(a.dataset.archiveOrder)-Number(b.dataset.archiveOrder);
    });
    ordered.forEach(card=>grid.appendChild(card));
    chips.forEach(b=>b.classList.toggle('on', b.dataset.cat===state.cat));
    let shown=0;
    cards.forEach(c=>{
      const minutes=minuteOf(c), copy=normalizeArabic(c.textContent);
      const visible=(state.cat==='الكل'||c.dataset.cat===state.cat)&&(!state.q||copy.includes(normalizeArabic(state.q)))&&(state.duration==='all'||(state.duration==='quick'?minutes<=16:minutes>=17));
      c.style.display=visible?'':'none'; if(visible) shown++;
    });
    count.textContent=`${shown.toLocaleString('ar-SA')} نتيجة من ${cards.length.toLocaleString('ar-SA')}`;
  }
  chips.forEach(b=>b.addEventListener('click', ()=>{state.cat=b.dataset.cat;apply();trackEvent('archive_filter',{category:state.cat});}));
  query.addEventListener('input',()=>{state.q=query.value.trim();apply();});
  duration.addEventListener('change',()=>{state.duration=duration.value;apply();trackEvent('archive_filter',{duration:state.duration});});
  sort.addEventListener('change',()=>{state.sort=sort.value;apply();trackEvent('archive_sort',{sort:state.sort});});
  const cat = new URLSearchParams(location.search).get('cat');
  if(cat && chips.some(b=>b.dataset.cat===cat)) state.cat=cat;
  apply();
})();

/* فلترة الأدوات */
(function(){
  const grid = $('#toolsGrid'); if(!grid) return;
  document.querySelectorAll('#toolCats .cat-chip').forEach(b=>b.addEventListener('click', ()=>{
    document.querySelectorAll('#toolCats .cat-chip').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    grid.querySelectorAll('.tool-card').forEach(c=>c.style.display = (b.dataset.cat==='الكل'||c.dataset.cat===b.dataset.cat)?'':'none');
  }));
})();


/* الشراء المباشر عبر رابط الدفع */
window.buyNow = function(id){
  const link = (typeof PAYMENTS!=='undefined') && PAYMENTS[id];
  const p = typeof PRODUCTS!=='undefined' && PRODUCTS.find(x=>x.id===id);
  if(link){ trackEvent('begin_checkout',{currency:'SAR',value:p?.price||0,items:p?[{item_id:String(id),item_name:p.name,price:p.price}]:[]}); window.open(link, '_blank','noopener'); return; }
  addToCart(id);
  document.getElementById('cartBtn')?.click();
};

/* نماذج حقيقية: لا تظهر رسالة نجاح إلا بعد قبول الخادم */
async function submitSiteForm(form, endpoint, successMessage, eventName){
  const button=form.querySelector('[type="submit"]');
  let status=form.querySelector('[data-form-status]');
  if(!status){ status=document.createElement('p'); status.className='form-status'; status.dataset.formStatus=''; status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); form.appendChild(status); }
  const original=button?.textContent;
  if(button){ button.disabled=true; button.textContent='جارٍ الإرسال…'; }
  status.className='form-status is-loading'; status.textContent='جارٍ الإرسال…';
  const payload=Object.fromEntries(new FormData(form).entries());
  payload.source=location.pathname;
  try{
    const res=await fetch(`${R}api/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let data={}; try{ data=await res.json(); }catch(e){}
    if(!res.ok) throw new Error(data.message||'تعذّر الإرسال الآن. جرّب مرة أخرى أو تواصل معنا بالبريد.');
    form.reset(); status.className='form-status is-success'; status.textContent=successMessage;
    showToast(successMessage); trackEvent(eventName,{source:location.pathname});
  }catch(err){
    status.className='form-status is-error'; status.textContent=err.message||'تعذّر الإرسال الآن.';
    trackEvent(`${eventName}_error`,{source:location.pathname});
  }finally{
    if(button){ button.disabled=false; button.textContent=original; }
  }
}
window.subscribe = function(e){ e.preventDefault(); submitSiteForm(e.currentTarget,'subscribe','تم الاشتراك. راجع بريدك لتأكيد العنوان.','sign_up'); return false; };
window.contactSubmit = function(e){ e.preventDefault(); submitSiteForm(e.currentTarget,'contact','وصلت رسالتك إلى فريق نَوَاة، وسنرد خلال 48 ساعة عمل.','generate_lead'); return false; };
(function(){
  const field=document.querySelector('.contact-form [name="subject"]');
  const subject=new URLSearchParams(location.search).get('subject');
  if(field&&subject){ field.value=subject.slice(0,160); field.focus(); }
})();

/* اختبار "ما مسارك؟" */
(function(){
  const box = $('#quizBox'); if(!box || typeof QUIZ === 'undefined') return;
  let i = 0; const score = {learn:0, earn:0, tools:0};
  function render(){
    if(i >= QUIZ.q.length){ return result(); }
    const q = QUIZ.q[i];
    box.innerHTML = `
      <div class="quiz-progress"><div style="width:${i/QUIZ.q.length*100}%"></div></div>
      <p class="quiz-step">السؤال ${i+1} من ${QUIZ.q.length}</p>
      <h2>${q.t}</h2>
      <div class="quiz-opts">${q.o.map((o,j)=>`<button data-j="${j}">${o.t}</button>`).join('')}</div>`;
    box.querySelectorAll('.quiz-opts button').forEach(b=>b.addEventListener('click', ()=>{
      score[q.o[+b.dataset.j].p]++; i++; render();
    }));
  }
  function result(){
    const win = Object.keys(score).sort((a,b)=>score[b]-score[a])[0];
    const r = QUIZ.r[win];
    box.innerHTML = `
      <div class="quiz-result">
        <span class="tag">نتيجتك</span>
        <h2>${r.title}</h2>
        <p>${r.desc}</p>
        <h3 style="margin:18px 0 10px;color:var(--primary-deep)">ابدأ بهذين المقالين:</h3>
        <div class="related-grid" style="grid-template-columns:1fr 1fr">${r.posts.map(p=>`<a href="${R}articles/${p.id}.html"><span class="r-cat">${p.cat}</span>${p.title}</a>`).join('')}</div>
        <div class="article-cta" style="margin-top:22px">
          <div><strong>المنتج الأنسب لمسارك:</strong><br><span style="color:var(--muted);font-size:.9rem">${r.prod.name} — ${r.prod.price.toLocaleString('ar-SA')} ر.س</span></div>
          <a class="btn btn-amber" href="${R}products/${r.prod.slug}.html">اعرف التفاصيل</a>
        </div>
        <button class="btn btn-ghost" style="margin-top:16px" onclick="location.reload()">↻ أعد الاختبار</button>
      </div>`;
    window.scrollTo({top:0, behavior:'smooth'});
  }
  render();
})();


/* ===== مولّد البرومبتات ===== */
(function(){
  const wrap = document.getElementById('genWrap');
  if(!wrap || typeof GEN === 'undefined') return;
  const state = { cat:null, task:null, vals:{}, tone:'', length:'', lang:'العربية', examples:false };

  function chip(label, active){ return `<button type="button" class="cat-chip${active?' on':''}" data-v="${label}">${label}</button>`; }

  function render(){
    let h = '<div class="gen-step"><span class="gen-num">1</span><h3>اختر المجال</h3></div>';
    h += '<div class="cats gen-cats">' + GEN.categories.map(c=>
      `<button type="button" class="cat-chip${state.cat===c.id?' on':''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('') + '</div>';

    if(state.cat){
      const cat = GEN.categories.find(c=>c.id===state.cat);
      h += '<div class="gen-step"><span class="gen-num">2</span><h3>اختر المهمة</h3></div>';
      h += '<div class="cats gen-cats">' + cat.tasks.map(t=>
        `<button type="button" class="cat-chip${state.task===t.id?' on':''}" data-task="${t.id}">${t.name}</button>`).join('') + '</div>';
    }

    if(state.cat && state.task){
      const cat = GEN.categories.find(c=>c.id===state.cat);
      const task = cat.tasks.find(t=>t.id===state.task);
      h += '<div class="gen-step"><span class="gen-num">3</span><h3>املأ التفاصيل</h3></div>';
      h += '<div class="gen-fields">';
      task.needs.forEach(n=>{
        const v = state.vals[n.k]||'';
        if(n.big) h += `<label class="gen-field"><span>${n.label}</span><textarea data-k="${n.k}" placeholder="${n.ph}">${v}</textarea></label>`;
        else h += `<label class="gen-field"><span>${n.label}</span><input data-k="${n.k}" value="${v.replace(/"/g,'&quot;')}" placeholder="${n.ph}"></label>`;
      });
      h += '</div>';
      h += '<div class="gen-step"><span class="gen-num">4</span><h3>اضبط المخرجات <small>(اختياري)</small></h3></div>';
      h += '<div class="gen-opts">';
      h += '<div class="gen-opt"><span>النبرة</span><div class="cats gen-cats">' + GEN.meta.tones.map(t=>chip(t, state.tone===t)).map(s=>s.replace('data-v','data-tone')).join('') + '</div></div>';
      h += '<div class="gen-opt"><span>الطول</span><div class="cats gen-cats">' + GEN.meta.lengths.map(t=>chip(t, state.length===t)).map(s=>s.replace('data-v','data-length')).join('') + '</div></div>';
      h += '<div class="gen-opt"><span>اللغة</span><div class="cats gen-cats">' + GEN.meta.langs.map(t=>chip(t, state.lang===t)).map(s=>s.replace('data-v','data-lang')).join('') + '</div></div>';
      if(GEN.meta.formats){ h += '<div class="gen-opt"><span>الصيغة</span><div class="cats gen-cats">' + GEN.meta.formats.map(t=>chip(t, state.format===t)).map(s=>s.replace('data-v','data-format')).join('') + '</div></div>'; }
      h += `<label class="gen-check"><input type="checkbox" id="genEx" ${state.examples?'checked':''}> اطلب من النموذج أمثلة على الناتج قبل تنفيذ المهمة كاملة</label>`;
      h += '</div>';
      h += '<div class="gen-actions"><button type="button" class="btn btn-primary" id="genBuild">✨ ولّد الموجّه</button></div>';
      h += '<div id="genOut"></div>';
    }
    wrap.innerHTML = h;
  }

  function build(){
    const cat = GEN.categories.find(c=>c.id===state.cat);
    const task = cat.tasks.find(t=>t.id===state.task);
    let taskText = task.task;
    let missing = [];
    task.needs.forEach(n=>{
      const v = (state.vals[n.k]||'').trim();
      if(!v) missing.push(n.label);
      taskText = taskText.split('{'+n.k+'}').join(v || '['+n.label+']');
    });
    // بناء الموجّه بمبادئ هندسة الموجهات
    let p = `أنت ${task.role}.\n\n`;
    p += `المهمة: ${taskText}\n\n`;
    const constraints = [];
    if(state.tone) constraints.push(`النبرة: ${state.tone}.`);
    if(state.length) constraints.push(`الطول: ${state.length}.`);
    if(state.lang && state.lang!=='العربية') constraints.push(`لغة المخرجات: ${state.lang}.`);
    if(state.format) constraints.push(`صيغة المخرجات: ${state.format}.`);
    if(constraints.length) p += 'القيود:\n- ' + constraints.join('\n- ') + '\n\n';
    if(state.examples) p += 'قبل التنفيذ الكامل، أعطني مثالاً واحداً مختصراً على الناتج المتوقع لأوافق عليه.\n\n';
    p += 'إن نقصتك معلومة ضرورية لإتقان المهمة، اسألني عنها قبل أن تبدأ بدل افتراضها.';

    const out = document.getElementById('genOut');
    out.innerHTML = `
      ${missing.length?`<div class="gen-warn">💡 املأ (${missing.join('، ')}) ليكتمل الموجّه — أو انسخه الآن واستبدل ما بين الأقواس لاحقاً.</div>`:''}
      <div class="gen-result">
        <div class="gen-result-head"><strong>✅ موجّهك جاهز</strong>
          <button type="button" class="btn-ghost gen-copy">📋 نسخ</button></div>
        <pre id="genText">${p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
      </div>
      <div class="gen-upsell">
        <p>🎁 هذا الموجّه مجاني بالكامل. لو أعجبك، <strong>مكتبة الـ120 موجّهاً الاحترافية</strong> تمنحك موجهات جاهزة ومنقّحة لكل مهمة تقريباً، مع نصيحة احترافية لكل واحد.</p>
        <a class="btn btn-amber" href="${window.NAWAH_ROOT||''}products/prompts-library.html">اكتشف المكتبة الكاملة</a>
      </div>`;
    out.querySelector('.gen-copy').addEventListener('click', ()=>{
      navigator.clipboard && navigator.clipboard.writeText(p).then(()=>showToast('📋 نُسخ الموجّه! الصقه في أداتك المفضلة'));
    });
    out.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  wrap.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.cat){ state.cat=b.dataset.cat; state.task=null; state.vals={}; render(); }
    else if(b.dataset.task){ state.task=b.dataset.task; state.vals={}; render(); }
    else if(b.dataset.tone!==undefined){ state.tone = state.tone===b.dataset.tone?'':b.dataset.tone; render(); }
    else if(b.dataset.length!==undefined){ state.length = state.length===b.dataset.length?'':b.dataset.length; render(); }
    else if(b.dataset.lang!==undefined){ state.lang=b.dataset.lang; render(); }
    else if(b.dataset.format!==undefined){ state.format = state.format===b.dataset.format?'':b.dataset.format; render(); }
    else if(b.id==='genBuild'){ build(); }
  });
  wrap.addEventListener('input', e=>{
    if(e.target.dataset.k) state.vals[e.target.dataset.k]=e.target.value;
    if(e.target.id==='genEx') state.examples=e.target.checked;
  });
  render();
})();


/* ===== خلفية الهيرو التقنية المتحركة ===== */
(function(){
  const cv = document.getElementById('heroNet');
  if(!cv) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  let w, hgt, nodes, raf;
  const COLORS = { line:'rgba(52,48,143,.18)', dot:'rgba(14,143,143,.55)' };
  function size(){
    const r = cv.parentElement.getBoundingClientRect();
    w = cv.width = r.width; hgt = cv.height = r.height;
    const n = Math.min(46, Math.floor(w/26));
    nodes = Array.from({length:n}, ()=>({
      x:Math.random()*w, y:Math.random()*hgt,
      vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35, r:Math.random()*1.6+1
    }));
  }
  function draw(){
    ctx.clearRect(0,0,w,hgt);
    for(let i=0;i<nodes.length;i++){
      const a=nodes[i];
      a.x+=a.vx; a.y+=a.vy;
      if(a.x<0||a.x>w)a.vx*=-1;
      if(a.y<0||a.y>hgt)a.vy*=-1;
      for(let j=i+1;j<nodes.length;j++){
        const b=nodes[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
        if(d<120){
          ctx.strokeStyle=COLORS.line;
          ctx.globalAlpha=1-d/120;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
    }
    ctx.globalAlpha=1;
    for(const a of nodes){
      ctx.fillStyle=COLORS.dot;
      ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();
    }
    raf=requestAnimationFrame(draw);
  }
  size(); draw();
  let to; window.addEventListener('resize',()=>{clearTimeout(to);to=setTimeout(size,200)},{passive:true});
  // إيقاف الرسم حين تكون الصفحة مخفية (توفير المعالج والبطارية)
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(raf);} else {draw();}
  });
})();

/* ===== عدّادات الإحصائيات المتحركة عند الظهور ===== */
(function(){
  const els = document.querySelectorAll('[data-count]');
  if(!els.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run(el){
    const target = +el.dataset.count;
    if(reduce){ el.textContent = target.toLocaleString('ar-SA'); return; }
    const dur = 1400, t0 = performance.now();
    function step(t){
      const p = Math.min((t-t0)/dur, 1);
      const eased = 1 - Math.pow(1-p, 3);
      el.textContent = Math.round(target*eased).toLocaleString('ar-SA');
      if(p<1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('ar-SA'); // ضمان القيمة النهائية الدقيقة
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
    }, {threshold:.4});
    els.forEach(el=>io.observe(el));
  } else {
    // متصفح بلا دعم: نعرض القيمة الحقيقية مباشرة
    els.forEach(el=>{ el.textContent = (+el.dataset.count).toLocaleString('ar-SA'); });
  }
})();


/* ===== المولّدات المتخصصة (genx) ===== */
(function(){
  if(typeof GENX === 'undefined') return;
  const byId = {}; GENX.forEach(g => byId[g.id] = g);
  let current = null;

  window.openGenx = function(id){
    const g = byId[id]; if(!g) return;
    current = g;
    document.getElementById('gxIcon').textContent = g.icon;
    document.getElementById('gxName').textContent = g.name;
    document.getElementById('gxDesc').textContent = g.desc;
    // الحقول
    let h = '';
    g.fields.forEach((f, i) => {
      h += `<div class="gx-field"><label for="gx_${i}">${f.label}</label>`;
      if(f.type === 'select'){
        h += `<select id="gx_${i}" data-k="${f.k}">` + f.opts.map(o=>`<option>${o}</option>`).join('') + `</select>`;
      } else if(f.type === 'textarea'){
        h += `<textarea id="gx_${i}" data-k="${f.k}" placeholder="${f.ph||''}" rows="3"></textarea>`;
      } else {
        h += `<input id="gx_${i}" data-k="${f.k}" type="text" placeholder="${f.ph||''}">`;
      }
      h += `</div>`;
    });
    document.getElementById('gxFields').innerHTML = h;
    document.getElementById('gxResult').style.display = 'none';
    const m = document.getElementById('genxModal');
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeGenx = function(){
    document.getElementById('genxModal').classList.remove('open');
    document.body.style.overflow = '';
  };

  window.runGenx = function(){
    if(!current) return;
    let tpl = current.tpl;
    const fields = document.querySelectorAll('#gxFields [data-k]');
    let missing = false;
    fields.forEach(el => {
      const k = el.dataset.k;
      const v = (el.value || '').trim();
      if(!v && el.tagName !== 'SELECT') missing = true;
      // نستبدل [{k}] و {k}
      tpl = tpl.split('[{'+k+'}]').join(v || '[…]');
      tpl = tpl.split('{'+k+'}').join(v || '[…]');
    });
    // تنظيف أقواس فارغة لحقل اختياري
    tpl = tpl.replace(/\s*\(الكلمة المفتاحية: \[…\]\)/g, '');
    const out = document.getElementById('gxOutput');
    out.textContent = tpl;
    // عرض ترويجي ذكي: لمولّد السيرة فقط — يحوّل المحتوى إلى بيع القوالب
    let promo = document.getElementById('gxPromo');
    if(current.id === 'resume'){
      if(!promo){
        promo = document.createElement('div');
        promo.id = 'gxPromo';
        promo.className = 'gx-promo';
        document.getElementById('gxResult').appendChild(promo);
      }
      promo.innerHTML = '<div class="gx-promo-in">'
        + '<span class="gx-promo-ico">📄</span>'
        + '<div class="gx-promo-txt"><strong>محتواك جاهز — تنقصك خطوة واحدة فقط</strong>'
        + '<p>المحتوى وحده لا يكفي لاجتياز ATS؛ يحتاج تنسيقاً خطّياً سليماً بلا جداول. قوالبنا الـ6 (عربي/إنجليزي) مبنية ومختبرة لهذا الغرض — انسخ محتواك فيها واطبعه فوراً.</p></div>'
        + '<a class="gx-promo-btn" href="' + R + 'products/cv-templates.html">قوالب ATS بـ39 ر.س ←</a>'
        + '</div>';
      promo.style.display = 'block';
    } else if(promo){
      promo.style.display = 'none';
    }
    document.getElementById('gxResult').style.display = 'block';
    document.getElementById('gxResult').scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  window.copyGenx = function(){
    const txt = document.getElementById('gxOutput').textContent;
    navigator.clipboard.writeText(txt).then(()=>{
      const b = document.querySelector('.genx-copy');
      const old = b.textContent; b.textContent = '✓ تم النسخ';
      setTimeout(()=>b.textContent = old, 1800);
    });
  };

  window.downloadGenx = function(){
    const txt = document.getElementById('gxOutput').textContent;
    if(!txt) return;
    const name = (current && current.name ? current.name : 'برومبت').replace(/\s+/g,'-');
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.txt';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // إغلاق بالنقر خارج الصندوق أو ESC
  document.addEventListener('click', e=>{
    if(e.target.id === 'genxModal') closeGenx();
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape') closeGenx();
  });
})();




/* ===== فاحص السيرة الذاتية ATS ===== */
(function(){
  const $ = id => document.getElementById(id);
  if(!$('atsInput')) return;

  // ---- تأمين: تهريب أي محتوى يأتي من المستخدم أو من ملف مرفوع قبل إدراجه في HTML ----
  // يمنع هجمات XSS عبر سيرة ذاتية خبيثة (مثل <img onerror=...> داخل ملف PDF/Word).
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---- تحميل المكتبات عند الحاجة (lazy) ----
  function loadScript(src, integrity){
    return new Promise((res, rej)=>{
      if(document.querySelector(`script[src="${src}"]`)){ res(); return; }
      const s = document.createElement('script');
      s.src = src;
      // تأمين: التحقق من سلامة الملف الخارجي (SRI) ومنع CDN مخترَق من حقن كود خبيث
      if(integrity){ s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.onload = res; s.onerror = ()=>rej(new Error('load fail'));
      document.head.appendChild(s);
    });
  }

  function setNote(msg, cls){
    const el = $('atsFileNote');
    el.textContent = msg;
    el.className = 'ats-file-note' + (cls? ' '+cls : '');
  }

  // تأمين المكتبات الخارجية: المصدر الأساسي للحماية هو ترويسة CSP في vercel.json
  // (تحصر تحميل السكربتات على نطاقك + cdnjs فقط). إن رغبت بطبقة إضافية (SRI)،
  // احصل على بصمة كل ملف من صفحته على cdnjs (زر "Copy SRI") ومرّرها كوسيط ثانٍ لـ loadScript.

  // ---- استخراج نص من PDF عبر PDF.js ----
  async function extractPDF(file){
    setNote('⏳ جارٍ استخراج النص من ملف PDF...', '');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    const pdfjsLib = window['pdfjsLib'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: buf}).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 30); // تأمين: حد أقصى 30 صفحة
    for(let i=1; i<=maxPages; i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // نعيد بناء الأسطر بترتيب منطقي
      let lastY = null, line = '';
      for(const item of content.items){
        if(lastY !== null && Math.abs(item.transform[5]-lastY) > 4){ text += line.trim()+'\n'; line=''; }
        line += item.str + ' ';
        lastY = item.transform[5];
      }
      text += line.trim()+'\n';
    }
    return text.trim();
  }

  // ---- استخراج نص من Word عبر Mammoth ----
  async function extractDOCX(file){
    setNote('⏳ جارٍ استخراج النص من ملف Word...', '');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    const buf = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({arrayBuffer: buf});
    return (result.value||'').trim();
  }

  window.atsFileUpload = async function(input){
    const file = input.files[0]; if(!file) return;
    const name = file.name.toLowerCase();
    // تأمين: حد أقصى لحجم الملف (5 ميجابايت) لمنع تعليق المتصفح بملف ضخم
    const MAX_BYTES = 5 * 1024 * 1024;
    if(file.size > MAX_BYTES){
      setNote('⚠️ حجم الملف كبير جداً (الحد 5 ميجابايت). اضغط الملف أو الصق النص يدوياً.', 'ats-note-warn');
      input.value = '';
      return;
    }
    try{
      let text = '';
      if(name.endsWith('.txt')){
        text = await file.text();
      } else if(name.endsWith('.pdf')){
        text = await extractPDF(file);
      } else if(name.endsWith('.docx')){
        text = await extractDOCX(file);
      } else if(name.endsWith('.doc')){
        setNote('⚠️ صيغة .doc القديمة غير مدعومة. احفظ الملف كـ .docx أو PDF وأعد الرفع.', 'ats-note-warn');
        return;
      } else {
        setNote('⚠️ صيغة غير مدعومة. ارفع PDF أو Word (.docx) أو نص (.txt).', 'ats-note-warn');
        return;
      }
      if(text && text.length > 30){
        $('atsInput').value = text;
        atsCountWords();
        setNote('✅ تم استخراج النص بنجاح ('+ (text.match(/\S+/g)||[]).length +' كلمة). راجعه ثم اضغط «حلّل سيرتي».', 'ats-note-ok');
      } else {
        setNote('⚠️ لم نتمكن من استخراج نص كافٍ. قد يكون الملف صورة ممسوحة ضوئياً — الصق النص يدوياً.', 'ats-note-warn');
      }
    } catch(err){
      console.error(err);
      setNote('⚠️ تعذّر قراءة الملف. جرّب صيغة أخرى أو الصق النص يدوياً في الصندوق.', 'ats-note-warn');
    }
  };

  window.atsCountWords = function(){
    const n = ($('atsInput').value.trim().match(/\S+/g)||[]).length;
    $('atsWordCount').textContent = n + ' كلمة';
  };

  window.runATS = function(){
    const text = $('atsInput').value.trim();
    if(text.length < 80){
      $('atsResult').innerHTML = '<div class="ats-warn">⚠️ النص قصير جداً. الصق سيرتك الذاتية كاملة (200 كلمة على الأقل) للحصول على تحليل دقيق.</div>';
      $('atsResult').style.display='block';
      return;
    }
    const role = $('atsRole').value.trim();
    const jobText = ($('atsJob') ? $('atsJob').value.trim() : '');
    const r = ATS.analyze(text, role);
    const rt = ATS.rating(r.total);
    r._jobMatch = jobText.length > 40 ? ATS.matchJob(text, jobText) : null;
    r._highlights = ATS.highlightIssues(text);
    r._examples = ATS.pickExamples(r);
    window._lastATS = {r, rt};
    renderReport(r, rt);
  };

  function bar(label, val){
    const cls = val>=80?'b-hi':val>=60?'b-mid':'b-lo';
    return `<div class="ats-bar-row"><div class="ats-bar-head"><span>${label}</span><strong>${val}/100</strong></div>
      <div class="ats-bar"><div class="ats-bar-fill ${cls}" style="width:${val}%"></div></div></div>`;
  }
  function list(arr, two){
    if(!arr.length) return '<p class="ats-empty">لا يوجد</p>';
    return '<ul class="ats-list">' + arr.map(x=> two?`<li><strong>${esc(x[0])}</strong><span>${esc(x[1])}</span></li>`:`<li>${esc(x)}</li>`).join('') + '</ul>';
  }

  function renderReport(r, rt){
    const h = `
    <div class="ats-score-card ${rt.cls}">
      <div class="ats-score-num">${r.total}<small>/100</small></div>
      <div class="ats-score-label">${rt.emoji} ${rt.label}</div>
    </div>

    <div class="ats-section"><h3>📊 تفصيل الدرجات</h3>
      ${bar('توافق ATS', r.scores.ats)}
      ${bar('قوة المحتوى', r.scores.content)}
      ${bar('الاحترافية', r.scores.prof)}
      ${bar('التنافسية', r.scores.comp)}
      ${bar('التصميم والتنظيم', r.scores.design)}
    </div>

    <div class="ats-prob">
      <div class="ats-prob-item"><span>احتمالية اجتياز ATS</span><strong>${r.atsPass}%</strong></div>
      <div class="ats-prob-item"><span>احتمالية الحصول على مقابلة</span><strong>${r.interview}%</strong></div>
    </div>

    <div class="ats-grid2">
      <div class="ats-section ats-pos"><h3>✅ نقاط القوة</h3>${list(r.strengths,true)}</div>
      <div class="ats-section ats-neg"><h3>⚠️ نقاط الضعف</h3>${list(r.weaknesses,true)}</div>
    </div>

    <div class="ats-section"><h3>🔑 الكلمات المفتاحية المقترح إضافتها</h3>
      ${r.missingKw.length? '<div class="ats-kw">'+r.missingKw.map(k=>`<span>${esc(k)}</span>`).join('')+'</div>' : '<p class="ats-empty">تغطية جيدة للكلمات المفتاحية ✓</p>'}
    </div>

    <div class="ats-section"><h3>🔧 أخطاء ATS المكتشفة</h3>${list(r.atsErrors,true)}</div>

    <div class="ats-section"><h3>💡 اقتراحات التحسين</h3>${list(r.suggestions,false)}</div>

    <div class="ats-section ats-recruiter"><h3>👔 تقييم مسؤول التوظيف (30 ثانية)</h3>
      <p>"${r.recruiterView}"</p></div>

    <div class="ats-section"><h3>🚀 خطة التحسين (5 خطوات بالأولوية)</h3>
      <ol class="ats-plan">${buildPlan(r).map(s=>`<li>${s}</li>`).join('')}</ol></div>

    ${r._jobMatch ? `
    <div class="ats-section ats-jobmatch"><h3>🎯 نسبة التطابق مع إعلان الوظيفة</h3>
      <div class="ats-match-circle ${r._jobMatch.rate>=70?'m-hi':r._jobMatch.rate>=45?'m-mid':'m-lo'}">
        <span class="ats-match-num">${r._jobMatch.rate}%</span>
        <span class="ats-match-cap">تطابق</span>
      </div>
      <p class="ats-match-note">${r._jobMatch.rate>=70?'تطابق ممتاز — سيرتك متوافقة جيداً مع متطلبات هذه الوظيفة.':r._jobMatch.rate>=45?'تطابق متوسط — أضف الكلمات المفقودة أدناه لرفع فرصتك.':'تطابق منخفض — سيرتك تحتاج تعديلاً ليطابق هذا الإعلان. أضف الكلمات المفقودة.'}</p>
      <div class="ats-match-cols">
        <div><h4>✅ كلمات متطابقة (${r._jobMatch.matched.length})</h4><div class="ats-kw ats-kw-ok">${r._jobMatch.matched.map(k=>`<span>${esc(k)}</span>`).join('')||'<em>لا يوجد</em>'}</div></div>
        <div><h4>❌ كلمات مفقودة من سيرتك (${r._jobMatch.missing.length})</h4><div class="ats-kw ats-kw-miss">${r._jobMatch.missing.map(k=>`<span>${esc(k)}</span>`).join('')||'<em>ممتاز، لا نقص</em>'}</div></div>
      </div>
    </div>` : ''}

    <div class="ats-section"><h3>🔍 تحليل سيرتك سطراً بسطر</h3>
      <p class="ats-hl-legend"><span class="hl-s">إنجاز قوي</span> <span class="hl-w">عبارة ضعيفة</span> <span class="hl-o">جيد</span></p>
      <div class="ats-highlight">${r._highlights.map(l=>{
        if(l.type==='blank') return '<br>';
        const cls = l.type==='weak'?'hl-w':l.type==='strong'?'hl-s':l.type==='ok'?'hl-o':'';
        const hint = l.hint?` title="${esc(l.hint)}"`:'';
        return `<div class="hl-line ${cls}"${hint}>${esc(l.text)}${l.hint?`<small>${esc(l.hint)}</small>`:''}</div>`;
      }).join('')}</div>
    </div>

    <div class="ats-section ats-examples"><h3>✨ أمثلة قبل/بعد لتقوية سيرتك</h3>
      ${r._examples.map(ex=>`<div class="ats-ex">
        <div class="ats-ex-before"><span class="ats-ex-tag">❌ قبل</span><p>${ex.before}</p></div>
        <div class="ats-ex-after"><span class="ats-ex-tag">✅ بعد</span><p>${ex.after}</p></div>
      </div>`).join('')}
    </div>

    <div class="ats-disclaimer">⚠️ هذا تحليل آلي إرشادي مبني على أفضل ممارسات ATS لعام 2026، ولا يغني عن مراجعة مختص توظيف. النتائج تقديرية لمساعدتك على التحسين.</div>

    <div class="ats-actions">
      <button class="btn btn-primary" onclick="downloadATSReport()">📥 حمّل التقرير PDF</button>
      <button class="btn btn-ghost" onclick="copyATSReport()">📋 نسخ ملخّص التقرير</button>
      <button class="btn btn-ghost ats-again" onclick="document.getElementById('atsInput').scrollIntoView({behavior:'smooth'})">↑ تحليل سيرة أخرى</button>
    </div>
    `;
    $('atsResult').innerHTML = h;
    $('atsResult').style.display='block';
    $('atsResult').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function buildPlan(r){
    const plan = [];
    if(!r.found.summary) plan.push('<strong>أضف ملخصاً مهنياً قوياً</strong> أعلى السيرة (3-4 أسطر) يبرز تخصصك وأبرز إنجاز وقيمتك للشركة.');
    if(r.stats.percentCount<2) plan.push('<strong>حوّل المهام إلى إنجازات بأرقام</strong> — أضف نسباً ومقاييس لكل خبرة («رفعت المبيعات 30%»).');
    if(!r.found.skills) plan.push('<strong>أنشئ قسم مهارات واضحاً</strong> بكلمات مفتاحية تطابق إعلانات الوظائف المستهدفة.');
    if(r.stats.actionVerbCount<5) plan.push('<strong>ابدأ كل نقطة بفعل إنجاز قوي</strong> (قاد، طوّر، حقّق) بدل العبارات الإنشائية.');
    if(r.missingKw.length>4) plan.push('<strong>أدرج الكلمات المفتاحية المفقودة</strong> ذات الصلة بدورك المستهدف ضمن الخبرات والمهارات.');
    plan.push('<strong>طابق سيرتك مع كل إعلان وظيفة</strong> على حدة — عدّل الكلمات المفتاحية لترفع نسبة تطابق ATS.');
    plan.push('<strong>راجع التنسيق:</strong> عناوين قياسية، نقاط واضحة، طول صفحة-صفحتين، بلا جداول أو صور معقّدة تربك ATS.');
    return plan.slice(0,5);
  }

  // ---- تحميل التقرير PDF ----
  window.downloadATSReport = function(){
    const data = window._lastATS;
    if(!data) return;
    const r = data.r, rt = data.rt;
    const stamp = new Date().toLocaleDateString('ar-SA');
    // نبني صفحة تقرير مستقلة قابلة للطباعة كـPDF
    const w = window.open('', '_blank');
    if(!w){ alert('فعّل النوافذ المنبثقة لتحميل التقرير، أو استخدم زر الطباعة (Ctrl+P).'); return; }
    const barRow = (l,v)=>`<tr><td>${l}</td><td><div style="background:#eee;border-radius:20px;height:14px;width:200px;display:inline-block;vertical-align:middle"><div style="background:${v>=80?'#0E8F8F':v>=60?'#D98E2B':'#b5443a'};height:14px;border-radius:20px;width:${v*2}px"></div></div> <b>${v}/100</b></td></tr>`;
    const liList = (arr,two)=> arr.length? '<ul>'+arr.map(x=> two?`<li><b>${esc(x[0])}</b> — ${esc(x[1])}`:`<li>${esc(x)}`).join('')+'</ul>' : '<p style="color:#888">لا يوجد</p>';
    const escKw = a => (a||[]).map(esc).join('، ');
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير فحص السيرة — نَوَاة</title>
    <style>
      body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1a1f2e;max-width:800px;margin:0 auto;padding:30px;line-height:1.7}
      h1{color:#221E66;border-bottom:3px solid #0E8F8F;padding-bottom:10px}
      h2{color:#221E66;margin-top:26px;font-size:1.15rem;border-right:4px solid #0E8F8F;padding-right:10px}
      .score{text-align:center;background:linear-gradient(135deg,#34308F,#0E8F8F);color:#fff;border-radius:16px;padding:24px;margin:20px 0}
      .score .n{font-size:3rem;font-weight:800}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      td{padding:8px 4px;border-bottom:1px solid #eee}
      ul{padding-right:20px;margin:8px 0}
      li{margin-bottom:6px}
      .prob{display:flex;gap:20px;justify-content:center;margin:16px 0}
      .prob div{background:#f4f2fb;border-radius:12px;padding:14px 28px;text-align:center}
      .prob b{font-size:1.6rem;color:#0E8F8F;display:block}
      .foot{margin-top:30px;border-top:1px solid #ddd;padding-top:14px;color:#888;font-size:.85rem;text-align:center}
      @media print{ .noprint{display:none} body{padding:10px} }
    </style></head><body>
    <h1>📊 تقرير فحص السيرة الذاتية — نَوَاة</h1>
    <p style="color:#888">التاريخ: ${stamp} · أداة فاحص ATS من nawahlabs.com</p>
    <div class="score"><div class="n">${r.total}/100</div><div>${rt.emoji} ${rt.label}</div></div>
    <h2>تفصيل الدرجات</h2>
    <table>${barRow('توافق ATS',r.scores.ats)}${barRow('قوة المحتوى',r.scores.content)}${barRow('الاحترافية',r.scores.prof)}${barRow('التنافسية',r.scores.comp)}${barRow('التصميم والتنظيم',r.scores.design)}</table>
    <div class="prob"><div><b>${r.atsPass}%</b>احتمالية اجتياز ATS</div><div><b>${r.interview}%</b>احتمالية المقابلة</div></div>
    ${r._jobMatch?`<h2>التطابق مع إعلان الوظيفة: ${r._jobMatch.rate}%</h2><p>كلمات مفقودة: ${escKw(r._jobMatch.missing)||'لا يوجد'}</p>`:''}
    <h2>✅ نقاط القوة</h2>${liList(r.strengths,true)}
    <h2>⚠️ نقاط الضعف</h2>${liList(r.weaknesses,true)}
    <h2>🔑 كلمات مفتاحية مقترحة</h2><p>${escKw(r.missingKw)||'تغطية جيدة'}</p>
    <h2>🔧 أخطاء ATS</h2>${liList(r.atsErrors,true)}
    <h2>💡 اقتراحات التحسين</h2>${liList(r.suggestions,false)}
    <h2>👔 تقييم مسؤول التوظيف (30 ثانية)</h2><p style="font-style:italic;background:#f4f2fb;padding:14px;border-radius:10px">"${r.recruiterView}"</p>
    <div class="foot">© ${new Date().getFullYear()} نَوَاة · nawahlabs.com · تقرير إرشادي مبني على معايير ATS 2026</div>
    <button class="noprint" onclick="window.print()" style="display:block;margin:20px auto;padding:12px 30px;background:#0E8F8F;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer">🖨️ احفظ كـPDF / اطبع</button>
    <script>setTimeout(()=>window.print(),600)<\/script>
    </body></html>`);
    w.document.close();
  };

  // ---- نسخ ملخّص التقرير كنص ----
  window.copyATSReport = function(){
    const data = window._lastATS;
    if(!data) return;
    const r = data.r, rt = data.rt;
    const L = [];
    L.push('تقرير فحص السيرة الذاتية ATS — نَوَاة');
    L.push('================================');
    L.push(`الدرجة الإجمالية: ${r.total}/100 (${rt.label})`);
    L.push('');
    L.push('تفصيل الدرجات:');
    L.push(`- توافق ATS: ${r.scores.ats}/100`);
    L.push(`- قوة المحتوى: ${r.scores.content}/100`);
    L.push(`- الاحترافية: ${r.scores.prof}/100`);
    L.push(`- التنافسية: ${r.scores.comp}/100`);
    L.push(`- التصميم والتنظيم: ${r.scores.design}/100`);
    L.push('');
    L.push(`احتمالية اجتياز ATS: ${r.atsPass}%`);
    L.push(`احتمالية الحصول على مقابلة: ${r.interview}%`);
    L.push('');
    if(r.strengths.length){ L.push('نقاط القوة:'); r.strengths.forEach(x=>L.push(`✓ ${x[0]}: ${x[1]}`)); L.push(''); }
    if(r.weaknesses.length){ L.push('نقاط الضعف:'); r.weaknesses.forEach(x=>L.push(`⚠ ${x[0]}: ${x[1]}`)); L.push(''); }
    if(r.missingKw.length){ L.push('كلمات مفتاحية مقترح إضافتها: ' + r.missingKw.join('، ')); L.push(''); }
    if(r._jobMatch){ L.push(`نسبة التطابق مع إعلان الوظيفة: ${r._jobMatch.rate}%`); if(r._jobMatch.missing.length) L.push('كلمات مفقودة من سيرتك: ' + r._jobMatch.missing.join('، ')); L.push(''); }
    L.push('خطة التحسين (بالأولوية):');
    buildPlan(r).forEach((s,i)=>L.push(`${i+1}. ${s.replace(/<[^>]+>/g,'')}`));
    L.push('');
    L.push('— تقرير إرشادي من nawahlabs.com وفق معايير ATS 2026');
    const txt = L.join('\n');
    navigator.clipboard.writeText(txt).then(()=>{
      const b = document.querySelector('[onclick="copyATSReport()"]');
      if(b){ const old = b.textContent; b.textContent = '✓ تم نسخ التقرير'; setTimeout(()=>b.textContent = old, 1900); }
    });
  };

})();

/* تجربة المقال: ملخص سريع، شفافية تحريرية، وحفظ للعودة لاحقاً */
(function(){
  const page=document.querySelector('.article-page'), body=document.querySelector('.article-body');
  if(!page||!body) return;
  const title=document.querySelector('.ah-title')?.textContent.trim()||document.title;
  const excerpt=document.querySelector('.ah-excerpt')?.textContent.trim()||'';
  const modified=document.querySelector('.ah-meta time')?.getAttribute('datetime')||'';
  const path=location.pathname.split('/').pop();
  const distinctions={
    'p10.html':['اختبار مهام لا جدول مواصفات','هذا الدليل يحسم الاختيار عبر مهام عربية عملية. للمواصفات والخطط والأسعار راجع المقارنة المرجعية.','p13.html','المقارنة المرجعية بالأرقام'],
    'p13.html':['مرجع المواصفات والخطط','هذه الصفحة تتابع الأسعار والحدود والمواصفات. للاختبار العملي بحسب المهمة راجع الدليل الميداني.','p10.html','الاختبار العملي بحسب المهمة'],
    'p9.html':['وصفات أتمتة للعمل اليومي','يركز هذا الدليل على مسارات جاهزة وتوفير الوقت. لاختيار المنصة من الصفر راجع دليل المبتدئ.','p27.html','اختيار منصة الأتمتة للمبتدئ'],
    'p27.html':['اختيار المنصة للمبتدئ','يركز هذا الدليل على الفرق بين n8n وZapier وMake. للوصفات الجاهزة راجع دليل أتمتة العمل.','p9.html','وصفات أتمتة جاهزة'],
    'p15.html':['قراءة سوق العمل','يركز هذا التحليل على طبيعة الوظائف التي تتغير ولماذا. لخطة حماية مهنية عملية راجع الدليل التطبيقي.','p44.html','خطة حماية مستقبلك المهني'],
    'p44.html':['خطة حماية مهنية','يركز هذا الدليل على المهارات والخطوات حتى 2030. لفهم تحولات سوق العمل راجع التحليل الأوسع.','p15.html','تحليل الوظائف المتغيرة'],
    'p8.html':['مسار إلى أول وظيفة','خارطة مرنة من الأساسيات إلى ملف الأعمال والتوظيف. إذا أردت برنامجاً مكثفاً ومؤقتاً استخدم خطة 90 يوماً.','p16.html','برنامج 90 يوماً'],
    'p16.html':['برنامج مكثف لمدة 90 يوماً','خطة أسبوعية لمن يستطيع الالتزام الجاد. للمسار المرن حتى أول وظيفة راجع الخارطة الكاملة.','p8.html','الخارطة المرنة لأول وظيفة'],
    'p3.html':['متى تختار Claude؟','يركز هذا الدليل على حالات التفوق والقرار العملي. للشرح الشامل للميزات والمشاريع راجع المرجع الكامل.','p21.html','مرجع Claude الكامل'],
    'p21.html':['مرجع Claude الكامل','يغطي المشاريع والمستندات وسير العمل بتفصيل. لقرار الاختيار السريع راجع الدليل العملي.','p3.html','متى تختار Claude؟']
  };

  const trust=document.createElement('aside');
  trust.className='article-trust';
  trust.setAttribute('aria-label','معلومات التحرير');
  trust.innerHTML=`<div><span class="trust-mark" aria-hidden="true">ن</span><p><strong>محتوى تحريري من نَوَاة</strong><small>${modified?`آخر مراجعة: <time datetime="${escapeHtml(modified)}">${escapeHtml(modified)}</time> · `:''}<a href="${R}editorial.html">منهجية التحرير والتصحيح</a></small></p></div><a class="trust-report" href="${R}contact.html?subject=${encodeURIComponent('تصحيح معلومة: '+title)}">أبلغ عن معلومة قديمة</a>`;
  body.insertBefore(trust,body.firstChild);

  const headings=[...body.querySelectorAll(':scope > h2')].filter(h=>!['field-guide','deep-dive'].includes(h.id)).slice(0,4);
  if(excerpt&&headings.length){
    const quick=document.createElement('section');
    quick.className='article-quick';
    quick.innerHTML=`<span>ابدأ من هنا / دقيقة واحدة</span><h2>الخلاصة قبل التفاصيل</h2><p>${escapeHtml(excerpt)}</p><ul>${headings.map(h=>`<li><a href="#${escapeHtml(h.id)}">${escapeHtml(h.textContent)}</a></li>`).join('')}</ul>`;
    const anchor=body.querySelector('.toc')||trust;
    anchor.insertAdjacentElement('afterend',quick);
  }

  if(distinctions[path]){
    const [label,copy,other,linkLabel]=distinctions[path];
    const note=document.createElement('aside'); note.className='article-distinction';
    note.innerHTML=`<span>زاوية هذا الدليل</span><h2>${escapeHtml(label)}</h2><p>${escapeHtml(copy)}</p><a href="${R}articles/${escapeHtml(other)}">${escapeHtml(linkLabel)} ←</a>`;
    (body.querySelector('.article-quick')||trust).insertAdjacentElement('afterend',note);
  }

  const tools=document.createElement('div'); tools.className='article-reader-tools';
  const saved=store.get('savedArticles')||[]; const isSaved=saved.some(x=>x.u===location.pathname);
  tools.innerHTML=`<button type="button" data-save aria-pressed="${isSaved}">${isSaved?'محفوظ للعودة':'احفظ للعودة لاحقاً'}</button><a href="${R}saved.html">المقالات المحفوظة</a><button type="button" data-print>نسخة للطباعة</button>`;
  (body.querySelector('.share-bar')||trust).insertAdjacentElement('afterend',tools);
  tools.querySelector('[data-save]').addEventListener('click',e=>{
    let list=store.get('savedArticles')||[]; const exists=list.some(x=>x.u===location.pathname);
    list=exists?list.filter(x=>x.u!==location.pathname):[{u:location.pathname,t:title,savedAt:new Date().toISOString()},...list].slice(0,30);
    store.set('savedArticles',list); e.currentTarget.setAttribute('aria-pressed',String(!exists)); e.currentTarget.textContent=exists?'احفظ للعودة لاحقاً':'محفوظ للعودة';
    showToast(exists?'أُزيل المقال من المحفوظات':'حفظنا المقال على هذا الجهاز'); trackEvent(exists?'unsave_article':'save_article',{article_title:title});
  });
  tools.querySelector('[data-print]').addEventListener('click',()=>{ trackEvent('print_article',{article_title:title}); window.print(); });

  const deep=document.querySelector('.nfg-deep-dive');
  if(deep){
    deep.classList.add('is-collapsed');
    const toggle=document.createElement('button'); toggle.type='button'; toggle.className='deep-toggle'; toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span>القسم المتقدم</span><strong>افتح التحليل الموسّع وخطة التطبيق</strong><small>للقراءة المتعمقة — يمكنك فتحه عند الحاجة</small>';
    deep.insertAdjacentElement('beforebegin',toggle);
    toggle.addEventListener('click',()=>{
      const expanded=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',String(!expanded)); deep.classList.toggle('is-collapsed',expanded);
      toggle.querySelector('strong').textContent=expanded?'افتح التحليل الموسّع وخطة التطبيق':'أغلق القسم المتقدم';
      trackEvent(expanded?'collapse_deep_dive':'expand_deep_dive',{article_title:title});
    });
    document.querySelectorAll('a[href="#deep-dive"]').forEach(link=>link.addEventListener('click',e=>{
      if(!deep.classList.contains('is-collapsed')) return;
      e.preventDefault(); toggle.click(); requestAnimationFrame(()=>deep.scrollIntoView({behavior:'smooth',block:'start'}));
    }));
  }

  const milestones=new Set();
  window.addEventListener('scroll',()=>{
    const max=document.documentElement.scrollHeight-innerHeight; if(max<=0) return;
    const percent=Math.round(scrollY/max*100);
    [25,50,75,90].forEach(mark=>{ if(percent>=mark&&!milestones.has(mark)){ milestones.add(mark); trackEvent('article_scroll',{article_title:title,percent_scrolled:mark}); } });
  },{passive:true});
  body.addEventListener('click',e=>{
    const a=e.target.closest('a'); if(!a) return;
    if(a.closest('.toc')) trackEvent('toc_click',{article_title:title,section:a.textContent.trim()});
    if(a.closest('.nfg-sources')) trackEvent('source_click',{article_title:title,url:a.href});
    if(a.closest('.share-bar')) trackEvent('share',{article_title:title,method:a.textContent.trim()});
  });
})();

/* مكتبة المقالات المحفوظة على هذا الجهاز */
(function(){
  const list=$('#savedList'); if(!list) return;
  const items=store.get('savedArticles')||[];
  if(!items.length){ list.innerHTML='<div class="saved-empty"><span>لا توجد محفوظات بعد</span><h2>احفظ ما تريد الرجوع إليه</h2><p>ستجد زر الحفظ أعلى كل مقال. تبقى القائمة على هذا الجهاز ولا تُرسل إلى أي خادم.</p><a class="btn btn-primary" href="archive.html">تصفح المقالات</a></div>'; return; }
  list.innerHTML=items.map((item,i)=>`<article class="saved-item"><span>${String(i+1).padStart(2,'0')}</span><a href="${escapeHtml(item.u)}"><small>مقال محفوظ</small><h2>${escapeHtml(item.t)}</h2></a><button type="button" data-remove="${i}" aria-label="إزالة ${escapeHtml(item.t)}">إزالة</button></article>`).join('');
  list.addEventListener('click',e=>{ const b=e.target.closest('[data-remove]'); if(!b)return; const next=(store.get('savedArticles')||[]).filter((_,i)=>i!==+b.dataset.remove); store.set('savedArticles',next); location.reload(); });
})();

/* صفحة دفع وسيطة صريحة تمنع فتح تبويبات متعددة آلياً */
(function(){
  const box=$('#checkoutItems'); if(!box || typeof PRODUCTS==='undefined') return;
  const total=$('#checkoutTotal'), empty=$('#checkoutEmpty'), note=$('#checkoutMultiNote');
  const chosen=(store.get('cart')||[]).map(c=>PRODUCTS.find(p=>p.id===c.id)).filter(Boolean);
  if(!chosen.length){ box.hidden=true; if(empty) empty.hidden=false; return; }
  if(note) note.hidden=chosen.length<2;
  box.innerHTML=chosen.map((p,i)=>{
    const href=typeof PAYMENTS!=='undefined'&&PAYMENTS[p.id];
    return `<article class="checkout-item"><span class="checkout-step">${String(i+1).padStart(2,'0')}</span><div><small>${escapeHtml(p.type)}</small><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.desc)}</p></div><div class="checkout-price"><strong>${p.price.toLocaleString('ar-SA')} ر.س</strong>${href?`<a href="${escapeHtml(href)}" target="_blank" rel="noopener" data-pay="${p.id}">الانتقال للدفع الآمن</a>`:'<span>رابط الدفع غير متاح</span>'}</div></article>`;
  }).join('');
  if(total) total.textContent=chosen.reduce((s,p)=>s+p.price,0).toLocaleString('ar-SA')+' ر.س';
  box.addEventListener('click',e=>{ const a=e.target.closest('[data-pay]'); if(!a)return; const p=chosen.find(x=>x.id===+a.dataset.pay); trackEvent('select_payment',{currency:'SAR',value:p?.price||0,item_id:a.dataset.pay}); });
})();

/* تسجيل عامل الخدمة (PWA) */
if('serviceWorker' in navigator && location.protocol === 'https:'){
  navigator.serviceWorker.register(R + 'sw.js').catch(()=>{});
}

/* قائمة الجوال (همبرغر) */
(function(){
  var t=document.getElementById('navToggle'), n=document.getElementById('navLinks');
  if(!t||!n) return;
  t.addEventListener('click',function(){
    var open=n.classList.toggle('open');
    t.setAttribute('aria-expanded', open?'true':'false');
  });
  // إغلاق القائمة عند الضغط على رابط
  n.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',function(){
      n.classList.remove('open');
      t.setAttribute('aria-expanded','false');
    });
  });
})();

/* ===== تحسينات تجربة القراءة والتنقل — إصدار نَوَاة التحريري ===== */
(function(){
  const nav = document.getElementById('navLinks');
  const toggle = document.getElementById('navToggle');
  if(nav){
    const path = location.pathname.replace(/\/$/, '/index.html');
    nav.querySelectorAll('a').forEach(a=>{
      const href = (a.getAttribute('href')||'').split('#')[0].split('?')[0];
      const file = href.split('/').pop();
      const isArticle = /\/(?:articles|topics)\//.test(path) && /archive\.html$/.test(href);
      const isCurrent = file && path.endsWith('/'+file);
      a.classList.toggle('active', Boolean(isArticle || isCurrent));
    });
    document.addEventListener('keydown', e=>{
      if(e.key==='Escape' && nav.classList.contains('open')){
        nav.classList.remove('open');
        if(toggle){ toggle.setAttribute('aria-expanded','false'); toggle.focus(); }
      }
    });
  }

  const article = document.querySelector('.article-body');
  if(!article) return;

  // زمن القراءة يُحسب من النص المنشور فعلياً بعد الإثراء، لا من رقم ثابت قديم.
  const copy = article.cloneNode(true);
  copy.querySelectorAll('.share-bar,.toc,.ad-slot,.related,.article-cta,.nfg-sources').forEach(el=>el.remove());
  const measuredWords = (copy.textContent.match(/[\p{L}\p{N}]+/gu)||[]).length;
  const words = Number(article.dataset.wordCount) || measuredWords;
  const minutes = Math.max(10, Math.ceil(words/155));
  document.querySelectorAll('.ah-meta span').forEach(el=>{
    if(el.textContent.includes('قراءة')) el.textContent = `⏱ ${minutes.toLocaleString('ar-SA')} دقيقة قراءة معمّقة · ${words.toLocaleString('ar-SA')} كلمة`;
  });

  // تمييز موضع القارئ داخل جدول المحتويات.
  const links = [...document.querySelectorAll('.toc a[href^="#"]')];
  if('IntersectionObserver' in window && links.length){
    const map = new Map(links.map(a=>[decodeURIComponent(a.hash.slice(1)),a]));
    const headings = [...article.querySelectorAll('h2[id]')].filter(h=>map.has(h.id));
    const observer = new IntersectionObserver(entries=>{
      const current = entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(!current) return;
      links.forEach(a=>a.classList.remove('active'));
      map.get(current.target.id)?.classList.add('active');
    },{rootMargin:'-18% 0px -68% 0px',threshold:[0,1]});
    headings.forEach(h=>observer.observe(h));
  }
})();
