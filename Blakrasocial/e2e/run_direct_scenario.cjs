// End-to-end run in DIRECT mode (free official APIs): real Chromium, real backend + worker + PostgreSQL,
// with the networks' login pages/APIs and S3 storage replaced by e2e/fake_networks.py.
// Covers: owner setup -> customer invite -> connect 4 networks -> publish/schedule/cancel -> TikTok
// audit UI -> revoked token -> Meta data-deletion callback -> legal pages -> account deletion.
// Usage: node e2e/run_direct_scenario.cjs  (expects :5173 frontend, :8000 direct_backend.py, :9444 fake;
//        the database must be freshly migrated, see README.md)
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const APP = process.env.APP_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:8000";
const FAKE = process.env.FAKE_URL ?? "https://localhost:9444";
const DB = process.env.E2E_PSQL ?? "postgresql://postgres@localhost:5433/blakrasocial_e2e?host=/tmp/pg";
const SHOTS = path.join(__dirname, "shots", "direct");
const MEDIA = path.join(__dirname, "media");
const fa = require("../frontend/src/shared/i18n/locales/fa.json");

const ADMIN = { email: "owner@blakra.example", password: "Blue-river-sunrise-42" };
const CUSTOMER = { email: "cafe@blakra.example", name: "Cafe Blakra", password: "Open-daily-24h!" };

fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
let page;
let context;

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
const nav = () => page.getByRole("navigation", { name: fa.nav.main });
const card = (name) =>
  page.locator("div").filter({ has: page.getByRole("heading", { name, exact: true }) }).filter({ has: page.getByRole("button") }).last();
const debug = async () => (await (await fetch(`${FAKE}/__debug`)).json());
const calls = async (re, method) => (await debug()).log.filter((l) => re.test(l.path) && (!method || l.method === method));
const sql = (query) => execFileSync("psql", [DB, "-tAc", query], { encoding: "utf8" }).trim();
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};

async function openLogin(network) {
  const [popup] = await Promise.all([page.waitForEvent("popup"), card(network).getByRole("button", { name: fa.connections.connect }).click()]);
  await popup.locator("#allow").waitFor({ timeout: 15_000 });
  return popup;
}

async function goTo(link, heading) {
  await nav().getByRole("link", { name: link }).click();
  await page.getByRole("heading", { name: heading }).first().waitFor();
}

async function signIn(email, password) {
  await page.goto(`${APP}/login`);
  await page.getByLabel(fa.auth.email).fill(email);
  await page.getByLabel(fa.auth.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: fa.auth.signIn }).click();
}

async function signOut() {
  await page.getByRole("button", { name: fa.nav.signOut }).click();
  await page.getByRole("heading", { name: fa.auth.signInTitle }).waitFor();
}

async function setPassword(password) {
  await page.getByLabel(fa.auth.newPassword, { exact: true }).fill(password);
  await page.getByLabel(fa.auth.confirmPassword, { exact: true }).fill(password);
  await page.getByRole("button", { name: fa.auth.savePassword }).click();
}

async function compose(caption, targets) {
  await goTo(fa.nav.compose, fa.composer.title);
  for (const [name, type] of targets) {
    await page.getByRole("checkbox", { name: new RegExp(name) }).click();
    if (type) await page.locator(`#ct-${name.toLowerCase()}`).selectOption(type);
  }
  await page.locator("#caption").fill(caption);
}

async function upload(file) {
  await page.getByLabel(fa.media.choose).setInputFiles(path.join(MEDIA, file));
  await page.getByRole("list", { name: fa.media.listLabel }).getByLabel(fa.media.uploaded).first().waitFor({ timeout: 30_000 });
}

