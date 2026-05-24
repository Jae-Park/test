import { spawn } from "node:child_process";

// 안정적인(거의 안 변하는) 큐레이션 지침.
// 날짜/항목 등 매번 바뀌는 내용은 절대 여기 넣지 않는다(api 엔진의 캐시 무효화 방지).
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

function buildUserText(items, maxPerSection, dateLabel) {
  return (
    `오늘 날짜: ${dateLabel}\n섹션당 최대 ${maxPerSection}개 항목.\n\n` +
    `다음은 수집된 뉴스 항목이다:\n\n${renderItems(items)}`
  );
}

// claude CLI 헤드리스 호출 — 로그인된 구독 인증을 그대로 사용(추가 API 청구 없음).
function runClaudeCLI(prompt, model) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text"];
    if (model) args.push("--model", model);
    const proc = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) =>
      reject(new Error(`claude CLI 실행 실패 (설치/로그인 확인): ${e.message}`)),
    );
    proc.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `claude 종료 코드 ${code}`)),
    );
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function summarizeViaApi(userText, model) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model || "claude-opus-4-7",
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

export async function summarize(items, { engine, model, maxPerSection, dateLabel }) {
  const userText = buildUserText(items, maxPerSection, dateLabel);
  if (engine === "api") {
    return summarizeViaApi(userText, model);
  }
  const text = await runClaudeCLI(`${SYSTEM_PROMPT}\n\n${userText}`, model);
  return { text, usage: null };
}
