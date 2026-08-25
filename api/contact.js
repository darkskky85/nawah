const attempts=new Map();

function allowed(req){
  const ip=req.headers['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';
  const now=Date.now(), recent=(attempts.get(ip)||[]).filter(t=>now-t<10*60_000);
  recent.push(now); attempts.set(ip,recent);
  return recent.length<=5;
}
function validEmail(value=''){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)&&value.length<=254;}
function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({message:'طريقة الطلب غير مدعومة.'});
  if(!allowed(req)) return res.status(429).json({message:'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.'});

  let body={};
  try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});}catch(e){return res.status(400).json({message:'صيغة الطلب غير صالحة.'});}
  if(body.website) return res.status(200).json({ok:true});
  const name=String(body.name||'').trim().slice(0,100);
  const email=String(body.email||'').trim().toLowerCase();
  const subject=String(body.subject||'').trim().slice(0,160);
  const message=String(body.message||'').trim().slice(0,6000);
  if(name.length<2||!validEmail(email)||subject.length<3||message.length<10){
    return res.status(400).json({message:'أكمل الاسم والبريد والموضوع ورسالة واضحة من 10 أحرف على الأقل.'});
  }
  if(!process.env.RESEND_API_KEY){
    return res.status(503).json({message:'نموذج التواصل قيد الربط. أرسل رسالتك مباشرة إلى hello@nawah.ai.'});
  }

  try{
    const send=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:process.env.CONTACT_FROM_EMAIL||'نَوَاة <website@nawahlabs.com>',
        to:[process.env.CONTACT_TO_EMAIL||'hello@nawah.ai'],
        reply_to:email,
        subject:`رسالة من الموقع: ${subject}`,
        html:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>${escapeHtml(subject)}</h2><p><strong>المرسل:</strong> ${escapeHtml(name)} — ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g,'<br>')}</p><hr><small>المصدر: ${escapeHtml(body.source||'الموقع')}</small></div>`
      })
    });
    if(!send.ok) throw new Error(`Resend returned ${send.status}`);
    return res.status(200).json({ok:true});
  }catch(error){
    console.error('Contact delivery failed:',error);
    return res.status(502).json({message:'تعذّر إرسال الرسالة الآن. لم نسجلها؛ استخدم البريد المباشر.'});
  }
}
