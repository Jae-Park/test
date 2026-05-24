import { Bot } from "grammy";

// Telegram 메시지 한도는 4096자. 문단/줄 경계에서 안전하게 분할.
function splitMessage(text, limit = 3800) {
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > limit) {
      if (current) chunks.push(current);
      current = "";
      // 한 줄 자체가 한도를 넘으면 강제로 자른다
      while (line.length > limit) {
        chunks.push(line.slice(0, limit));
        current = line.slice(limit);
      }
      if (current === "" && line.length <= limit) current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function sendRoundup(text, { token, chatId }) {
  const bot = new Bot(token);
  // parse_mode 없이 일반 텍스트로 전송 → URL은 Telegram이 자동 링크 처리, 이스케이프 불필요.
  for (const chunk of splitMessage(text)) {
    await bot.api.sendMessage(chatId, chunk, { disable_web_page_preview: true });
  }
}
