// End-to-end run of the 13-step manual scenario from the testing guide, in a real Chromium,
// against the real backend + frontend, with Ayrshare replaced by e2e/fake_ayrshare.py.
// Usage: node e2e/run_scenario.cjs   (expects :5173 frontend, :8000 backend, :9443 fake Ayrshare)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const APP = process.env.APP_URL ?? "http://localhost:5173";
const FAKE = process.env.FAKE_URL ?? "https://localhost:9443";
const SHOTS = path.join(__dirname, "shots");
const MEDIA = path.join(__dirname, "media");
const fa = require("../frontend/src/shared/i18n/locales/fa.json");
const en = require("../frontend/src/shared/i18n/locales/en.json");

fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
let page;
let nav;

async function step(n, title, fn) {
  try {
    await fn();
    results.push({ n, title, ok: true });
    console.log(`PASS ${n}. ${title}`);
  } catch (err) {
    results.push({ n, title, ok: false, error: String(err.message ?? err).split("\n")[0] });
    console.log(`FAIL ${n}. ${title}\n     ${err.message}`);
    await page.screenshot({ path: path.join(SHOTS, `fail-${String(n).padStart(2, "0")}.png`), fullPage: true }).catch(() => {});
  }
}
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const card = (name) =>
  page.locator("div").filter({ has: page.getByRole("heading", { name, exact: true }) }).filter({ has: page.getByRole("button") }).last();
const debug = async () => (await (await fetch(`${FAKE}/__debug`)).json());

