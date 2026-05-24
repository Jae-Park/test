import { writeFile } from "node:fs/promises";
import { feeds, settings } from "./config.js";
import { fetchAll } from "./fetch.js";
import { summarize } from "./summarize.js";
import { sendRoundup } from "./telegram.js";

const dryRun = process.argv.includes("--dry-run");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`환경변수 ${name}가 설정되지 않았습니다. .env를 확인하세요.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  requireEnv("ANTHROPIC_API_KEY");
  const token = dryRun ? null : requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = dryRun ? null : requireEnv("TELEGRAM_CHAT_ID");

  console.log(`피드 ${feeds.length}개에서 최근 ${settings.timeWindowHours}시간 뉴스 수집 중...`);
  const { items, failures } = await fetchAll(feeds, settings);
  if (failures.length) {
    console.warn(`피드 ${failures.length}개 실패:`);
    for (const f of failures) console.warn(`  - ${f.feed}: ${f.error}`);
  }
  console.log(`수집된 고유 항목: ${items.length}개`);

  if (items.length === 0) {
    console.error("수집된 항목이 없습니다. 피드 URL/네트워크를 확인하세요.");
    process.exit(1);
  }

  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  console.log(`요약 중 (모델: ${settings.model})...`);
  const { text, usage } = await summarize(items, {
    model: settings.model,
    maxPerSection: settings.maxPerSection,
    dateLabel,
  });
  console.log(
    `토큰 사용: input=${usage.input_tokens}, output=${usage.output_tokens}, ` +
      `cache_read=${usage.cache_read_input_tokens ?? 0}, cache_write=${usage.cache_creation_input_tokens ?? 0}`,
  );

  await writeFile("roundup.txt", text, "utf8");
  console.log("roundup.txt에 저장됨.");

  if (dryRun) {
    console.log("\n--- DRY RUN: 전송 생략, 아래는 미리보기 ---\n");
    console.log(text);
    return;
  }

  console.log("Telegram으로 전송 중...");
  await sendRoundup(text, { token, chatId });
  console.log("전송 완료.");
}

main().catch((err) => {
  console.error("실행 실패:", err);
  process.exit(1);
});
