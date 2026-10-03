/**
 * Unit-check the crawler classifier against REAL user agents — including the exact one
 * that produced 1,873 bogus clicks — plus common browsers, to prove it does not mislabel
 * readers. Run: node backend/scripts/test-botdetect.mjs (no server, no DB).
 */
import { classifyUserAgent } from "../src/utils/botDetect.js";

const BOT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))";

const cases = [
  // ---- must be BOT ----
  [BOT_UA, true, "the actual crawler (1,873 rows)"],
  ["meta-externalagent/1.1", true, "bare meta-externalagent"],
  ["facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", true, "facebookexternalhit"],
  ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true, "Googlebot"],
  ["Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", true, "bingbot"],
  ["Mozilla/5.0 (compatible; YandexBot/3.0)", true, "YandexBot"],
  ["Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", true, "AhrefsBot"],
  ["GPTBot/1.0 (+https://openai.com/gptbot)", true, "GPTBot"],
  ["Mozilla/5.0 (compatible; ClaudeBot/1.0)", true, "ClaudeBot"],
  ["curl/8.5.0", true, "curl"],
  ["Wget/1.21.4", true, "wget"],
  ["python-requests/2.31.0", true, "python-requests"],
  ["axios/1.6.0", true, "axios"],
  ["node-fetch/1.0", true, "node-fetch"],
  ["Go-http-client/1.1", true, "Go http client"],
  ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36", true, "HeadlessChrome"],
  ["Mozilla/5.0 (compatible; UptimeRobot/2.0)", true, "UptimeRobot"],
  ["Mozilla/5.0 (compatible; SemrushBot/7~bl)", true, "SemrushBot"],
  ["Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)", true, "Discordbot"],
  ["WhatsApp/2.23", true, "WhatsApp preview"],
  ["", true, "empty UA"],
  ["   ", true, "whitespace UA"],

  // ---- must be HUMAN (these are the false-positive risk) ----
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", false, "Chrome desktop"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", false, "Safari macOS"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", false, "Safari iOS"],
  ["Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36", false, "Chrome Android"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0", false, "Firefox desktop"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0", false, "Edge"],
  ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 OPR/104.0.0.0", false, "Opera"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Vivaldi/6.2", false, "Vivaldi"],
  ["Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0", false, "Firefox Linux"],
  ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 320.0.0", false, "in-app Instagram browser (a REAL reader)"],
];

let pass = 0;
const fails = [];
for (const [ua, wantBot, label] of cases) {
  const got = classifyUserAgent(ua);
  const ok = got.isBot === wantBot;
  if (ok) pass++;
  else fails.push({ label, wantBot, got });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${wantBot ? "bot  " : "human"}  ${label}${ok ? "" : `  -> got isBot=${got.isBot} (${got.reason})`}`);
}
console.log(`\n${pass}/${cases.length} passed`);
if (fails.length) {
  console.log("FAILURES:");
  for (const f of fails) console.log(" -", JSON.stringify(f));
  process.exit(1);
}
