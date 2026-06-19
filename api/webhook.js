// api/webhook.js
// يستقبل إشعار الدفع من Moyasar، يتحقق منه مباشرةً، ثم يولّد رابط تحميل موقّت.
import { put } from '@vercel/blob';
import crypto from 'crypto';

// ===== خريطة المنتجات: معرّف المنتج → اسم الملف في التخزين الخاص =====
// عند إنشاء رابط الدفع في Moyasar، ضع في Metadata: product_id = (5 أو 7 أو 9)
const PRODUCT_FILES = {
  5: 'nawah-prompts-library.zip',     // مكتبة الموجّهات
  7: 'six-figure-templates.pdf',      // كتاب قوالب ستة أرقام
  9: 'nawah-cv-templates.zip',        // قوالب السير الذاتية (المنتج الجديد)
};

export default async function handler(req, res) {
  // Moyasar ترسل POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;

    // 0) تأمين: نتحقق أن الإشعار قادم فعلاً من Moyasar عبر السر المشترك (shared_secret)
    //    اضبط WEBHOOK_SECRET في Vercel، وضع نفس القيمة في إعداد الويبهوك بلوحة Moyasar.
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = event?.secret_token || req.headers['x-webhook-secret'] || '';
      if (incomingSecret !== expectedSecret) {
        console.warn('رُفض إشعار ويبهوك: سر مشترك غير مطابق');
        return res.status(401).json({ error: 'unauthorized' });
      }
    } else {
      console.warn('WEBHOOK_SECRET غير مضبوط — يُنصح بضبطه لرفض الإشعارات المزوّرة.');
    }

    // 1) نتأكد أن الحدث هو "دفعة مكتملة"
    const payment = event?.data || event;
    const paymentId = payment?.id;
    const status = payment?.status;

    if (!paymentId) {
      return res.status(400).json({ error: 'No payment id' });
    }

    // 2) التحقق الحقيقي: نسأل Moyasar مباشرةً عن حالة الدفعة (لا نثق بالإشعار وحده)
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      console.error('MOYASAR_SECRET_KEY غير مضبوط');
      return res.status(500).json({ error: 'Server not configured' });
    }

    const verifyRes = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      },
    });
    const verified = await verifyRes.json();

    // 3) نتأكد أن الدفع ناجح فعلاً
    if (verified?.status !== 'paid') {
      console.log(`الدفعة ${paymentId} حالتها: ${verified?.status} — لا تسليم`);
      return res.status(200).json({ received: true, delivered: false });
    }

    // 4) نحدد المنتج من الـ metadata
    const productId = parseInt(verified?.metadata?.product_id, 10);
    const fileName = PRODUCT_FILES[productId];
    if (!fileName) {
      console.error(`منتج غير معروف: ${productId}`);
      return res.status(200).json({ received: true, delivered: false, reason: 'unknown product' });
    }

    // 5) نولّد توكن تحميل عشوائياً وموقّتاً (ساعة واحدة)
    const token = crypto.randomBytes(24).toString('hex');
    const record = {
      token,
      paymentId,
      productId,
      file: fileName,
      email: verified?.metadata?.email || verified?.source?.message || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // ساعة
      downloads: 0,
      maxDownloads: 5,
    };

    // نخزّن السجل في Blob خاص (باسم التوكن)
    await put(`tokens/${token}.json`, JSON.stringify(record), {
      access: 'public', // الرابط عشوائي وغير قابل للتخمين؛ يُقرأ فقط عبر التوكن
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const downloadUrl = `https://nawahlabs.com/api/download?token=${token}`;
    console.log(`✓ تسليم المنتج ${productId} للدفعة ${paymentId} → ${downloadUrl}`);

    // 6) (اختياري) أرسل الرابط بالبريد تلقائياً عبر Resend
    // أزل التعليق بعد ضبط RESEND_API_KEY
    /*
    if (record.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'نَوَاة <store@nawahlabs.com>',
          to: record.email,
          subject: 'رابط تحميل منتجك من نَوَاة',
          html: `<div dir="rtl" style="font-family:sans-serif">
            <h2>شكراً لشرائك من نَوَاة!</h2>
            <p>رابط تحميل منتجك (صالح لمدة ساعة):</p>
            <p><a href="${downloadUrl}">${downloadUrl}</a></p>
          </div>`,
        }),
      });
    }
    */

    // نعيد الرابط (يظهر في صفحة الشكر إن مرّرت paymentId)
    return res.status(200).json({ received: true, delivered: true, downloadUrl });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
