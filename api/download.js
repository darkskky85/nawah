// api/download.js
// يتحقق من التوكن، يتأكد أنه لم ينتهِ، ثم يوجّه العميل لتحميل ملفه من التخزين الخاص.
import { list, put, del } from '@vercel/blob';

export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    return res.status(400).send('رابط غير صالح.');
  }

  try {
    // 1) نجلب سجل التوكن
    const { blobs } = await list({
      prefix: `tokens/${token}.json`,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!blobs.length) {
      return res.status(404).send('انتهت صلاحية الرابط أو غير موجود. تواصل معنا لإعادة الإرسال.');
    }

    // نقرأ محتوى السجل
    const recordRes = await fetch(blobs[0].url);
    const record = await recordRes.json();

    // 2) نتأكد من الصلاحية الزمنية
    if (Date.now() > record.expiresAt) {
      return res.status(410).send('انتهت صلاحية رابط التحميل (ساعة واحدة). تواصل معنا لإعادة الإرسال.');
    }

    // 3) نتأكد من عدد التحميلات
    if (record.downloads >= record.maxDownloads) {
      return res.status(429).send('تم استنفاد عدد مرات التحميل المسموحة. تواصل معنا.');
    }

    // 4) نجلب الملف الحقيقي من التخزين الخاص
    const { blobs: files } = await list({
      prefix: `files/${record.file}`,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!files.length) {
      console.error(`الملف غير موجود: files/${record.file}`);
      return res.status(500).send('الملف غير متاح حالياً. تواصل معنا وسنرسله يدوياً.');
    }

    // 5) نحدّث عداد التحميلات
    record.downloads += 1;
    await put(`tokens/${token}.json`, JSON.stringify(record), {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    // 6) نوجّه العميل لتحميل ملفه
    return res.redirect(302, files[0].url);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).send('حدث خطأ. تواصل معنا وسنرسل ملفك يدوياً.');
  }
}
