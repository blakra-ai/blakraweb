// End-to-end run in DIRECT mode (free official APIs): real Chromium, real backend + worker + PostgreSQL,
// with the networks' login pages/APIs and S3 storage replaced by e2e/fake_networks.py.
// Usage: node e2e/run_direct_scenario.cjs  (expects :5173 frontend, :8000 direct_backend.py, :9444 fake)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const APP = process.env.APP_URL ?? "http://localhost:5173";
const FAKE = process.env.FAKE_URL ?? "https://localhost:9444";
const SHOTS = path.join(__dirname, "shots", "direct");
const MEDIA = path.join(__dirname, "media");
const fa = require("../frontend/src/shared/i18n/locales/fa.json");

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
const shot = (name, p = page) => p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const card = (name) =>
  page.locator("div").filter({ has: page.getByRole("heading", { name, exact: true }) }).filter({ has: page.getByRole("button") }).last();
const debug = async () => (await (await fetch(`${FAKE}/__debug`)).json());
const calls = async (re, method) => (await debug()).log.filter((l) => re.test(l.path) && (!method || l.method === method));

async function openLogin(network) {
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    card(network).getByRole("button", { name: fa.connections.connect }).click(),
  ]);
  await popup.locator("#allow").waitFor({ timeout: 15_000 });
  return popup;
}