async function waitForPost(caption, { live = 1, failed = false, timeout = 90_000 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    await page.reload();
    const row = page.getByRole("article").filter({ hasText: caption }).first();
    await row.waitFor({ timeout: 15_000 });
    const views = await row.getByRole("link", { name: new RegExp(fa.posts.viewLive) }).count();
    const failedNow = (await row.getByText(fa.states.failed).count()) + (await row.getByText(fa.states.partial).count());
    if (failed ? failedNow > 0 : views >= live) return row;
    if (Date.now() > deadline) throw new Error(`"${caption}": ${views} live link(s), failed=${failedNow} after ${timeout / 1000}s`);
    await page.waitForTimeout(3_000);
  }
}

function signedRequest(payload, secret) {
  const b64 = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const body = b64(JSON.stringify({ algorithm: "HMAC-SHA256", issued_at: Math.floor(Date.now() / 1000), ...payload }));
  return `${b64(crypto.createHmac("sha256", secret).update(body).digest())}.${body}`;
}

(async () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // only for reading the fake's /__debug
  // Start from nothing: no accounts in the database, no calls recorded by the fake networks.
  sql("SET client_min_messages = warning; TRUNCATE users, profiles, deletion_receipts CASCADE");
  await fetch(`${FAKE}/__reset`, { method: "POST" });
  const browser = await chromium.launch();
  context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "fa-IR", viewport: { width: 1360, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
  // The networks' real login pages are served by the fake (same path, host moved into the path).
  for (const host of ["www.instagram.com", "www.facebook.com", "www.tiktok.com", "www.linkedin.com"]) {
    await context.route(`https://${host}/**`, async (route) => {
      const u = new URL(route.request().url());
      const response = await route.fetch({ url: `${FAKE}/${host}${u.pathname}${u.search}` });
      await route.fulfill({ response });
    });
  }
  page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && !/status of (401|404|409|422)/.test(m.text()) && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // ============================================================ accounts
  let adminLink;
  await step(1, "Owner runs `create-admin`; signed-out visitors are sent to the sign-in page", async () => {
    const out = execFileSync(path.join(__dirname, "start_direct_backend.sh"), ["cli", "create-admin", "--email", ADMIN.email, "--name", "Blakra"], {
      encoding: "utf8",
    });
    adminLink = out.match(/https?:\/\/\S+\/invite#\S+/)?.[0];
    check(adminLink?.startsWith(`${APP}/invite#`), `no invite link in:\n${out}`);
    await page.goto(`${APP}/posts`);
    await page.getByRole("heading", { name: fa.auth.signInTitle }).waitFor();
    check(page.url().includes("/login?next=%2Fposts"), `redirected to ${page.url()}`);
    await shot("01-sign-in");
  });

  await step(2, "Owner opens the link: weak password refused, good one signs in; link removed from the address bar", async () => {
    await page.goto(adminLink);
    await page.getByRole("heading", { name: fa.auth.welcomeTitle }).waitFor();
    check(!page.url().includes("#"), "token still in the URL");
    await setPassword("owner-blakra-1");
    await page.getByText(fa.auth.passwordWeak).waitFor();
    await shot("02a-set-password");
    await setPassword(ADMIN.password);
    await page.getByRole("heading", { name: fa.composer.title }).waitFor({ timeout: 15_000 });
    await nav().getByRole("link", { name: fa.nav.admin }).waitFor();
    await page.goto(adminLink);
    await page.getByText(fa.auth.linkExpired).waitFor(); // single use
  });

  let customerLink;
  await step(3, "Admin creates a customer account and gets a one-time link", async () => {
    await page.goto(`${APP}/admin`);
    await page.getByRole("heading", { name: fa.admin.title }).waitFor();
    await page.getByLabel(fa.admin.name).fill(CUSTOMER.name);
    await page.getByLabel(fa.auth.email).fill(CUSTOMER.email);
    await page.getByRole("button", { name: fa.admin.create }).click();
    const linkBox = page.getByLabel(fa.admin.link);
    await linkBox.waitFor();
    customerLink = await linkBox.inputValue();
    check(customerLink.startsWith(`${APP}/invite#`), customerLink);
    await page.getByRole("button", { name: fa.admin.copy }).click();
    await page.getByRole("button", { name: fa.admin.copied }).waitFor();
    check((await page.evaluate(() => navigator.clipboard.readText())) === customerLink, "clipboard differs");
    await page.getByText(fa.admin.status.invited).first().waitFor();
    await page.getByLabel(fa.auth.email).fill(CUSTOMER.email.toUpperCase());
    await page.getByLabel(fa.admin.name).fill("Duplicate");
    await page.getByRole("button", { name: fa.admin.create }).click();
    await page.getByText(fa.admin.exists).waitFor();
    await shot("03-admin-customers");
  });

  await step(4, "Customer sets a password from the link, has no admin menu, and stays signed in after reload", async () => {
    await signOut();
    await page.goto(customerLink);
    await page.getByText(CUSTOMER.name).waitFor();
    await setPassword(CUSTOMER.password);
    await page.getByRole("heading", { name: fa.composer.title }).waitFor({ timeout: 15_000 });
    check((await nav().getByRole("link", { name: fa.nav.admin }).count()) === 0, "customer sees the admin menu");
    await page.goto(`${APP}/admin`);
    await page.getByRole("heading", { name: fa.composer.title }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: fa.composer.title }).waitFor();
    check(!(await page.getByRole("heading", { name: fa.auth.signInTitle }).count()), "signed out by a reload");
  });

  await step(5, "Wrong password gets one generic message; right password works", async () => {
    await signOut();
    await signIn(CUSTOMER.email, "not-the-password");
    await page.getByText(fa.auth.badLogin).waitFor();
    await signIn(CUSTOMER.email, CUSTOMER.password);
    await page.getByRole("heading", { name: fa.composer.title }).waitFor({ timeout: 15_000 });
  });

  // ============================================================ connections
  await goTo(fa.nav.connections, fa.connections.title);

  await step(6, "Cancelling on Instagram's login page connects nothing", async () => {
    const popup = await openLogin("Instagram");
    await popup.click("#deny");
    await popup.getByText("Access was not approved.").waitFor({ timeout: 10_000 });
    await popup.close().catch(() => {});
    await card("Instagram").getByText(fa.connections.notConnected, { exact: true }).waitFor();
  });

  await step(7, "Instagram, Facebook (Page picker), TikTok and LinkedIn connect through their own login pages", async () => {
    let popup = await openLogin("Instagram");
    const q = new URL(popup.url()).searchParams;
    check(q.get("redirect_uri") === `${API}/oauth/instagram/callback` && q.get("state"), `bad authorize query ${q}`);
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.click("#allow")]);
    await card("Instagram").getByText("@blakra.studio").waitFor({ timeout: 10_000 });

    popup = await openLogin("Facebook");
    await popup.click("#allow");
    await popup.getByRole("button", { name: "Blakra Shop" }).waitFor({ timeout: 10_000 });
    check(!(await popup.getByText("Read-only Page").count()), "a Page without CREATE_CONTENT was offered");
    await shot("07a-facebook-choose-page", popup);
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.getByRole("button", { name: "Blakra Shop" }).click()]);
    await card("Facebook").getByText("Blakra Shop").waitFor({ timeout: 10_000 });

    popup = await openLogin("TikTok");
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.click("#allow")]);
    await card("TikTok").getByText("Blakra TikTok").waitFor({ timeout: 10_000 });

    popup = await openLogin("LinkedIn");
    await Promise.all([popup.waitForEvent("close", { timeout: 15_000 }), popup.click("#allow")]);
    await card("LinkedIn").getByText("Sara Blakra").waitFor({ timeout: 10_000 });
    await shot("07b-all-connected");
  });

  await step(8, "A made-up or replayed login callback is refused", async () => {
    const p2 = await context.newPage();
    await p2.goto(`${API}/oauth/instagram/callback?code=ig-code-x&state=already-used-or-made-up`);
    await p2.getByText(/منقضی|expired|نامعتبر|invalid/i).first().waitFor({ timeout: 5_000 });
    await p2.close();
  });

  // ============================================================ publishing
  await step(9, "Reel to Instagram + Facebook: browser uploads straight to storage, worker publishes both", async () => {
    await compose("ریلز مستقیم #بلکرا", [["Instagram", "reel"], ["Facebook", null]]);
    await upload("vertical.mp4");
    check((await calls(/^\/blakrasocial-media\/u\//, "PUT")).length > 0, "no presigned PUT reached the bucket");
    await page.getByText(fa.composer.allGood).waitFor();
    await shot("09a-compose");
    await page.getByRole("button", { name: fa.composer.publishCta }).dblclick(); // double-click must not double-post
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    await waitForPost("ریلز مستقیم", { live: 2 });
    await shot("09b-published");
    const d = await debug();
    const reels = Object.values(d.published).filter((p) => p.network === "instagram");
    check(reels.length === 1 && reels[0].media_type === "REELS", `instagram got ${JSON.stringify(reels)}`);
    check(Object.keys(d.videos).length === 1, `facebook got ${Object.keys(d.videos).length} videos`);
  });

  await step(10, "TikTok form follows TikTok's rules: creator shown, no default privacy, Duet locked, consent text", async () => {
    await compose("تیک‌تاک مستقیم", [["TikTok", null]]);
    await upload("vertical.mp4");
    await page.getByText("Blakra TikTok").first().waitFor({ timeout: 10_000 });
    check((await page.locator("#tt-visibility").inputValue()) === "", "a privacy level was pre-selected");
    const options = await page.locator("#tt-visibility option:not([disabled])").allTextContents();
    check(options.length === 2, `offered ${options}`); // only what this creator allows
    check(await page.getByRole("switch", { name: fa.tiktok.allowDuet }).isDisabled(), "Duet should be locked");
    check((await page.getByRole("switch", { name: fa.tiktok.allowComments }).getAttribute("aria-checked")) === "false", "comments on by default");
    await page.getByTestId("tiktok-consent").getByRole("link", { name: fa.tiktok.musicUsage }).waitFor();
    check(await page.getByRole("button", { name: fa.composer.publishCta }).isDisabled(), "publish allowed without privacy");
    await page.getByRole("switch", { name: fa.tiktok.disclose }).click();
    await page.getByRole("switch", { name: fa.tiktok.brandedContent }).click();
    await page.getByText(fa.tiktok.label.paidPartnership).waitFor();
    await page.getByTestId("tiktok-consent").getByRole("link", { name: fa.tiktok.brandedPolicy }).waitFor();
    check(await page.locator("#tt-visibility option[value=private]").isDisabled(), "branded content allowed as private");
    await shot("10-tiktok-form");
    await page.getByRole("switch", { name: fa.tiktok.disclose }).click(); // not an ad after all
    await page.locator("#tt-visibility").selectOption("public");
    await page.getByRole("switch", { name: fa.tiktok.allowComments }).click();
    await page.getByRole("button", { name: fa.composer.publishCta }).click();
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    await waitForPost("تیک‌تاک مستقیم");
    const [tt] = Object.values((await debug()).tiktok).filter((t) => !t.inbox);
    const info = tt.post_info;
    check(info.privacy_level === "PUBLIC_TO_EVERYONE" && info.disable_comment === false && info.disable_duet === true, JSON.stringify(info));
    check(info.brand_content_toggle === false && tt.received === tt.source_info.video_size, JSON.stringify(tt));
  });

  await step("10b", "TikTok inbox upload: no audience asked, video lands in the creator's TikTok inbox", async () => {
    await compose("تیک‌تاک صندوق", [["TikTok", null]]);
    await upload("vertical.mp4");
    await page.getByText("Blakra TikTok").first().waitFor({ timeout: 10_000 });
    await page.getByRole("radio", { name: fa.tiktok.deliveryMode.inbox }).click();
    await page.getByText(fa.tiktok.inboxNotice).waitFor();
    check((await page.locator("#tt-visibility").count()) === 0, "audience still asked in inbox mode");
    check((await page.getByTestId("tiktok-consent").count()) === 0, "direct-post consent shown in inbox mode");
    await page.getByText(fa.composer.allGood).waitFor();
    await shot("10b-tiktok-inbox");
    await page.getByRole("button", { name: fa.composer.publishCta }).click();
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    const deadline = Date.now() + 60_000;
    for (;;) {
      await page.reload();
      const row = page.getByRole("article").filter({ hasText: "تیک‌تاک صندوق" }).first();
      await row.waitFor({ timeout: 15_000 });
      if (await row.getByText(fa.posts.tiktokInbox).count()) break;
      if (Date.now() > deadline) throw new Error("inbox notice never shown on the post");
      await page.waitForTimeout(3_000);
    }
    const inbox = Object.values((await debug()).tiktok).filter((t) => t.inbox);
    check(inbox.length === 1 && inbox[0].received === inbox[0].source_info.video_size, JSON.stringify(inbox));
  });

  await step(11, "Photo to LinkedIn + Instagram (JPEG): image uploaded to LinkedIn first, then posted", async () => {
    await compose("عکس لینکدین و اینستاگرام", [["LinkedIn", null], ["Instagram", "post"]]);
    await upload("square.jpg");
    await page.getByText(fa.composer.allGood).waitFor();
    await page.getByRole("button", { name: fa.composer.publishCta }).click();
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    await waitForPost("عکس لینکدین", { live: 2 });
    const [li] = Object.values((await debug()).linkedin);
    check(li.content?.media?.id?.startsWith("urn:li:image:") && li.author === "urn:li:person:li-member-1", JSON.stringify(li));
  });

  await step(12, "A scheduled post waits, then the worker publishes it when it is due", async () => {
    await compose("پست زمان‌بندی‌شده لینکدین", [["LinkedIn", null]]);
    await page.getByRole("radio", { name: fa.composer.schedule }).click();
    const d = new Date(Date.now() + 10 * 60_000);
    const pad = (x) => String(x).padStart(2, "0");
    await page.locator("#schedule-at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    await page.getByRole("button", { name: fa.composer.scheduleCta }).click();
    await page.getByText(fa.composer.scheduled).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(5_000); // several worker ticks
    check(Object.keys((await debug()).linkedin).length === 1, "published before its time");
    // Test shortcut: move the due time to now instead of waiting 10 minutes.
    sql("UPDATE post_targets SET due_at = now() WHERE post_id IN (SELECT id FROM posts WHERE caption LIKE 'پست زمان%')");
    await goTo(fa.nav.posts, fa.posts.title);
    await waitForPost("پست زمان‌بندی‌شده");
  });

  await step(13, "Scheduling then deleting cancels the post before it reaches any network", async () => {
    const before = (await calls(/^\/graph\./, "POST")).length;
    await compose("ریلز لغوشده", [["Instagram", "reel"]]);
    await upload("vertical.mp4");
    await page.getByRole("radio", { name: fa.composer.schedule }).click();
    const d = new Date(Date.now() + 10 * 60_000);
    const pad = (x) => String(x).padStart(2, "0");
    await page.locator("#schedule-at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    await page.getByRole("button", { name: fa.composer.scheduleCta }).click();
    await page.getByText(fa.composer.scheduled).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    const row = page.getByRole("article").filter({ hasText: "ریلز لغوشده" }).first();
    await row.getByRole("button", { name: fa.posts.delete }).click();
    const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await dialog.getByText(fa.posts.cancelTitle).waitFor();
    await dialog.getByRole("button", { name: fa.posts.delete }).click();
    await page.getByText(fa.posts.deleted).waitFor({ timeout: 15_000 });
    sql("UPDATE post_targets SET due_at = now() WHERE post_id IN (SELECT id FROM posts WHERE caption LIKE 'ریلز لغو%')");
    await page.waitForTimeout(5_000);
    check((await calls(/^\/graph\./, "POST")).length === before, "a cancelled post reached a network");
  });

  await step(14, "User removes the app on Instagram: the post fails with a clear reason and the card asks to reconnect", async () => {
    await fetch(`${FAKE}/__revoke/instagram`, { method: "POST" });
    await compose("بعد از لغو دسترسی", [["Instagram", "post"]]);
    await upload("square.jpg");
    await page.getByRole("button", { name: fa.composer.publishCta }).click();
    await page.getByText(fa.composer.sending).waitFor({ timeout: 30_000 });
    await goTo(fa.nav.posts, fa.posts.title);
    await waitForPost("بعد از لغو دسترسی", { failed: true });
    await shot("14a-failed-post");
    await goTo(fa.nav.connections, fa.connections.title);
    await card("Instagram").getByText(fa.connections.needsReconnect).first().waitFor({ timeout: 10_000 });
    await shot("14b-needs-reconnect");
  });

  await step(15, "Meta data-deletion callback (signed by Meta) removes the Facebook connection and gives a status page", async () => {
    const res = await fetch(`${API}/meta/facebook/data-deletion`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: signedRequest({ user_id: "10000000000000042" }, "fb-secret-fake") }),
    });
    const body = await res.json();
    check(res.status === 200 && body.url && body.confirmation_code, JSON.stringify(body));
    const forged = await fetch(`${API}/meta/facebook/data-deletion`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: signedRequest({ user_id: "10000000000000042" }, "wrong-secret") }),
    });
    check(forged.status >= 400, `forged request answered ${forged.status}`);
    const status = await context.newPage();
    await status.goto(body.url);
    await status.getByText(body.confirmation_code).first().waitFor();
    await shot("15a-deletion-status", status);
    await status.close();
    await page.reload();
    await card("Facebook").getByText(fa.connections.notConnected, { exact: true }).waitFor({ timeout: 10_000 });
  });

  await step(16, "Privacy, terms and data-deletion pages are public and show the contact email", async () => {
    const p2 = await browser.newPage({ locale: "en-US" });
    for (const [route, heading] of [["/privacy", "Privacy policy"], ["/terms", "Terms of service"], ["/data-deletion", "Data deletion"]]) {
      await p2.goto(`${APP}${route}`);
      await p2.getByRole("heading", { name: heading, level: 1 }).waitFor();
      await p2.getByText("privacy@blakra.example").first().waitFor();
    }
    await shot("16-privacy", p2);
    await p2.close();
  });

  await step(17, "Admin deletes the customer: sign-in, connections, posts and uploaded files are all gone", async () => {
    const before = (await debug()).objects.filter((k) => k.startsWith("u/")).length;
    check(before > 0, "no uploaded files to delete");
    await signOut();
    await signIn(ADMIN.email, ADMIN.password);
    await page.getByRole("heading", { name: fa.composer.title }).waitFor({ timeout: 15_000 });
    await goTo(fa.nav.admin, fa.admin.title);
    const row = page.locator("li").filter({ hasText: CUSTOMER.email });
    await row.getByText(fa.admin.status.active, { exact: true }).waitFor();
    await row.getByRole("button", { name: fa.admin.delete }).click();
    await page.getByRole("dialog").getByRole("button", { name: fa.admin.deleteConfirm }).click();
    await page.getByText(fa.admin.deleted.replace("{{name}}", CUSTOMER.name)).waitFor({ timeout: 15_000 });
    await row.waitFor({ state: "detached" });
    await shot("17-customer-deleted");
    const left = (await debug()).objects.filter((k) => k.startsWith("u/"));
    check(left.length === 0, `files left: ${left}`);
    check(sql("SELECT count(*) FROM credentials") === "0" && sql("SELECT count(*) FROM posts") === "0", "rows left in the database");
    await signOut();
    await signIn(CUSTOMER.email, CUSTOMER.password);
    await page.getByText(fa.auth.badLogin).waitFor();
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (consoleErrors.length) console.log("Console errors:\n  " + consoleErrors.join("\n  "));
  process.exit(failed.length ? 1 : 0);
})();
