/* ============================================================
   محرّك فحص السيرة الذاتية ATS — نَوَاة
   قواعد احترافية مبنية على معايير 2026 العالمية
   ============================================================ */
const ATS = (function(){

  // ---- قواميس مرجعية ----
  const ACTION_VERBS = ['قاد','أدار','طوّر','أنشأ','صمّم','نفّذ','حقّق','زاد','خفّض','حسّن','أطلق','بنى',
    'أنجز','أشرف','نسّق','حلّل','رفع','وفّر','ضاعف','قلّص','أعاد','أسّس','درّب','وجّه','استقطب','أبرم',
    'led','managed','developed','created','designed','implemented','achieved','increased','reduced',
    'improved','launched','built','delivered','spearheaded','optimized','generated','drove','built'];

  const SECTION_PATTERNS = {
    contact:   { ar:['البريد','الهاتف','جوال','تواصل','ايميل'], re:[/[\w.+-]+@[\w-]+\.[\w.]+/, /(\+?\d[\d\s-]{7,})/] },
    summary:   { ar:['الملخص','نبذة','الهدف','نبذة مهنية','الملف الشخصي','summary','profile','objective'] },
    experience:{ ar:['الخبرة','الخبرات','الخبرة العملية','التجربة','experience','work history'] },
    education: { ar:['التعليم','المؤهلات','الدراسة','الشهادات','education','qualifications'] },
    skills:    { ar:['المهارات','الكفاءات','skills','competencies','expertise'] },
  };

  const SOFT_FILLERS = ['مسؤول عن','عملت على','قمت بـ','كنت','شاركت في','مهامي','responsible for','worked on','duties included','helped with'];

  // كلمات مفتاحية شائعة الطلب (للكشف عن النقص حسب المجال)
  const KEYWORD_BANK = {
    'عام': ['قيادة فريق','إدارة المشاريع','حل المشكلات','التواصل','العمل الجماعي','اتخاذ القرار','تحليل البيانات'],
    'تقني': ['Python','SQL','Git','API','Cloud','Agile','تطوير','أتمتة','قواعد البيانات','الأمن السيبراني'],
    'تسويق': ['SEO','تحليل السوق','إدارة الحملات','وسائل التواصل','محتوى','نمو','تحويل','CRM','العائد على الاستثمار'],
    'إداري': ['الميزانية','التخطيط الاستراتيجي','إدارة العمليات','مؤشرات الأداء','تحسين العمليات','القيادة'],
    'مالي': ['التحليل المالي','الميزانيات','التنبؤ','المحاسبة','إدارة المخاطر','Excel','النمذجة المالية'],
  };

  // ---- أدوات مساعدة ----
  const norm = s => (s||'').replace(/[ًٌٍَُِّْ]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').toLowerCase();
  const countMatches = (text, arr) => arr.reduce((n,w)=> n + (norm(text).includes(norm(w))?1:0), 0);
  const hasAny = (text, arr) => arr.some(w => norm(text).includes(norm(w)));

  // ---- التحليل الرئيسي ----
  function analyze(raw, targetRole){
    const text = (raw||'').trim();
    const lower = norm(text);
    const words = text.split(/\s+/).filter(Boolean);
    const lines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);
    const wordCount = words.length;
    const R = { found:{}, flags:[], strengths:[], weaknesses:[], missingKw:[], atsErrors:[], suggestions:[] };

    // كشف الأقسام
    for(const [key,def] of Object.entries(SECTION_PATTERNS)){
      let present = hasAny(text, def.ar);
      if(def.re) present = present || def.re.some(rx => rx.test(text));
      R.found[key] = present;
    }

    // أرقام وإحصائيات
    const numbers = (text.match(/\d+([.,]\d+)?\s*(%|٪|\$|ريال|alf|ألف|k|مليون|m|x|\+)?/gi)||[]);
    const percentCount = (text.match(/\d+\s*[%٪]/g)||[]).length;
    const actionVerbCount = countMatches(text, ACTION_VERBS);
    const fillerCount = countMatches(text, SOFT_FILLERS);
    const bulletCount = (text.match(/^[\s]*[•\-–▪✓*]/gm)||[]).length;
    const emailOk = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
    const phoneOk = /(\+?\d[\d\s-]{7,})/.test(text);
    const linkedinOk = /linkedin\.com|لينكد/i.test(text);

    // ===== 1) توافق ATS (100) =====
    let ats = 100;
    if(!R.found.contact){ ats-=18; R.atsErrors.push(['لا يمكن استخراج معلومات التواصل','أنظمة ATS تبحث عن بريد وهاتف بصيغة واضحة في الأعلى؛ غيابهما قد يُسقط السيرة آلياً.']); }
    if(!emailOk){ ats-=8; R.atsErrors.push(['البريد الإلكتروني غير واضح أو مفقود','اكتب بريداً مهنياً بصيغة قياسية name@domain.com في رأس السيرة.']); }
    if(!R.found.experience){ ats-=14; R.atsErrors.push(['قسم الخبرة غير مكتشف بعنوان قياسي','استخدم عنواناً صريحاً «الخبرة العملية» لأن ATS يصنّف المحتوى تحت العناوين القياسية.']); }
    if(!R.found.education){ ats-=8; R.atsErrors.push(['قسم التعليم غير واضح','أضف قسماً بعنوان «التعليم» يحوي الشهادة والجهة والسنة.']); }
    if(!R.found.skills){ ats-=10; R.atsErrors.push(['قسم المهارات مفقود','ATS يطابق المهارات مع متطلبات الوظيفة؛ أضف قسم «المهارات» بكلمات مفتاحية واضحة.']); }
    if(bulletCount < 3){ ats-=6; R.atsErrors.push(['ضعف استخدام النقاط','النقاط ترفع قابلية القراءة الآلية والبشرية؛ حوّل الفقرات الطويلة لنقاط.']); }
    if(wordCount < 150){ ats-=8; R.atsErrors.push(['محتوى قليل جداً','السيرة قصيرة بشكل يصعّب على ATS استخراج بيانات كافية.']); }
    ats = Math.max(0, Math.min(100, ats));

    // ===== 2) قوة المحتوى (100) =====
    let content = 60;
    if(percentCount>=3) content+=14; else if(percentCount>=1) content+=7;
    else R.weaknesses.push(['غياب الأرقام والنسب','الإنجازات بلا أرقام تفقد قوتها. مثال: بدل «حسّنت الأداء» اكتب «رفعت الأداء 35% خلال 6 أشهر».']);
    if(actionVerbCount>=6) content+=16; else if(actionVerbCount>=3) content+=8;
    else R.weaknesses.push(['ضعف أفعال الإنجاز','ابدأ كل نقطة بفعل قوي (قاد، طوّر، حقّق) بدل «مسؤول عن».']);
    if(numbers.length>=5) content+=10;
    if(fillerCount>=3){ content-=10; R.weaknesses.push(['عبارات إنشائية ضعيفة','استبدل «كنت مسؤولاً عن» و«عملت على» بأفعال إنجاز محددة بنتائج.']); }
    content = Math.max(0, Math.min(100, content));

    // ===== 3) الاحترافية (100) =====
    let prof = 70;
    if(R.found.summary) prof+=12; else R.weaknesses.push(['غياب الملخص المهني','أضف ملخصاً من 3-4 أسطر أعلى السيرة يبرز تخصصك وأبرز إنجاز وقيمتك.']);
    if(linkedinOk) prof+=6; else R.suggestions.push('أضف رابط LinkedIn مهني — 87% من مسؤولي التوظيف يراجعونه.');
    if(wordCount>=250 && wordCount<=750) prof+=12;
    const repeats = (lower.match(/مسؤول عن/g)||[]).length;
    if(repeats>=3){ prof-=8; }
    prof = Math.max(0, Math.min(100, prof));

    // ===== 4) التنافسية (100) =====
    let comp = 55;
    if(percentCount>=2) comp+=15;
    if(actionVerbCount>=5) comp+=12;
    if(R.found.skills) comp+=10;
    if(R.found.summary) comp+=8;
    // الكلمات المفتاحية المفقودة
    let bank = KEYWORD_BANK['عام'].slice();
    const roleN = norm(targetRole||'');
    if(/تقن|برمج|مطور|software|develop|data|بيانات/.test(roleN)) bank = bank.concat(KEYWORD_BANK['تقني']);
    if(/تسويق|market|محتوى|سوشيال/.test(roleN)) bank = bank.concat(KEYWORD_BANK['تسويق']);
    if(/مدير|اداره|قياد|manage|عمليات/.test(roleN)) bank = bank.concat(KEYWORD_BANK['إداري']);
    if(/مالي|محاسب|finance|account/.test(roleN)) bank = bank.concat(KEYWORD_BANK['مالي']);
    R.missingKw = bank.filter(k => !norm(text).includes(norm(k))).slice(0,10);
    if(R.missingKw.length<=3) comp+=10;
    comp = Math.max(0, Math.min(100, comp));

    // ===== 5) التصميم والتنظيم (100) =====
    let design = 65;
    const sectionsFound = Object.values(R.found).filter(Boolean).length;
    design += sectionsFound*6;
    if(wordCount>800){ design-=12; R.weaknesses.push(['السيرة طويلة','الطول المثالي صفحة-صفحتان (400-700 كلمة). اختصر لأبرز ما يخدم الوظيفة المستهدفة.']); }
    if(wordCount<150){ design-=15; }
    if(bulletCount>=5) design+=8;
    design = Math.max(0, Math.min(100, design));

    // ===== نقاط القوة =====
    if(percentCount>=3) R.strengths.push(['إنجازات مدعومة بالأرقام',`وجدنا ${percentCount} نسبة مئوية — هذا يقوّي مصداقية إنجازاتك أمام المُوظِّف وATS.`]);
    if(actionVerbCount>=6) R.strengths.push(['لغة إنجاز قوية','استخدامك أفعال الإنجاز يعطي انطباعاً بالمبادرة والأثر.']);
    if(R.found.summary) R.strengths.push(['ملخص مهني واضح','وجود الملخص يساعد المُوظِّف على فهم هويتك في ثوانٍ.']);
    if(R.found.skills) R.strengths.push(['قسم مهارات موجود','يسهّل على ATS مطابقة كفاءاتك مع متطلبات الوظيفة.']);
    if(emailOk && phoneOk) R.strengths.push(['معلومات تواصل قابلة للاستخراج','بريدك وهاتفك بصيغة يقرؤها ATS بسهولة.']);
    if(R.strengths.length===0) R.strengths.push(['أساس قابل للتطوير','السيرة تحوي محتوى يمكن البناء عليه بتطبيق التوصيات أدناه.']);

    // ===== اقتراحات عامة =====
    if(!R.found.summary) R.suggestions.push('أضف ملخصاً مهنياً: «مطوّر برمجيات بخبرة 5 سنوات في بناء أنظمة سحابية، رفعت كفاءة المعالجة 40% لـ3 شركات».');
    if(percentCount<2) R.suggestions.push('حوّل مهامك إلى إنجازات بأرقام: «أدرت فريقاً» ← «قدت فريقاً من 8 أعضاء حقّق نمواً 25% في المبيعات».');
    if(!R.found.skills) R.suggestions.push('أضف قسم مهارات مقسّماً: مهارات تقنية، أدوات، لغات — بكلمات مفتاحية تطابق إعلان الوظيفة.');
    if(fillerCount>=2) R.suggestions.push('احذف العبارات الإنشائية واستبدلها بنتائج قابلة للقياس.');
    R.suggestions.push('طابق كلمات سيرتك مع إعلان الوظيفة المستهدفة — ATS يقيس نسبة التطابق حرفياً.');

    // ===== الدرجات النهائية =====
    const scores = { ats, content, prof, comp, design };
    const total = Math.round((ats*0.30 + content*0.25 + prof*0.15 + comp*0.20 + design*0.10));

    // احتمالات
    const atsPass = Math.min(98, Math.max(20, Math.round(ats*0.7 + content*0.3)));
    const interview = Math.min(95, Math.max(10, Math.round(total*0.6 + comp*0.4) - 8));

    // تقييم المُوظِّف (30 ثانية)
    let recruiterView;
    if(total>=90) recruiterView = 'سيرة قوية ولافتة. خلال 30 ثانية تظهر الهوية المهنية والإنجازات بوضوح. مرشّح جاد سأنتقل لمقابلته.';
    else if(total>=75) recruiterView = 'سيرة جيدة ومنظمة، لكن تنقصها بعض اللمسات (أرقام أوضح أو ملخص أقوى) لتنتقل من «مقبول» إلى «لا بد من مقابلته».';
    else if(total>=60) recruiterView = 'سيرة بها محتوى، لكنها لا تبرز سريعاً. في 30 ثانية لا أرى ما يميّزها عن العشرات. تحتاج إبراز الإنجازات والأثر.';
    else recruiterView = 'صراحةً، خلال 30 ثانية لا أجد ما يمسكني. غياب الأرقام والأقسام الواضحة يجعلني أنتقل للسيرة التالية. تحتاج إعادة بناء.';

    return { scores, total, atsPass, interview, recruiterView, ...R, stats:{wordCount, percentCount, actionVerbCount, bulletCount} };
  }

  function rating(total){
    if(total>=90) return {label:'ممتاز', emoji:'🟢', cls:'ats-excellent'};
    if(total>=75) return {label:'جيد جداً', emoji:'🟡', cls:'ats-good'};
    if(total>=60) return {label:'يحتاج تحسين', emoji:'🟠', cls:'ats-fair'};
    return {label:'ضعيف', emoji:'🔴', cls:'ats-weak'};
  }


  // ---- مقارنة مع إعلان وظيفة: استخراج الكلمات المفتاحية وحساب التطابق ----
  const STOP_WORDS = ['في','من','على','إلى','عن','مع','هذا','هذه','التي','الذي','أو','و','ال','هو','هي',
    'كان','يكون','قد','لا','ما','أن','إن','كل','بعض','عند','بين','the','and','or','of','to','in','for',
    'with','a','an','is','are','will','be','as','at','on','by','this','that','we','you','our','your'];

  function extractKeywords(text){
    const words = norm(text).split(/[\s,،.:;()\[\]\-\/|]+/).filter(w => w.length>2 && !STOP_WORDS.includes(w));
    const freq = {};
    words.forEach(w => freq[w] = (freq[w]||0)+1);
    // نرتّب بالأهمية (التكرار) ونأخذ أبرزها
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  }

  function matchJob(cvText, jobText){
    const jobKw = extractKeywords(jobText).slice(0, 25);  // أبرز 25 كلمة في الإعلان
    const cvNorm = norm(cvText);
    const matched = [], missing = [];
    jobKw.forEach(kw => {
      if(cvNorm.includes(kw)) matched.push(kw); else missing.push(kw);
    });
    const rate = jobKw.length ? Math.round((matched.length/jobKw.length)*100) : 0;
    return { rate, matched: matched.slice(0,15), missing: missing.slice(0,15), totalKw: jobKw.length };
  }

  // ---- تمييز المشاكل داخل النص ----
  function highlightIssues(text){
    const lines = text.split('\n');
    const out = [];
    lines.forEach(line => {
      if(!line.trim()){ out.push({type:'blank', text:''}); return; }
      const ln = norm(line);
      // عبارة ضعيفة
      const weak = SOFT_FILLERS.find(f => ln.includes(norm(f)));
      // إنجاز قوي (فعل + رقم)
      const hasNum = /\d+\s*[%٪]|\d{2,}/.test(line);
      const hasVerb = ACTION_VERBS.some(v => ln.includes(norm(v)));
      if(weak){ out.push({type:'weak', text:line, hint:'عبارة إنشائية — استبدلها بإنجاز محدّد'}); }
      else if(hasNum && hasVerb){ out.push({type:'strong', text:line, hint:'إنجاز قوي مدعوم برقم ✓'}); }
      else if(hasVerb){ out.push({type:'ok', text:line}); }
      else { out.push({type:'plain', text:line}); }
    });
    return out;
  }

  // ---- أمثلة قبل/بعد حسب نوع الضعف ----
  const BEFORE_AFTER = {
    'no_numbers': { before:'مسؤول عن زيادة المبيعات', after:'قُدت مبادرة رفعت المبيعات 35% خلال سنة (من 2 إلى 2.7 مليون ريال)' },
    'weak_verb':  { before:'عملت على تطوير الموقع', after:'طوّرت موقعاً جديداً قلّل زمن التحميل 50% وزاد التحويل 18%' },
    'no_summary': { before:'(بلا ملخص)', after:'مطوّر برمجيات بخبرة 5 سنوات في الأنظمة السحابية، رفعت كفاءة المعالجة 40% لـ3 شركات ناشئة' },
    'vague':      { before:'لديّ مهارات قيادية ممتازة', after:'قدت فريقاً من 8 مطورين عبر 3 مشاريع سُلّمت قبل موعدها' },
    'no_skills':  { before:'(بلا قسم مهارات)', after:'المهارات: Python · SQL · إدارة المشاريع (Agile) · تحليل البيانات · القيادة' },
  };

  function pickExamples(r){
    const ex = [];
    if(r.stats.percentCount < 2) ex.push(BEFORE_AFTER.no_numbers);
    if(r.stats.actionVerbCount < 5) ex.push(BEFORE_AFTER.weak_verb);
    if(!r.found.summary) ex.push(BEFORE_AFTER.no_summary);
    if(!r.found.skills) ex.push(BEFORE_AFTER.no_skills);
    ex.push(BEFORE_AFTER.vague);
    return ex.slice(0,4);
  }

  return { analyze, rating, matchJob, highlightIssues, pickExamples };
})();
