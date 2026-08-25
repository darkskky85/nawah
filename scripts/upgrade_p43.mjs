import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "articles", "p43.html");
let html = await readFile(path, "utf8");

const block = `<h2 id="s1">للكتابة والبحث: خمسة مساعدين مجانيين بأسماء واضحة</h2>
<p>عبارة «مجاني» هنا لا تعني بلا حدود، ولا تعني أن المنتج سيبقى بالخطة نفسها إلى الأبد. المقصود أن الأداة تملك خطة مجانية دائمة يمكن بدء العمل بها من دون بطاقة دفع. راجعنا صفحات الخطط الرسمية في أغسطس 2026، ووضعنا أمام كل أداة الحد الذي سيجعلك تفكر في الترقية بدلاً من إخفائه.</p>
<div class="verified-tools">
  <article class="vt-card"><span>01 / كتابة وتحليل</span><h3>ChatGPT Free</h3><p>مناسب للمسودات، التلخيص، العصف الذهني، البحث على الويب، وتجربة تحليل الملفات والصور. الخطة المجانية تمنح وظائف متعددة لكن بحدود أقل للرسائل والملفات والصور والبحث المعمّق؛ عند بلوغ السقف تنتظر إعادة الضبط أو تنتقل لخطة مدفوعة.</p><div><b>يكفيك إذا:</b> استخدامك متقطع وتراجع الناتج بنفسك.</div><div><b>لا يكفي إذا:</b> تعتمد عليه طوال يوم العمل أو تحتاج حدوداً ثابتة.</div><a href="https://openai.com/chatgpt/pricing/" target="_blank" rel="noopener noreferrer">صفحة الخطة الرسمية ↗</a></article>
  <article class="vt-card"><span>02 / مستندات وكتابة</span><h3>Claude Free</h3><p>خيار قوي لتحرير النصوص، تحليل الصور والمستندات، كتابة الكود، والبحث عبر الويب. الخطة المجانية متاحة على الويب والجوال وسطح المكتب، لكن سعتها محدودة وتتأثر بطول المحادثة والملفات والضغط على الخدمة.</p><div><b>يكفيك إذا:</b> لديك مهمتان أو ثلاث عميقة في اليوم.</div><div><b>لا يكفي إذا:</b> تدير مشاريع طويلة ومستندات كثيرة باستمرار.</div><a href="https://www.anthropic.com/pricing?subjects=claude&type=product" target="_blank" rel="noopener noreferrer">صفحة الخطة الرسمية ↗</a></article>
  <article class="vt-card"><span>03 / منظومة جوجل</span><h3>Gemini Free</h3><p>يتطلب حساب جوجل ويمنح مساعداً عاماً مع توليد الصور وتحريرها، Gemini Live، Canvas، Gems، ووصول متفاوت إلى النماذج والبحث المعمّق. كلمة «متفاوت» مهمة: السعة والنماذج الأعلى ليست مضمونة بلا حدود.</p><div><b>يكفيك إذا:</b> تريد مساعداً يومياً مرتبطاً بخدمات جوجل.</div><div><b>لا يكفي إذا:</b> تحتاج حدوداً مرتفعة أو مزايا Google Workspace داخل التطبيقات.</div><a href="https://gemini.google/us/subscriptions/?hl=en" target="_blank" rel="noopener noreferrer">صفحة الخطة الرسمية ↗</a></article>
  <article class="vt-card"><span>04 / بحث بالمصادر</span><h3>Perplexity Standard</h3><p>مفيد عندما تريد إجابة مرتبطة بروابط يمكن فتحها. الخطة المجانية توفر بحثاً أساسياً واسعاً، وعدداً محدوداً من عمليات Pro Search ورفع الملفات، بينما تختار الخدمة النموذج تلقائياً ولا تمنحك الاختيار اليدوي للنماذج المتقدمة.</p><div><b>يكفيك إذا:</b> بحثك يومي سريع وتتحقق من الروابط.</div><div><b>لا يكفي إذا:</b> تجري أبحاثاً كثيفة أو تحتاج نماذج بعينها.</div><a href="https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you" target="_blank" rel="noopener noreferrer">تفاصيل الخطة الرسمية ↗</a></article>
  <article class="vt-card"><span>05 / مساعد عام</span><h3>Microsoft Copilot</h3><p>يقدم تجربة مجانية أساسية للمحادثة، الأفكار، البحث، إنشاء الصور ورفع الملفات بحسب السعة المتاحة. الاشتراكات تضيف حدوداً أعلى وتكاملاً أعمق مع Word وExcel وPowerPoint؛ لذلك لا تخلط بين Copilot المجاني وCopilot داخل تطبيقات Microsoft 365.</p><div><b>يكفيك إذا:</b> تريد مساعداً عاماً سريعاً على أجهزة متعددة.</div><div><b>لا يكفي إذا:</b> هدفك الأتمتة داخل ملفات Office المكتبية.</div><a href="https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/" target="_blank" rel="noopener noreferrer">الوصف الرسمي للخدمة ↗</a></article>
</div>

<h2 id="s2">للبحث والتصميم: أدوات مجانية بحدود قابلة للقياس</h2>
<div class="verified-tools">
  <article class="vt-card"><span>06 / معرفة موثقة</span><h3>NotebookLM</h3><p>ترفع إليه ملفاتك وروابطك ثم تسأله من داخل تلك المصادر مع إحالات واضحة. الوصول القياسي يدعم حتى 100 دفتر، و50 مصدراً في الدفتر، و500 ألف كلمة للمصدر، مع حدود يومية للمحادثات والملخصات الصوتية قابلة للتغيير.</p><div><b>يكفيك إذا:</b> تراجع مقرراً أو تقريراً أو مكتبة ملفات محددة.</div><div><b>لا يكفي إذا:</b> تحتاج مشاركة متقدمة أو أحجاماً مؤسسية كبيرة.</div><a href="https://support.google.com/notebooklm/answer/16215270" target="_blank" rel="noopener noreferrer">حدود المصادر الرسمية ↗</a></article>
  <article class="vt-card"><span>07 / تصميم ومحتوى</span><h3>Canva Free</h3><p>يوفر محرراً كاملاً وملايين العناصر والقوالب مع حصة للذكاء الاصطناعي. وفق صفحة الأسعار، قد تصل الحصة المجانية إلى 200 استخدام للأدوات القياسية أو 20 استخداماً للأدوات الممتازة، ويتغير الاستهلاك بحسب نوع المهمة.</p><div><b>يكفيك إذا:</b> تصمم منشورات وعروضاً بسيطة بوتيرة معتدلة.</div><div><b>لا يكفي إذا:</b> تحتاج أصولاً ممتازة أو Brand Kits وتغيير المقاسات بكثافة.</div><a href="https://www.canva.com/pricing/" target="_blank" rel="noopener noreferrer">صفحة الأسعار الرسمية ↗</a></article>
  <article class="vt-card"><span>08 / تصميم وتحرير سريع</span><h3>Adobe Express Free</h3><p>يضم أدوات تحرير الصور والفيديو والمستندات، قوالب وأصولاً مجانية، وجدولة محدودة، مع توليدات يومية محدودة لبعض مزايا Firefly. لا تفترض أن كل أداة Adobe التوليدية مجانية؛ راقب عداد الاستخدام قبل بدء مشروع طويل.</p><div><b>يكفيك إذا:</b> تنشئ قطعاً سريعة وتحتاج تصديراً مألوفاً.</div><div><b>لا يكفي إذا:</b> تعتمد على أصول Premium أو توليد كثيف ومتكرر.</div><a href="https://www.adobe.com/express/pricing" target="_blank" rel="noopener noreferrer">صفحة الأسعار الرسمية ↗</a></article>
</div>

<h2 id="s3">للصوت والنماذج المفتوحة: المجاني مفيد لكن له شروط استخدام</h2>
<div class="verified-tools verified-tools-two">
  <article class="vt-card"><span>09 / صوت اصطناعي</span><h3>ElevenLabs Free</h3><p>الخطة المجانية تمنح 10 آلاف رصيد شهرياً، بما يقارب عشر دقائق من تحويل النص إلى صوت بحسب النموذج، وتشمل أدوات للصوت والمؤثرات والتفريغ. المحتوى المجاني ليس للاستخدام التجاري، ويلزم نسبه إلى ElevenLabs عند النشر غير التجاري؛ وهذه نقطة يتجاهلها كثيرون.</p><div><b>يكفيك إذا:</b> تختبر صوتاً أو تنتج نموذجاً شخصياً قصيراً.</div><div><b>لا يكفي إذا:</b> تنشر إعلاناً أو دورة مدفوعة أو تحتاج استنساخ صوت.</div><a href="https://elevenlabs.io/pricing" target="_blank" rel="noopener noreferrer">الأسعار والحقوق الرسمية ↗</a></article>
  <article class="vt-card"><span>10 / نماذج مفتوحة</span><h3>HuggingChat</h3><p>واجهة محادثة من Hugging Face تشغّل نماذج مفتوحة متعددة وتستخدم توجيهاً آلياً لاختيار النموذج. عادت الخدمة بنظام أرصدة استدلال للمستخدمين المجانيين؛ لذلك هي ممتازة للتجربة والمقارنة، وليست وعداً باستخدام غير محدود أو خدمة إنتاجية ثابتة.</p><div><b>يكفيك إذا:</b> تريد مقارنة نماذج مفتوحة وفهم اختلافها.</div><div><b>لا يكفي إذا:</b> تحتاج اتفاقية خدمة أو سعة مضمونة لفريق.</div><a href="https://huggingface.co/chat/" target="_blank" rel="noopener noreferrer">الخدمة الرسمية ↗</a></article>
</div>

<h2 id="s4">كيف تختار: متى يكون المجاني قراراً ذكياً؟</h2>
<p>ابدأ بمهمة واحدة تتكرر أسبوعياً، ثم اختبر أداتين فقط على المدخل نفسه. سجّل زمن الوصول إلى نتيجة قابلة للاستخدام، عدد التعديلات، وهل تستطيع تصدير عملك بصيغة عادية. لا تدفع لأن الخطة المجانية أظهرت لك نافذة ترقية؛ ادفع عندما يكلّفك الحد المجاني وقتاً أكبر من قيمة الاشتراك، أو عندما تحتاج حقاً تجارياً أو خصوصية أو تكاملاً لا توفره الخطة الأساسية.</p>
<div class="decision-strip"><div><span>ابقَ مجاناً</span><b>استخدام متقطع · مشروع شخصي · قابلية انتظار إعادة الحد</b></div><div><span>فكّر بالترقية</span><b>استخدام يومي · ملفات كثيرة · حقوق تجارية · تعاون فريق</b></div></div>

<h2 id="s_compare">جدول القرار: ما الذي تحصل عليه فعلاً؟</h2>
<div class="table-wrap"><table class="truth-table"><thead><tr><th>الأداة</th><th>أفضل استخدام مجاني</th><th>الحد الذي ستشعر به</th><th>سبب منطقي للترقية</th></tr></thead><tbody>
<tr><td>ChatGPT</td><td>كتابة وتحليل عام</td><td>رسائل وملفات وصور محدودة</td><td>استخدام يومي كثيف</td></tr>
<tr><td>Claude</td><td>نصوص ومستندات</td><td>سعة المحادثات الطويلة</td><td>مشاريع وبحث موسّع</td></tr>
<tr><td>Gemini</td><td>مساعد ضمن جوجل</td><td>وصول متفاوت للنماذج</td><td>تكامل Workspace وحدود أعلى</td></tr>
<tr><td>Perplexity</td><td>بحث بالمصادر</td><td>Pro Search والملفات</td><td>بحث احترافي متكرر</td></tr>
<tr><td>Copilot</td><td>محادثة وصور</td><td>السعة والتكامل المكتبي</td><td>العمل داخل Microsoft 365</td></tr>
<tr><td>NotebookLM</td><td>أسئلة من ملفاتك</td><td>عدد المصادر والمخرجات اليومية</td><td>مكتبات ومشاركة أكبر</td></tr>
<tr><td>Canva</td><td>تصميم سريع</td><td>حصة AI والأصول الممتازة</td><td>علامة تجارية وإنتاج كثيف</td></tr>
<tr><td>Adobe Express</td><td>تحرير وقوالب</td><td>الأصول والتوليد اليومي</td><td>أصول Premium ورصيد أكبر</td></tr>
<tr><td>ElevenLabs</td><td>تجربة الصوت</td><td>10 آلاف رصيد وغياب الحق التجاري</td><td>نشر تجاري وصوت أطول</td></tr>
<tr><td>HuggingChat</td><td>تجربة نماذج مفتوحة</td><td>أرصدة وسعة متغيرة</td><td>اختر خدمة مستقرة أو تشغيل محلي</td></tr>
</tbody></table></div>
<p class="source-note"><strong>ملاحظة تحريرية:</strong> الخطط والحدود تتغير باستمرار. تاريخ التحقق: 25 أغسطس 2026. الروابط داخل كل بطاقة تقود إلى المصدر الرسمي؛ راجعها قبل قرار شراء أو استخدام تجاري.</p>
`;

html = html.replace(/<h2 id="s1">[\s\S]*?(?=<section class="nawah-field-guide")/, block);
await writeFile(path, html, "utf8");
console.log("Upgraded p43 with ten named tools and verified plan limits.");
