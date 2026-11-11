// Renders every docs/mockups/*.html to a full-page PNG next to it.
// Usage: node docs/mockups/render.mjs [name ...]     (needs Node 22+ and Chrome or Edge installed)
import { spawn } from "node:child_process";
import { readdirSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const browsers = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const exe = browsers.find((p) => existsSync(p));
if (!exe) throw new Error("Chrome/Edge not found; set CHROME_PATH");

const only = process.argv.slice(2);
const pages = readdirSync(here)
  .filter((f) => f.endsWith(".html"))
  .filter((f) => !only.length || only.some((o) => f.startsWith(o)));

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "mockup-chrome-"));
const chrome = spawn(exe, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === "page");
  } catch { await sleep(200); }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
for (const file of pages) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(join(here, file)).href });
  // wait for load + web fonts
  for (let i = 0; i < 60; i++) {
    const { result } = await send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && document.fonts.status === 'loaded'",
      returnByValue: true,
    });
    if (result.value) break;
    await sleep(150);
  }
  await sleep(300);
  const { result } = await send("Runtime.evaluate", {
    expression: "Math.ceil(document.documentElement.scrollHeight)", returnByValue: true,
  });
  const height = result.value;
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height, deviceScaleFactor: 2, mobile: false });
  await sleep(150);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const out = join(here, file.replace(/\.html$/, ".png"));
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`${file} -> ${out.split(/[\\/]/).pop()} (1440x${height} @2x)`);
}
ws.close();
chrome.kill();
