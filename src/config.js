// Google News RSS: 키워드/언어/지역을 지정한 피드를 동적으로 생성.
// when:1d 연산자로 최근 24시간 항목만 받도록 쿼리에 포함할 수 있다.
function googleNews({ query, hl, gl }) {
  const lang = hl.split("-")[0];
  const ceid = `${gl}:${lang}`;
  const base = query
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}`
    : "https://news.google.com/rss?";
  const sep = query ? "&" : "";
  return `${base}${sep}hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`;
}

// 미술 전문매체 직접 RSS — Google News보다 신호가 깨끗한 국제 미술 소스.
// (네트워크 차단 환경에선 검증 불가하므로 로컬 실행 시 살아있는지 확인 필요)
const ART_FEEDS_INTL = [
  { id: "hyperallergic", url: "https://hyperallergic.com/feed/" },
  { id: "artnews", url: "https://www.artnews.com/feed/" },
  { id: "artnet", url: "https://news.artnet.com/feed" },
  { id: "theartnewspaper", url: "https://www.theartnewspaper.com/rss" },
];

export const feeds = [
  // 일반 — 한국
  { id: "gn-general-kr", category: "general", region: "kr", url: googleNews({ hl: "ko", gl: "KR" }) },
  // 일반 — 국제
  { id: "gn-general-intl", category: "general", region: "intl", url: googleNews({ hl: "en-US", gl: "US" }) },
  // 미술 — 한국 (RSS가 얇아 Google News 키워드로 보완)
  {
    id: "gn-art-kr",
    category: "art",
    region: "kr",
    url: googleNews({ query: "(미술 OR 전시 OR 갤러리 OR 비엔날레 OR 아트페어) when:1d", hl: "ko", gl: "KR" }),
  },
  // 미술 — 국제 (Google News + 전문매체)
  {
    id: "gn-art-intl",
    category: "art",
    region: "intl",
    url: googleNews({ query: "(art exhibition OR gallery OR biennale OR art fair OR auction) when:1d", hl: "en-US", gl: "US" }),
  },
  ...ART_FEEDS_INTL.map((f) => ({ id: f.id, category: "art", region: "intl", url: f.url })),
];

export const settings = {
  timeWindowHours: Number(process.env.TIME_WINDOW_HOURS) || 24,
  // 피드당 최신 N개만 사용 — 입력 토큰 폭주 방지
  maxItemsPerFeed: 15,
  model: process.env.NEWS_MODEL || "claude-opus-4-7",
  // 섹션별 라운드업에 노출할 상위 항목 수 (모델에게 주는 가이드)
  maxPerSection: 8,
};
