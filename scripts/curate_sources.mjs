import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..','articles');

const S={
  openai:['https://openai.com/chatgpt/pricing','خطط ChatGPT الرسمية'],
  claude:['https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan','دليل Anthropic الرسمي لاختيار خطة Claude'],
  google:['https://one.google.com/about/plans','خطط Google AI الرسمية'],
  notebook:['https://support.google.com/notebooklm/answer/16215270','حدود NotebookLM الرسمية'],
  canva:['https://www.canva.com/pricing/','خطط Canva الرسمية'],
  runway:['https://runway.com/pricing','خطط Runway وحدود الرصيد'],
  eleven:['https://elevenlabs.io/pricing','خطط ElevenLabs الرسمية'],
  wipo:['https://www.wipo.int/en/web/frontier-technologies/artificial-intelligence/index','منظمة WIPO: الذكاء الاصطناعي والملكية الفكرية'],
  c2pa:['https://spec.c2pa.org/specifications/specifications/2.2/index.html','مواصفة C2PA لأصل المحتوى الرقمي'],
  people:['https://developers.google.com/search/docs/fundamentals/creating-helpful-content','إرشادات Google للمحتوى المفيد'],
  oecd:['https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/04/the-impact-of-artificial-intelligence-on-productivity-distribution-and-growth_d54e2842/8d900037-en.pdf','دراسة OECD عن أثر الذكاء الاصطناعي في الإنتاجية والنمو'],
  wef:['https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/','تقرير مستقبل الوظائف 2025'],
  monshaatAI:['https://monshaat.gov.sa/ar/node/209381','مبادرة منشآت لتمكين الشركات بأدوات الذكاء الاصطناعي'],
  monshaatEcom:['https://www.monshaat.gov.sa/ar/node/165478','تقرير منشآت عن التجارة الإلكترونية في المملكة'],
  monshaatPrograms:['https://www.monshaat.gov.sa/ar/ecommerce','برامج وخدمات التجارة الإلكترونية من منشآت'],
  monshaatReports:['https://www.monshaat.gov.sa/ar/monshaat-reports','تقارير ومرصد منشآت'],
  nist:['https://www.nist.gov/itl/ai-risk-management-framework','إطار NIST لإدارة مخاطر الذكاء الاصطناعي'],
  owasp:['https://genai.owasp.org/initiatives/top-10-for-llm-and-genai/','قائمة OWASP لمخاطر تطبيقات GenAI']
};

const groups=[
  [['p10','p13'],['openai','claude','google']],
  [['p12'],['openai','claude','google']],
  [['p43'],['openai','canva','notebook']],
  [['p5'],['wipo','canva','openai']],
  [['p28','p39'],['runway','eleven','wipo']],
  [['p33','p35','p38','p42'],['people','wipo','c2pa']],
  [['p7'],['monshaatEcom','monshaatPrograms','monshaatReports']],
  [['p20'],['monshaatAI','monshaatReports','oecd']],
  [['p30'],['nist','owasp','oecd']],
  [['p11','p19','p29','p40','p6'],['monshaatAI','oecd','wef']],
  [['p18','p45'],['oecd','wef','monshaatReports']]
];

for(const [files,keys] of groups){
  const nav=keys.map(k=>`<a href="${S[k][0]}" target="_blank" rel="noopener noreferrer">${S[k][1]}<span aria-hidden="true">↗</span></a>`).join('');
  for(const file of files){
    const path=join(ROOT,`${file}.html`); let html=await readFile(path,'utf8');
    html=html.replace(/<div class="nfg-sources"><div><span>مصادر أصلية للمتابعة<\/span><small>[\s\S]*?<\/small><\/div><nav aria-label="مصادر المقال">[\s\S]*?<\/nav><\/div>/,`<div class="nfg-sources"><div><span>مصادر أولية مرتبطة بالموضوع</span><small>فُحصت الروابط في 2026-08-25؛ راجع الخطط والميزات المتغيرة قبل القرار.</small></div><nav aria-label="مصادر المقال">${nav}</nav></div>`);
    await writeFile(path,html,'utf8');
  }
}
console.log('Curated primary sources for 21 articles.');