(async () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // only for reading the fake's /__debug
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "fa-IR", viewport: { width: 1360, height: 900 } });
  // The networks' real login pages are served by the fake (same path, host moved into the path).
  for (const host of ["www.instagram.com", "www.facebook.com"]) {
    await context.route(`https://${host}/**`, async (route) => {
      const u = new URL(route.request().url());
      const response = await route.fetch({ url: `${FAKE}/${host}${u.pathname}${u.search}` });
      await route.fulfill({ response });
    });
  }
  page = await context.newPage();
  nav = page.getByRole("navigation", { name: fa.nav.main });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${APP}/connections`);
  await page.getByRole("heading", { name: fa.connections.title }).waitFor();

  await step(1, "Only networks with an app configured can be connected (TikTok/LinkedIn show 'not set up')", async () => {
    await card("Instagram").getByRole("button", { name: fa.connections.connect }).waitFor();
    await card("Facebook").getByRole("button", { name: fa.connections.connect }).waitFor();
    await card("TikTok").getByText(fa.connections.notAvailable).first().waitFor();
    await card("LinkedIn").getByText(fa.connections.notAvailable).first().waitFor();
    await shot("01-connections");
  });

  await step(2, "Cancelling on Instagram's login page shows a clear message and connects nothing", async () => {
    const popup = await openLogin("Instagram");
    await popup.click("#deny");
    await popup.getByText("Access was not approved.").waitFor({ timeout: 10_000 });
    await shot("02-login-cancelled", popup);
    await popup.close().catch(() => {});
    await card("Instagram").getByText(fa.connections.notConnected, { exact: true }).waitFor();
  });

  await step(3, "Instagram login (official page) -> Allow -> window closes -> @blakra.studio connected", async () => {
    const popup = await openLogin("Instagram");
    if (!popup.url().startsWith("https://www.instagram.com/oauth/authorize")) throw new Error(`login opened ${popup.url()}`);
    const q = new URL(popup.url()).searchParams;
    if (!q.get("state") || q.get("redirect_uri") !== "http://localhost:8000/oauth/instagram/callback") throw new Error(`bad authorize query ${q}`);
    await shot("03a-instagram-login", popup);
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.click("#allow")]);
    await card("Instagram").getByText("@blakra.studio").waitFor({ timeout: 10_000 });
    await shot("03b-instagram-connected");
  });

  await step(4, "Facebook login -> choose which Page (read-only Page hidden) -> Blakra Shop connected", async () => {
    const popup = await openLogin("Facebook");
    await popup.click("#allow");
    await popup.getByRole("button", { name: "Blakra Shop" }).waitFor({ timeout: 10_000 });
    if (await popup.getByText("Read-only Page").count()) throw new Error("a Page without CREATE_CONTENT was offered");
    await shot("04a-facebook-choose-page", popup);
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.getByRole("button", { name: "Blakra Shop" }).click()]);
    await card("Facebook").getByText("Blakra Shop").waitFor({ timeout: 10_000 });
    await shot("04b-facebook-connected");
  });

  await step(5, "A replayed login link (same state) is refused", async () => {
    const list = await calls(/^\/www\.facebook\.com\//, "GET");
    if (!list.length) throw new Error("facebook login page was never opened");
    // The callback URL with a used state must fail: single-use states.
    const p2 = await context.newPage();
    await p2.goto("http://localhost:8000/oauth/instagram/callback?code=ig-code-x&state=already-used-or-made-up");
    await p2.getByText(/منقضی|expired|نامعتبر|invalid/i).first().waitFor({ timeout: 5_000 });
    await shot("05-replayed-state", p2);
    await p2.close();
  });

  await nav.getByRole("link", { name: fa.nav.compose }).click();
  await page.getByRole("heading", { name: fa.composer.title }).waitFor();
  const fileInput = page.getByLabel(fa.media.choose);
  const list = page.getByRole("list", { name: fa.media.listLabel });
  const publishBtn = page.getByRole("button", { name: fa.composer.publishCta });

  await step(6, "Video uploads from the browser straight to our S3 bucket (presigned PUT)", async () => {
    await fileInput.setInputFiles(path.join(MEDIA, "vertical.mp4"));
    await list.getByLabel(fa.media.uploaded).first().waitFor({ timeout: 30_000 });
    if (!(await calls(/^\/blakrasocial-media\/u\//, "PUT")).length) throw new Error("no presigned PUT reached the bucket");
  });

  await step(7, "Publish now to Instagram (Reel) + Facebook shows 'sent, publishing'", async () => {
    await page.getByRole("checkbox", { name: /Instagram/ }).click();
    await page.locator("#ct-instagram").selectOption("reel");
    await page.getByRole("checkbox", { name: /Facebook/ }).click();
    await page.locator("#caption").fill("اولین ریلز واقعی بدون Ayrshare #بلکرا");
    await page.getByText(fa.composer.allGood).waitFor();
    await shot("07a-compose");
    await publishBtn.click();
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await shot("07b-sent");
  });

  await step(8, "The worker publishes on both networks; Posts page turns Published with View links", async () => {
    await nav.getByRole("link", { name: fa.nav.posts }).click();
    await page.getByRole("heading", { name: fa.posts.title }).waitFor();
    await page.getByText("اولین ریلز واقعی").first().waitFor({ timeout: 15_000 });
    await shot("08a-posts-processing");
    const deadline = Date.now() + 120_000;
    for (;;) {
      await page.reload();
      await page.getByText("اولین ریلز واقعی").first().waitFor({ timeout: 15_000 });
      const live = await page.getByRole("link", { name: new RegExp(fa.posts.viewLive) }).count();
      if (live >= 2) break;
      if (Date.now() > deadline) throw new Error(`only ${live} View links after 2 minutes`);
      await page.waitForTimeout(5_000);
    }
    await page.getByText(fa.states.published).first().waitFor();
    await shot("08b-posts-published");
    const d = await debug();
    const ig = Object.values(d.published).find((p) => p.network === "instagram");
    if (!ig || ig.media_type !== "REELS" || !ig.video_url.startsWith(`${FAKE}/public/u/`)) throw new Error(`instagram got ${JSON.stringify(ig)}`);
    const fb = Object.values(d.videos)[0];
    if (!fb || fb.page !== "1010000000000002" || fb.access_token !== "PAGE-1010000000000002") throw new Error(`facebook got ${JSON.stringify(fb)}`);
    console.log("     Instagram got:", JSON.stringify({ media_type: ig.media_type, video_url: ig.video_url, caption: ig.caption }));
    console.log("     Facebook got: ", JSON.stringify({ page: fb.page, file_url: fb.file_url }));
  });

  await step(9, "Scheduling 10 minutes ahead queues it without touching any network", async () => {
    const before = (await calls(/^\/graph\./, "POST")).length;
    await nav.getByRole("link", { name: fa.nav.compose }).click();
    await fileInput.setInputFiles(path.join(MEDIA, "vertical.mp4"));
    await list.getByLabel(fa.media.uploaded).first().waitFor({ timeout: 30_000 });
    await page.getByRole("checkbox", { name: /Instagram/ }).click();
    await page.locator("#ct-instagram").selectOption("reel");
    await page.locator("#caption").fill("ریلز زمان‌بندی‌شده مستقیم");
    await page.getByRole("radio", { name: fa.composer.schedule }).click();
    const d = new Date(Date.now() + 10 * 60_000);
    const pad = (x) => String(x).padStart(2, "0");
    await page.locator("#schedule-at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    await page.getByRole("button", { name: fa.composer.scheduleCta }).click();
    await page.getByText(fa.composer.scheduled).waitFor({ timeout: 30_000 });
    await nav.getByRole("link", { name: fa.nav.posts }).click();
    await page.getByText("ریلز زمان‌بندی‌شده مستقیم").first().waitFor({ timeout: 15_000 });
    await page.getByText(fa.states.scheduled).first().waitFor();
    await shot("09-scheduled");
    await page.waitForTimeout(5_000); // a few worker ticks
    if ((await calls(/^\/graph\./, "POST")).length !== before) throw new Error("a scheduled post reached a network early");
  });

  await step(10, "Deleting the scheduled post cancels it", async () => {
    const row = page.locator("div").filter({ hasText: "ریلز زمان‌بندی‌شده مستقیم" }).filter({ has: page.getByRole("button", { name: fa.posts.delete }) }).last();
    await row.getByRole("button", { name: fa.posts.delete }).click();
    const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await dialog.getByText(fa.posts.cancelTitle).waitFor();
    await dialog.getByRole("button", { name: fa.posts.delete }).click();
    await page.getByText(fa.posts.deleted).waitFor({ timeout: 15_000 });
    await shot("10-cancelled");
  });

  await step(11, "Disconnecting Instagram returns the card to Not connected", async () => {
    await nav.getByRole("link", { name: fa.nav.connections }).click();
    await card("Instagram").getByRole("button", { name: fa.connections.disconnect }).click();
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: fa.connections.disconnect }).click();
    await card("Instagram").getByText(fa.connections.notConnected, { exact: true }).waitFor({ timeout: 10_000 });
    await card("Facebook").getByText("Blakra Shop").waitFor();
    await shot("11-disconnected");
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (consoleErrors.length) console.log("Console errors:\n  " + consoleErrors.join("\n  "));
  process.exit(failed.length ? 1 : 0);
})();
