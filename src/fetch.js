import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "news-roundup-bot/0.1 (+https://github.com)" },
  customFields: { item: ["source"] },
});

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s*[-|–—]\s*[^-|–—]+$/, "") // Google News의 " - 출처" 꼬리 제거
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSource(item) {
  if (item.source) {
    if (typeof item.source === "string") return item.source;
    if (item.source.title) return item.source.title;
    if (item.source._) return item.source._;
  }
  const m = item.title?.match(/\s[-|–—]\s([^-|–—]+)$/);
  return m ? m[1].trim() : null;
}

async function fetchFeed(feed, cutoffMs, maxItems) {
  const parsed = await parser.parseURL(feed.url);
  const items = [];
  for (const item of parsed.items || []) {
    const dateStr = item.isoDate || item.pubDate;
    const ts = dateStr ? Date.parse(dateStr) : NaN;
    if (!Number.isNaN(ts) && ts < cutoffMs) continue; // 시간창 밖이면 제외 (날짜 없으면 통과)
    items.push({
      title: (item.title || "").trim(),
      link: item.link || "",
      source: extractSource(item) || feed.id,
      isoDate: dateStr || null,
      snippet: (item.contentSnippet || "").slice(0, 300),
      category: feed.category,
      region: feed.region,
    });
    if (items.length >= maxItems) break;
  }
  return items;
}

export async function fetchAll(feeds, { timeWindowHours, maxItemsPerFeed }) {
  const cutoffMs = Date.now() - timeWindowHours * 3600 * 1000;
  const results = await Promise.allSettled(
    feeds.map((f) => fetchFeed(f, cutoffMs, maxItemsPerFeed)),
  );

  const all = [];
  const failures = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") all.push(...r.value);
    else failures.push({ feed: feeds[i].id, error: r.reason?.message || String(r.reason) });
  });

  // 같은 사건의 중복 헤드라인 제거 (정규화 제목 기준)
  const seen = new Set();
  const deduped = [];
  for (const item of all) {
    if (!item.title) continue;
    const key = normalizeTitle(item.title);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return { items: deduped, failures };
}
