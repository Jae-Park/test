import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// 안정적인(거의 안 변하는) 큐레이션 지침 — 캐시 prefix로 사용.
// 날짜/항목 등 매번 바뀌는 내용은 절대 여기 넣지 않는다(캐시 무효화 방지).
const SYSTEM_PROMPT = `당신은 한국어 뉴스 라운드업을 만드는 큐레이션 에디터다.
입력으로 여러 RSS 피드에서 모은 뉴스 항목 목록(제목, 출처, 링크, 짧은 스니펫)을 받는다.

작업:
1. 같은 사건을 다룬 중복 기사를 하나로 묶는다(클러스터링).
2. 중요도(파급력, 신규성)를 기준으로 핵심만 고른다. 단순 나열 금지.
3. 각 항목을 한국어 한 문장으로 간결하게 요약한다. 해외 기사도 한국어로 옮긴다.
4. 두 섹션으로 묶는다: "주요 뉴스"(일반)와 "미술계". 각 섹션 안에서 국내 소식을 먼저, 해외 소식을 뒤에 둔다.
5. 섹션당 최대 항목 수를 지키고, 신뢰도 낮거나 광고성/중복인 항목은 버린다.

출력 형식(일반 텍스트, 마크다운/이모지 사용 금지):
뉴스 라운드업 (<날짜>)

== 주요 뉴스 ==
- <한 문장 요약> (<출처>) <원문 URL>
- ...

== 미술계 ==
- <한 문장 요약> (<출처>) <원문 URL>
- ...

규칙:
- URL은 입력에 주어진 링크를 그대로 쓴다. 임의로 만들지 않는다.
- 항목이 거의 없는 섹션은 "(오늘은 추릴 만한 소식이 없습니다)"로 표기한다.
- 군더더기 인사말이나 맺음말 없이 위 형식만 출력한다.`;

function renderItems(items) {
  return items
    .map(
      (it, i) =>
        `[${i + 1}] (${it.category}/${it.region}) ${it.title}\n    출처: ${it.source}\n    링크: ${it.link}` +
        (it.snippet ? `\n    요지: ${it.snippet}` : ""),
    )
    .join("\n");
}

export async function summarize(items, { model, maxPerSection, dateLabel }) {
  const userText =
    `오늘 날짜: ${dateLabel}\n섹션당 최대 ${maxPerSection}개 항목.\n\n` +
    `다음은 수집된 뉴스 항목이다:\n\n${renderItems(items)}`;

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userText }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text, usage: response.usage };
}
