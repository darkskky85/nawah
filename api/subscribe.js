const attempts=new Map();

function allowed(req){
  const ip=req.headers['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';
  const now=Date.now(), recent=(attempts.get(ip)||[]).filter(t=>now-t<60_000);
  recent.push(now); attempts.set(ip,recent);
  return recent.length<=6;
}

function validEmail(value=''){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)&&value.length<=254;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({message:'طريقة الطلب غير مدعومة.'});
  if(!allowed(req)) return res.status(429).json({message:'محاولات كثيرة خلال دقيقة. انتظر قليلاً ثم أعد المحاولة.'});

  let body={};
  try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});}catch(e){return res.status(400).json({message:'صيغة الطلب غير صالحة.'});}
  if(body.website) return res.status(200).json({ok:true});
  const email=String(body.email||'').trim().toLowerCase();
  if(!validEmail(email)) return res.status(400).json({message:'أدخل بريداً إلكترونياً صحيحاً.'});

  const endpoint=process.env.NEWSLETTER_WEBHOOK_URL;
  if(!endpoint) return res.status(503).json({message:'خدمة النشرة قيد الإعداد حالياً. راسلنا على hello@nawah.ai وسنسجلك يدوياً.'});

  try{
    const headers={'Content-Type':'application/json'};
    if(process.env.NEWSLETTER_WEBHOOK_TOKEN) headers.Authorization=`Bearer ${process.env.NEWSLETTER_WEBHOOK_TOKEN}`;
    const forwarded=await fetch(endpoint,{
      method:'POST',headers,
      body:JSON.stringify({email,source:String(body.source||'website').slice(0,200),consent:true,double_opt_in:true,tags:['nawah-weekly'],submitted_at:new Date().toISOString()})
    });
    if(!forwarded.ok) throw new Error(`Newsletter provider returned ${forwarded.status}`);
    return res.status(200).json({ok:true});
  }catch(error){
    console.error('Newsletter subscription failed:',error);
    return res.status(502).json({message:'تعذّر تسجيل البريد الآن. لم نحفظ عنوانك؛ جرّب لاحقاً.'});
  }
}
