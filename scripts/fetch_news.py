#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكربت أخبار نَوَاة — يجلب أحدث أخبار الذكاء الاصطناعي من خلاصات RSS موثوقة،
ثم يصيغ لكل خبر ملخّصاً عربياً أصلياً عبر Claude API، ويكتب assets/news-data.js.

يعمل تلقائياً عبر GitHub Actions (انظر .github/workflows/news.yml).
لا ينسخ نصوص المصادر؛ يعيد صياغتها بالعربية ويحيل للمصدر الأصلي.

التشغيل المحلي للتجربة:
    export ANTHROPIC_API_KEY=sk-...
    python3 scripts/fetch_news.py
"""

import os, sys, json, re, time, html, urllib.request, urllib.error
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

# ---------- الإعدادات ----------
MAX_ITEMS = 12               # عدد الأخبار المعروضة
PER_FEED = 6                 # أقصى عدد مبدئي من كل خلاصة قبل الدمج
MODEL = "claude-haiku-4-5-20251001"   # نموذج سريع واقتصادي للصياغة
OUT_PATH = os.path.join("assets", "news-data.js")
STATE_PATH = os.path.join("scripts", "news-seen.json")  # لتجنّب إعادة صياغة نفس الخبر

# خلاصات RSS لمصادر تقنية معروفة (عناوين وروابط عامة)
FEEDS = [
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "شركات وتمويل"),
    ("The Verge AI",  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "منتجات"),
    ("VentureBeat AI","https://venturebeat.com/category/ai/feed/", "أعمال"),
    ("MIT Tech Review AI","https://www.technologyreview.com/topic/artificial-intelligence/feed", "أبحاث"),
    ("Ars Technica AI","https://arstechnica.com/tag/artificial-intelligence/feed/", "تقنية"),
]

UA = "Mozilla/5.0 (NawahNewsBot; +https://nawahlabs.com)"


def log(*a):
    print("[news]", *a, flush=True)


def http_get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def parse_feed(name, url, tag):
    """يرجع قائمة عناصر: title, url, source, tag, published, hint (مقتطف خام للسياق فقط)."""
    out = []
    try:
        raw = http_get(url)
    except Exception as e:
        log(f"تعذّر جلب {name}: {e}")
        return out
    try:
        root = ET.fromstring(raw)
    except Exception as e:
        log(f"تعذّر تحليل {name}: {e}")
        return out

    # دعم RSS و Atom
    items = root.findall(".//item")
    is_atom = False
    if not items:
        ns = {"a": "http://www.w3.org/2005/Atom"}
        items = root.findall(".//a:entry", ns)
        is_atom = True

    for it in items[:PER_FEED]:
        if is_atom:
            ns = {"a": "http://www.w3.org/2005/Atom"}
            title = (it.findtext("a:title", default="", namespaces=ns) or "").strip()
            link_el = it.find("a:link", ns)
            link = link_el.get("href") if link_el is not None else ""
            published = (it.findtext("a:updated", default="", namespaces=ns)
                         or it.findtext("a:published", default="", namespaces=ns) or "")
            summary = it.findtext("a:summary", default="", namespaces=ns) or ""
        else:
            title = (it.findtext("title", default="") or "").strip()
            link = (it.findtext("link", default="") or "").strip()
            published = (it.findtext("pubDate", default="") or "")
            summary = it.findtext("description", default="") or ""

        if not title or not link:
            continue
        out.append({
            "title": title,
            "url": link,
            "source": name,
            "tag": tag,
            "published": published,
            "hint": strip_tags(summary)[:600],  # سياق خام لإرشاد الصياغة فقط — لا يُنشر
        })
    log(f"{name}: {len(out)} عنصر")
    return out


def load_seen():
    try:
        return set(json.load(open(STATE_PATH, encoding="utf-8")))
    except Exception:
        return set()


def save_seen(seen):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    json.dump(sorted(seen), open(STATE_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def normalize_date(published):
    """يحوّل تواريخ RSS المختلفة إلى ISO قدر الإمكان، وإلا يضع الآن."""
    if published:
        for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                    "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                dt = datetime.strptime(published.strip(), fmt)
                return dt.astimezone(timezone.utc).date().isoformat()
            except Exception:
                continue
    return datetime.now(timezone.utc).date().isoformat()


def summarize_arabic(api_key, batch):
    """يصيغ عنواناً عربياً وملخصاً عربياً أصلياً لكل خبر عبر Claude API.
    يُرجع قائمة dict: {ar_title, summary}. الصياغة أصلية، لا نسخ."""
    # نبني طلباً واحداً لكل الدفعة لتقليل الكلفة
    numbered = []
    for i, b in enumerate(batch, 1):
        numbered.append(f"{i}) العنوان الأصلي (إنجليزي): {b['title']}\n   سياق موجز: {b['hint'][:300]}")
    joined = "\n\n".join(numbered)

    system = (
        "أنت محرر أخبار تقنية عربي محترف في منصة نَوَاة. مهمتك صياغة أخبار الذكاء الاصطناعي "
        "بالعربية الفصحى المبسّطة بأسلوب أصلي تماماً. لا تنسخ نص المصدر، بل أعد صياغة المعنى بكلماتك. "
        "تجنّب المبالغة والعناوين المثيرة، والتزم الدقة والحياد. لا تخترع أرقاماً أو حقائق غير واردة."
    )
    user = (
        "لكل خبر مرقّم أدناه، اكتب:\n"
        "- \"ar_title\": عنوان عربي أصلي واضح (لا ترجمة حرفية).\n"
        "- \"summary\": ملخّص عربي أصلي في جملتين إلى ثلاث (40–60 كلمة) يوضّح الخبر وأهميته.\n\n"
        "أعِد JSON فقط: مصفوفة بنفس ترتيب الأخبار، كل عنصر {\"ar_title\":\"...\",\"summary\":\"...\"} "
        "بلا أي نص خارج JSON.\n\n"
        f"الأخبار:\n{joined}"
    )

    payload = {
        "model": MODEL,
        "max_tokens": 1500,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        log(f"خطأ API: {e.code} {e.read().decode('utf-8','ignore')[:300]}")
        return None
    except Exception as e:
        log(f"خطأ اتصال API: {e}")
        return None

    text = "".join(b.get("text", "") for b in resp.get("content", []) if b.get("type") == "text")
    text = text.strip()
    # تنظيف أسوار الكود إن وُجدت
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        arr = json.loads(text)
        if isinstance(arr, list):
            return arr
    except Exception as e:
        log(f"تعذّر تحليل رد JSON: {e}")
    return None


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        log("لا يوجد ANTHROPIC_API_KEY في البيئة. أضفه كـ Secret في GitHub.")
        sys.exit(1)

    # 1) اجمع من كل الخلاصات
    raw = []
    for name, url, tag in FEEDS:
        raw.extend(parse_feed(name, url, tag))
        time.sleep(1)

    if not raw:
        log("لم تُجلب أي أخبار. أبقي الملف الحالي كما هو.")
        return

    # 2) أزل المكرر بالرابط، ورتّب الأحدث، وتجاهل ما سبقت صياغته
    seen = load_seen()
    uniq, urls = [], set()
    for it in raw:
        u = it["url"].split("?")[0]
        if u in urls:
            continue
        urls.add(u)
        it["date"] = normalize_date(it.get("published"))
        uniq.append(it)
    uniq.sort(key=lambda x: x["date"], reverse=True)

    fresh = [it for it in uniq if it["url"].split("?")[0] not in seen][:MAX_ITEMS]
    if not fresh:
        log("لا جديد منذ آخر تشغيل. لا تغيير.")
        return

    # 3) صِغ بالعربية عبر Claude (دفعات من 6)
    results = []
    for i in range(0, len(fresh), 6):
        batch = fresh[i:i+6]
        out = summarize_arabic(api_key, batch)
        if not out or len(out) != len(batch):
            log("فشلت صياغة دفعة؛ تخطّيها.")
            continue
        for b, s in zip(batch, out):
            ar_title = (s.get("ar_title") or "").strip()
            summary = (s.get("summary") or "").strip()
            if not ar_title or not summary:
                continue
            results.append({
                "title": ar_title,
                "summary": summary,
                "url": b["url"],
                "source": b["source"],
                "tag": b["tag"],
                "date": b["date"],
            })
        time.sleep(1)

    if not results:
        log("لم تنتج أي صياغة صالحة. أبقي الملف الحالي.")
        return

    # 4) ادمج مع الموجود سابقاً (للحفاظ على أرشيف قصير)، الأحدث أولاً، بحد MAX_ITEMS
    prev = []
    try:
        cur = open(OUT_PATH, encoding="utf-8").read()
        m = re.search(r"window\.NEWS_DATA\s*=\s*(\{.*\})\s*;", cur, re.S)
        if m:
            prev = json.loads(m.group(1)).get("items", [])
    except Exception:
        pass

    merged, seen_urls = [], set()
    for it in results + prev:
        u = it["url"].split("?")[0]
        if u in seen_urls:
            continue
        seen_urls.add(u)
        merged.append(it)
    merged.sort(key=lambda x: str(x.get("date", "")), reverse=True)
    merged = merged[:MAX_ITEMS]

    data = {"updated": datetime.now(timezone.utc).isoformat(), "items": merged}
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("/* بيانات الأخبار — مولّدة تلقائياً بواسطة scripts/fetch_news.py. لا تعدّلها يدوياً. */\n")
        f.write("window.NEWS_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")

    # 5) حدّث قائمة المرئية
    for it in results:
        seen.add(it["url"].split("?")[0])
    save_seen(seen)

    log(f"تم: {len(results)} خبراً جديداً، الإجمالي المعروض {len(merged)}.")


if __name__ == "__main__":
    main()
