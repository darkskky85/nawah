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

/* الوضع الليلي */
(function(){
  const saved = store.get('theme');
  if(saved === 'dark'){ document.documentElement.setAttribute('data-theme','dark'); }
  const btn = $('#themeBtn'); if(!btn) return;
  const sync = ()=> btn.textContent = document.documentElement.getAttribute('data-theme')==='dark' ? '☀️' : '🌙';
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

/* البحث الفوري */
(function(){
  const inp = $('#siteSearch'), box = $('#searchResults');
  if(!inp || !box || typeof SEARCH_INDEX === 'undefined') return;
  inp.addEventListener('input', ()=>{
    const q = inp.value.trim();
    if(q.length < 2){ box.classList.remove('open'); return; }
    const hits = SEARCH_INDEX.filter(i => i.k.includes(q)).slice(0,8);
    box.innerHTML = hits.length
      ? hits.map(h=>`<a href="${R}${h.u}"><span class="sr-type">${h.type} · ${h.sub}</span><br>${h.t}</a>`).join('')
      : `<div class="sr-empty">لا توجد نتائج مطابقة لـ«${q}»</div>`;
    box.classList.add('open');
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('.search-box')) box.classList.remove('open'); });
})();

/* السلة */
let cart = store.get('cart') || [];
let discount = store.get('discount') || 0;
function saveCart(){ store.set('cart', cart); store.set('discount', discount); }
function addToCart(id){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  if(!cart.find(x=>x.id===id)){ cart.push({id:p.id, name:p.name, icon:p.icon, price:p.price}); saveCart(); renderCart(); }
  showToast(`✅ أُضيف «${p.name}» إلى السلة`);
}
function removeFromCart(id){ cart = cart.filter(x=>x.id!==id); saveCart(); renderCart(); }
window.addToCart = addToCart; window.removeFromCart = removeFromCart;
function renderCart(){
  const count = $('#cartCount'); if(count) count.textContent = cart.length;
  const box = $('#cartItems'), foot = $('#cartFooter');
  if(!box) return;
  if(!cart.length){ box.innerHTML = '<p class="empty-cart">سلتك فارغة بعد.<br>تصفّح المتجر واختر ما يناسب رحلتك 🛍️</p>'; foot.style.display='none'; return; }
  box.innerHTML = cart.map(p=>`<div class="cart-item"><span>${p.icon} ${p.name}</span><span style="display:flex;gap:10px;align-items:center"><strong>${p.price.toLocaleString('ar-SA')} ر.س</strong><button onclick="removeFromCart(${p.id})" aria-label="إزالة من السلة">🗑</button></span></div>`).join('');
  const sum = cart.reduce((s,p)=>s+p.price,0), total = Math.round(sum*(1-discount));
  $('#cartTotal').innerHTML = discount ? `<s style="color:var(--muted);font-size:.85rem">${sum.toLocaleString('ar-SA')}</s> ${total.toLocaleString('ar-SA')} ر.س` : `${sum.toLocaleString('ar-SA')} ر.س`;
  foot.style.display = 'block';
}
(function(){
  const d = $('#cartDrawer'); if(!d) return;
  $('#cartBtn').addEventListener('click', ()=> d.classList.add('open'));
  $('#cartClose').addEventListener('click', ()=> d.classList.remove('open'));
  d.addEventListener('click', e=>{ if(e.target.id==='cartDrawer') d.classList.remove('open'); });
  $('#couponBtn').addEventListener('click', ()=>{
    const v = $('#couponInput').value.trim().toUpperCase();
    if(v==='NAWAH20'){ discount=.2; saveCart(); renderCart(); showToast('🎉 تم تطبيق خصم 20%'); }
    else showToast('الكود غير صحيح. جرّب NAWAH20');
  });
  $('#checkoutBtn').addEventListener('click', ()=>{
    const P = (typeof PAYMENTS!=='undefined') ? PAYMENTS : {};
    const links = cart.map(it=>P[it.id]).filter(Boolean);
    if(cart.length===1 && links.length===1){ window.open(links[0],'_blank'); return; }
    if(links.length===cart.length && links.length>0){
      d.classList.remove('open');
      showToast('🔗 سيُفتح الدفع لكل منتج في تبويب');
      links.forEach((l,i)=>setTimeout(()=>window.open(l,'_blank'), i*400));
      return;
    }
    showToast('🔒 لتفعيل الشراء: أضف روابط الدفع من لوحة التحكم (تبويب روابط الدفع).');
  });
  renderCart();
})();

/* شبكة المنتجات في الرئيسية */
(function(){
  const g = $('#productsGrid'); if(!g || typeof PRODUCTS === 'undefined') return;
  g.innerHTML = PRODUCTS.map(p=>`
    <div class="product">
      <div class="icon" aria-hidden="true" style="font-size:1.6rem">${p.icon}</div>
      <div class="ptype">${p.type}</div>
      <h3>${p.name}</h3>
      <span class="dl-count">🆕 إصدار 2026 — كن من أوائل المقتنين</span>
      <p>${p.desc}</p>
      <ul>${p.feats.map(f=>`<li>${f}</li>`).join('')}</ul>
      <div class="price-row">
        <div class="price">${p.price.toLocaleString('ar-SA')} <small>ر.س</small></div>
        <div style="display:flex;gap:8px">
          <a class="btn-ghost" style="border-radius:50px;padding:8px 16px;font-size:.85rem;border:2px solid var(--line)" href="${R}products/${p.slug}.html">التفاصيل</a>
          <button class="add-btn" onclick="addToCart(${p.id})" aria-label="أضف ${p.name} إلى السلة">أضف للسلة</button>
        </div>
      </div>
    </div>`).join('');
})();

/* فلترة الأرشيف (+ دعم ?cat=) */
(function(){
  const grid = $('#archiveGrid'); if(!grid) return;
  const cards = [...grid.querySelectorAll('.post-card')];
  const chips = [...document.querySelectorAll('#archiveCats .cat-chip')];
  function apply(cat){
    chips.forEach(b=>b.classList.toggle('on', b.dataset.cat===cat));
    cards.forEach(c=>c.style.display = (cat==='الكل'||c.dataset.cat===cat) ? '' : 'none');
  }
  chips.forEach(b=>b.addEventListener('click', ()=>apply(b.dataset.cat)));
  const q = new URLSearchParams(location.search).get('cat');
  if(q && chips.some(b=>b.dataset.cat===q)) apply(q);
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
  if(link){ window.open(link, '_blank'); return; }
  addToCart(id);
  const d = document.getElementById('cartDrawer'); if(d) d.classList.add('open');
};

/* النماذج */
window.subscribe = function(e){ e.preventDefault(); e.target.reset(); showToast('🎉 تم الاشتراك! كتاب «خارطة الطريق» في طريقه إلى بريدك.'); };
window.contactSubmit = function(e){ e.preventDefault(); e.target.reset(); showToast('📨 استلمنا رسالتك وسنرد خلال 48 ساعة.'); };

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
    if(constraints.length) p += 'القيود:\n- ' + constraints.join('\n- ') + '\n\n';
    if(state.examples) p += 'قبل التنفيذ الكامل، أعطني مثالاً واحداً مختصراً على الناتج المتوقع لأوافق عليه.\n\n';
    p += 'إن نقصتك معلومة ضرورية لإتقان المهمة، اسألني عنها قبل أن تبدأ بدل افتراضها.';

    const out = document.getElementById('genOut');
    out.innerHTML = `
      ${missing.length?`<div class="gen-warn">💡 املأ (${missing.join('، ')}) ليكتمل الموجّه — أو انسخه الآن واستبدل ما بين الأقواس لاحقاً.</div>`:''}
      <div class="gen-result">
        <div class="gen-result-head"><strong>✅ موجّهك جاهز</strong>
          <button type="button" class="btn-ghost gen-copy">📋 نسخ</button></div>
        <pre id="genText">${p.replace(/</g,'&lt;')}</pre>
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
    else if(b.id==='genBuild'){ build(); }
  });
  wrap.addEventListener('input', e=>{
    if(e.target.dataset.k) state.vals[e.target.dataset.k]=e.target.value;
    if(e.target.id==='genEx') state.examples=e.target.checked;
  });
  render();
})();

/* تسجيل عامل الخدمة (PWA) */
if('serviceWorker' in navigator && location.protocol === 'https:'){
  navigator.serviceWorker.register(R + 'sw.js').catch(()=>{});
}