(async () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // only for reading the fake's /__debug
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "fa-IR", viewport: { width: 1360, height: 900 } });
  page = await context.newPage();
  nav = page.getByRole("navigation", { name: fa.nav.main });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${APP}/compose`);
  await page.getByRole("heading", { name: fa.composer.title }).waitFor();

  await step(1, "Language toggle switches direction (fa RTL <-> en LTR)", async () => {
    if ((await page.getAttribute("html", "dir")) !== "rtl") throw new Error("not RTL by default");
    await page.getByRole("button", { name: fa.nav.language }).click();
    await page.getByRole("heading", { name: en.composer.title }).waitFor();
    if ((await page.getAttribute("html", "dir")) !== "ltr") throw new Error("not LTR after switch");
    await shot("01-compose-en");
    await page.getByRole("button", { name: en.nav.language }).click();
    await page.getByRole("heading", { name: fa.composer.title }).waitFor();
    if ((await page.getAttribute("html", "dir")) !== "rtl") throw new Error("not RTL after switching back");
  });

  await nav.getByRole("link", { name: fa.nav.connections }).click();
  await page.getByRole("heading", { name: fa.connections.title }).waitFor();

  let popup;
  await step(2, "Connect opens the Ayrshare linking window", async () => {
    await shot("02-connections-empty");
    [popup] = await Promise.all([page.waitForEvent("popup"), card("Instagram").getByRole("button", { name: fa.connections.connect }).click()]);
    await popup.waitForURL(`${FAKE}/link**`, { timeout: 10_000 });
    if (!popup.url().startsWith(`${FAKE}/link`)) throw new Error(`popup opened ${popup.url()}`);
  });

  await step(3, "Linking Instagram and closing the window shows it connected", async () => {
    await popup.screenshot({ path: path.join(SHOTS, "03a-link-window.png") });
    await Promise.all([popup.waitForEvent("close", { timeout: 10_000 }), popup.click("#connect-instagram")]);
    await card("Instagram").getByText(fa.connections.connected, { exact: true }).waitFor({ timeout: 10_000 });
    await card("Instagram").getByText("@blakra.studio").waitFor();
    await shot("03b-instagram-connected");
  });

  await nav.getByRole("link", { name: fa.nav.compose }).click();
  await page.getByRole("heading", { name: fa.composer.title }).waitFor();
  const fileInput = page.getByLabel(fa.media.choose);
  const list = page.getByRole("list", { name: fa.media.listLabel });

  await step(4, "Vertical 9:16 MP4 uploads straight to storage with progress to done", async () => {
    await fileInput.setInputFiles(path.join(MEDIA, "vertical.mp4"));
    await list.getByLabel(fa.media.uploaded).first().waitFor({ timeout: 30_000 });
    const puts = (await debug()).log.filter((l) => l.method === "PUT" && l.path.startsWith("/storage/"));
    if (!puts.length) throw new Error("no direct PUT to storage seen");
  });

  await step(5, "Instagram + Reel shows the vertical Reel preview", async () => {
    await page.getByRole("checkbox", { name: /Instagram/ }).click();
    await page.locator("#ct-instagram").selectOption("reel");
    await page.getByText(fa.composer.allGood).waitFor();
    await shot("05-reel-preview");
  });

  const publishBtn = page.getByRole("button", { name: fa.composer.publishCta });

  await step(6, "Adding a 16:9 video shows the 9:16 error and disables publish; removing it clears it", async () => {
    await fileInput.setInputFiles(path.join(MEDIA, "wide.mp4"));
    await list.getByLabel(fa.media.uploaded).nth(1).waitFor({ timeout: 30_000 });
    await page.getByText("9:16").filter({ hasText: "16:9" }).first().waitFor({ timeout: 5_000 }).catch(async () => {
      await page.getByText(/9:16/).nth(1).waitFor({ timeout: 2_000 });
    });
    if (!(await publishBtn.isDisabled())) throw new Error("publish not disabled");
    await shot("06-aspect-error");
    const before = (await debug()).log.filter((l) => l.path === "/api/post").length;
    await list.getByRole("listitem").nth(1).getByRole("button", { name: fa.common.remove }).click();
    await page.getByText(fa.composer.allGood).waitFor();
    const after = (await debug()).log.filter((l) => l.path === "/api/post").length;
    if (after !== before) throw new Error("removing a file submitted the form");
  });

  await step(7, "Six hashtags shows the max-5 error", async () => {
    await page.locator("#caption").fill("تست #a #b #c #d #e #f");
    await page.getByText(fa.issues.too_many_hashtags.replace("{{max}}", "5").replace("{{actual}}", "6")).waitFor();
    if (!(await publishBtn.isDisabled())) throw new Error("publish not disabled");
    await shot("07-hashtag-error");
  });

  await step(8, "WhatsApp shows the no-Status / 24-hour notice", async () => {
    await page.getByRole("checkbox", { name: /WhatsApp/ }).click();
    await page.getByText(fa.platforms.whatsapp.noStatus).waitFor();
    await page.getByText(fa.platforms.whatsapp.window).waitFor();
    await shot("08-whatsapp-notice");
    await page.getByRole("checkbox", { name: /WhatsApp/ }).click();
    await page.getByText(fa.platforms.whatsapp.noStatus).waitFor({ state: "detached" });
  });

  await step(9, "Valid caption + Publish now shows the success message", async () => {
    await page.locator("#caption").fill("اولین ریلز ما از Blakrasocial #بلکرا #تست");
    await page.getByText(fa.composer.allGood).waitFor();
    await publishBtn.click();
    await page.getByText(fa.composer.published).waitFor({ timeout: 30_000 });
    await shot("09-published");
    const body = Object.values((await debug()).posts).pop();
    console.log("     Ayrshare received:", JSON.stringify(body));
    if (!body.idempotencyKey) throw new Error("idempotencyKey not forwarded");
    if (!body.instagramOptions) throw new Error("instagramOptions missing");
    if (!String(body.mediaUrls?.[0]).startsWith(`${FAKE}/files/`)) throw new Error(`mediaUrls ${body.mediaUrls}`);
  });

  await step(10, "Posts page shows the post as published with a View link", async () => {
    await nav.getByRole("link", { name: fa.nav.posts }).click();
    await page.getByRole("heading", { name: fa.posts.title }).waitFor();
    await page.getByText("اولین ریلز ما").first().waitFor({ timeout: 15_000 });
    await page.getByText(fa.states.published).first().waitFor();
    await page.getByRole("link", { name: new RegExp(fa.posts.viewLive) }).first().waitFor();
    await shot("10-posts");
  });

  await step(11, "Scheduling a post 10 minutes ahead shows it as Scheduled", async () => {
    await nav.getByRole("link", { name: fa.nav.compose }).click();
    await fileInput.setInputFiles(path.join(MEDIA, "vertical.mp4"));
    await list.getByLabel(fa.media.uploaded).first().waitFor({ timeout: 30_000 });
    await page.getByRole("checkbox", { name: /Instagram/ }).click();
    await page.locator("#ct-instagram").selectOption("reel");
    await page.locator("#caption").fill("ریلز زمان‌بندی‌شده");
    await page.getByRole("radio", { name: fa.composer.schedule }).click();
    const d = new Date(Date.now() + 10 * 60_000);
    const pad = (x) => String(x).padStart(2, "0");
    await page.locator("#schedule-at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    await shot("11a-schedule-form");
    await page.getByRole("button", { name: fa.composer.scheduleCta }).click();
    await page.getByText(fa.composer.scheduled).waitFor({ timeout: 30_000 });
    await nav.getByRole("link", { name: fa.nav.posts }).click();
    await page.getByText("ریلز زمان‌بندی‌شده").first().waitFor({ timeout: 15_000 });
    await page.getByText(fa.states.scheduled).first().waitFor();
    await shot("11b-posts-scheduled");
  });

  await step(12, "Deleting the scheduled post cancels it", async () => {
    const row = page.locator("div").filter({ hasText: "ریلز زمان‌بندی‌شده" }).filter({ has: page.getByRole("button", { name: fa.posts.delete }) }).last();
    await row.getByRole("button", { name: fa.posts.delete }).click();
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByText(fa.posts.cancelTitle).waitFor();
    await shot("12a-cancel-dialog");
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: fa.posts.delete }).click();
    await page.getByText(fa.posts.deleted).waitFor({ timeout: 15_000 });
    const del = (await debug()).log.filter((l) => l.path === "/api/post" && l.method === "DELETE");
    if (!del.length) throw new Error("no DELETE reached Ayrshare");
    await shot("12b-after-cancel");
  });

  await step(13, "Disconnecting Instagram returns the card to Not connected", async () => {
    await nav.getByRole("link", { name: fa.nav.connections }).click();
    await card("Instagram").getByRole("button", { name: fa.connections.disconnect }).click();
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: fa.connections.disconnect }).click();
    await card("Instagram").getByText(fa.connections.notConnected, { exact: true }).waitFor({ timeout: 10_000 });
    await shot("13-disconnected");
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (consoleErrors.length) console.log("Console errors:\n  " + consoleErrors.join("\n  "));
  process.exit(failed.length ? 1 : 0);
})();
