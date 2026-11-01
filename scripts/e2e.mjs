// Acceptance checks against the built site in system Chrome. Run `npm run build` first.
// The contact endpoint is always intercepted: no test ever reaches the real form.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'e2e-shots')
const PORT = 4174
const BASE = `http://localhost:${PORT}`
const ENDPOINT = '**/macros/s/**'
const results = []
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
const stop = () => {
  try {
    process.kill(-server.pid)
  } catch {}
}
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(BASE)).ok) break
  } catch {}
  await new Promise((r) => setTimeout(r, 200))
}

await mkdir(shots, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
// Node strips the types from the content modules, so the checks use the site's real copy in every language.
const { readdir } = await import('node:fs/promises')
const localeFiles = (await readdir(join(root, 'src/content/locales'))).filter((f) => f.endsWith('.ts'))
const dicts = Object.fromEntries(await Promise.all(localeFiles.map(async (f) => { const code = f.replace('.ts', ''); return [code, (await import(join(root, 'src/content/locales', f)))[code]] })))
const prefix = (code) => (code === 'en' ? '' : `/${code}`)

try {
  // AC1: every route ships its full copy as HTML, readable with JavaScript off.
  const expected = {}
  for (const [code, t] of Object.entries(dicts)) {
    const p = prefix(code)
    expected[`${p}/`] = [
      t.prologue.title.before, t.prologue.lede, t.prologue.facts, t.pulse.title, ...Object.values(t.pulse.needs).map((n) => n.label),
      // The proof's five rows (WP-E): sector, the one-line story, the system and the outcome; before/now left the page with the storyboard.
      ...Object.values(t.chapters).flatMap((c) => [c.sector, c.moment, c.system, ...c.outcomes]), ...t.day.delivered.items,
      // The stage (WP-D) names the seven layers; their one-line texts left the page with the old Engine section.
      t.engine.title, ...Object.values(t.engine.layers).map((l) => l.name), t.engine.crownTitle,
      t.products.title, ...Object.values(t.products.items).flatMap((i) => [i.line, i.offer]), t.products.more,
      t.process.title, ...t.process.steps.map((s) => s.name), t.people.title, ...t.people.roles.map((r) => r.ask), t.contact.title, t.contact.horizon,
    ]
    expected[`${p}/investors/`] = [t.investors.title, ...t.investors.thesis, t.investors.ask, t.investors.ndaTitle, t.investors.deck, t.investors.disclaimer]
    expected[`${p}/privacy/`] = [t.privacy.title, t.privacy.who, ...t.privacy.sections.map((x) => x.text)]
    expected[`${p}/legal/`] = [t.legal.title, t.legal.providerTitle, 'BLAKRA LLC', '901 H St Ste 120']
    expected[`${p}/404.html`] = [t.notFound.title]
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })
  for (const [path, needles] of Object.entries(expected)) {
    const page = await noJs.newPage()
    await page.goto(BASE + path)
    // Case-blind: innerText follows CSS text-transform (eyebrows and fact lines are set in capitals).
    const norm = (x) => x.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').toLowerCase()
    const text = norm(await page.evaluate(() => document.body.innerText))
    const missing = needles.filter((n) => !text.includes(norm(n)))
    check('AC1', `no-JS copy on ${path}`, missing.length === 0, missing.join(' | '))
    await page.close()
  }
  const status404 = (await fetch(`${BASE}/does-not-exist`)).status
  check('AC1', 'unknown paths are not served as the home page', status404 === 404 || (await (await fetch(`${BASE}/does-not-exist`)).text()).includes(dicts.en.notFound.title), `status ${status404}`)
  await noJs.close()

  // AC2: reduced motion: no pins, no Lenis, the day reads top to bottom, every line visible.
  const calm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  {
    const page = await calm.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(1200)
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 30))
      }
    })
    const state = await page.evaluate(() => {
      const acts = ['#top', '#stage', '#day', '#products', '#approach', '#people', '#contact']
      // Screen-reader-only text (1 px, clipped on purpose) is not hidden text.
      const text = [...document.querySelectorAll(acts.map((a) => `${a} *`).join(','))].filter((el) => el.children.length === 0 && el.textContent.trim() && el.getBoundingClientRect().width > 1)
      const day = document.getElementById('day').getBoundingClientRect()
      return {
        pins: document.querySelectorAll('.pin-spacer').length,
        lenis: document.documentElement.classList.contains('lenis'),
        held: acts.filter((a) => [...document.querySelectorAll(`${a} *`)].some((el) => getComputedStyle(el).position === 'sticky')),
        hidden: text.filter((el) => {
          const cs = getComputedStyle(el)
          return Number(cs.opacity) < 1 || cs.visibility === 'hidden' || (cs.clipPath !== 'none' && cs.clipPath !== '')
        }).length,
        details: [...document.querySelectorAll('#stage li')].every((li) => li.lastElementChild.getBoundingClientRect().height > 10),
        casesInside: [...document.querySelectorAll('#day li[id^="h"]')].every((c) => {
          const r = c.getBoundingClientRect()
          return r.top >= day.top - 1 && r.bottom <= day.bottom + 1 && getComputedStyle(c).visibility === 'visible'
        }),
      }
    })
    check('AC2', 'reduced motion: no pinning', state.pins === 0, `${state.pins} pins`)
    check('AC2', 'reduced motion: no smooth scrolling', !state.lenis)
    check('AC2', 'reduced motion: no act holds the screen; every section reads top to bottom', state.held.length === 0, state.held.join(' '))
    check('AC2', 'reduced motion: all text of every act visible, nothing faded or clipped', state.hidden === 0 && state.details, `${state.hidden} hidden, details ${state.details}`)
    check('AC2', 'reduced motion: all five cases visible inside the proof section', state.casesInside)
    await page.screenshot({ path: join(shots, 'reduced-motion-full.png'), fullPage: true })
    await page.close()
  }
  await calm.close()

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const errors = []

  // AC5: the form.
  {
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    let posts = []
    let reply = { status: 200, body: JSON.stringify({ ok: true }), contentType: 'application/json' }
    await page.route(ENDPOINT, async (route) => {
      posts.push(JSON.parse(route.request().postData() ?? '{}'))
      await route.fulfill(reply)
    })
    await page.goto(BASE + '/#contact')
    await page.waitForTimeout(1500)
    const submit = page.locator('#contact button[type="submit"]')

    await submit.click()
    const invalid = await page.locator('#contact [aria-invalid="true"]').count()
    // The error summary (role="alert") takes focus first; each of its links leads to a field (d-05-form-states).
    const focused = await page.evaluate(() => ({ role: document.activeElement?.getAttribute('role'), links: document.querySelectorAll('#contact [role="alert"] a[href^="#contact-"]').length }))
    check('AC5', 'invalid input: inline errors, focus on the error summary with a link per field, nothing sent', invalid === 3 && focused.role === 'alert' && focused.links === 3 && posts.length === 0, `${invalid} invalid, focus ${JSON.stringify(focused)}`)

    await page.fill('#contact-org', 'Northwind Retail')
    await page.fill('#contact-email', 'ops@northwind.example')
    await page.fill('#contact-msg', 'We re-type every order from email into our ERP.')
    await page.waitForTimeout(3100)

    reply = { status: 200, body: '<html>The script completed but did not return anything.</html>', contentType: 'text/html' }
    await submit.click()
    await page.locator('#contact [role="alert"] p').waitFor({ timeout: 4000 })
    check('AC5', 'unconfirmed delivery shows the error with the email address', (await page.locator('#contact [role="alert"]').innerText()).includes('hello@blakra.us'))

    reply = { status: 200, body: JSON.stringify({ ok: true }), contentType: 'application/json' }
    posts = []
    await submit.click()
    await page.locator('#contact [role="status"]').waitFor({ timeout: 4000 })
    const body = posts[0] ?? {}
    check('AC5', 'valid input: posts {intent,org,email,msg} and confirms', body.intent === 'commission' && body.org === 'Northwind Retail' && body.email === 'ops@northwind.example' && body.msg.startsWith('We re-type') && body.website === '' && body.elapsed >= 3000)
    check('AC5', 'success message takes focus', await page.evaluate(() => document.activeElement?.getAttribute('role') === 'status'))
    await page.close()

    const bot = await ctx.newPage()
    let botPosts = 0
    await bot.route(ENDPOINT, (route) => {
      botPosts++
      return route.fulfill({ status: 200, body: '{"ok":true}', contentType: 'application/json' })
    })
    await bot.goto(BASE + '/#contact')
    await bot.waitForTimeout(800)
    await bot.fill('#contact-org', 'Bot')
    await bot.fill('#contact-email', 'bot@spam.example')
    await bot.fill('#contact-msg', 'Buy cheap things now please.')
    await bot.evaluate(() => ((document.querySelector('input[name="website"]')).value = 'http://spam.example'))
    await bot.locator('#contact button[type="submit"]').click()
    await bot.waitForTimeout(500)
    check('AC5', 'honeypot or an instant submit sends nothing', botPosts === 0)
    await bot.close()
  }

  // AC7: no horizontal scroll at four widths, on every page.
  for (const width of [375, 768, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: width < 800 ? 812 : 900 } })
    for (const path of Object.keys(dicts).flatMap((code) => ['/', '/investors/', '/privacy/', '/legal/', '/404.html'].map((x) => prefix(code) + x))) {
      await page.goto(BASE + path)
      await page.waitForTimeout(600)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      check('AC7', `${width}px ${path}: no horizontal scroll`, over <= 0, `${over}px over`)
    }
    await page.goto(BASE + '/')
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(shots, `home-${width}.png`) })
    await page.close()
  }

  // AC8: keyboard. Skip link first, visible focus everywhere, form reachable.
  {
    const page = await ctx.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(1200)
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim())
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)
    const afterSkip = await page.evaluate(() => document.activeElement?.id)
    check('AC8', 'skip link is first and moves focus to main', first === 'Skip to content' && afterSkip === 'main', `${first} → ${afterSkip}`)
    const seen = []
    for (let i = 0; i < 320; i++) {
      await page.keyboard.press('Tab')
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return null
          const shown = el.matches('input[type="radio"]') ? el.closest('label') : el
          const cs = getComputedStyle(shown)
          const visible = cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'
          return { name: el.getAttribute('name') ?? el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30), visible }
        }),
      )
    }
    const stops = seen.filter(Boolean)
    const names = stops.map((s) => s.name)
    check('AC8', 'every focus stop shows a visible indicator', stops.every((s) => s.visible), stops.filter((s) => !s.visible).map((s) => s.name).join(', '))
    check('AC8', 'form fields, doors, language switch and the motion switch are reachable', ['org', 'email', 'msg', 'intent'].every((n) => names.includes(n)) && names.includes('Motion') && names.some((n) => /^Language/.test(n ?? '')), `${stops.length} stops`)
    await page.close()
  }

  // O5: the header CTA from mid-page lands on the contact heading. Its own context, so the
  // pages opened before it cannot slow it down.
  {
    const own = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await own.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4))
    await page.waitForTimeout(900)
    await page.locator('header a.pill:visible', { hasText: 'Start a project' }).click()
    // The glide has a fixed duration; under software rendering frames are slow, so wait for it to land.
    await page.waitForFunction(() => document.activeElement === document.getElementById('contact-title'), null, { timeout: 15000 }).catch(() => {})
    const res = await page.evaluate(() => {
      const h = document.getElementById('contact-title')
      const r = h.getBoundingClientRect()
      return { focused: document.activeElement === h, inView: r.top >= 0 && r.top < innerHeight }
    })
    check('O5', 'header CTA mid-page focuses the contact heading in view', res.focused && res.inView, JSON.stringify(res))
    await own.close()
  }

  // O6: switching motion off in the products section keeps the reader there.
  {
    const page = await ctx.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(2500)
    await page.evaluate(() => window.scrollTo(0, document.getElementById('products').getBoundingClientRect().top + scrollY + 150))
    await page.waitForTimeout(1500)
    await page.locator('header button[aria-label="Motion"]:visible').click()
    await page.waitForTimeout(1500)
    const res = await page.evaluate(() => {
      const r = document.getElementById('products').getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, pins: document.querySelectorAll('.pin-spacer').length, stored: localStorage.getItem('blakra:motion') }
    })
    check('O6', 'motion off keeps the reader in the same section and is remembered', res.top < res.vh / 2 && res.bottom > res.vh / 2 && res.pins === 0 && res.stored === 'off', JSON.stringify(res))
    await page.close()
  }

  // F1/F5: links into the held acts land on the moment the right case and the right layer show.
  // A fresh context: O6 above leaves motion off in `ctx`, and nothing holds without motion.
  {
    const own = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await own.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(3000)
    // From the pulse: the admin-panel answer points to the manufacturing case.
    await page.locator('#pulse button', { hasText: dicts.en.pulse.needs.panel.label }).click()
    await page.waitForTimeout(300)
    await page.evaluate(() => document.querySelector('#pulse [aria-live] a[href="#h17"]').click())
    await page.waitForTimeout(3000)
    const card = await page.evaluate(() => {
      const row = document.getElementById('h17')
      const r = row.getBoundingClientRect()
      return { top: Math.round(r.top), vh: innerHeight, near: row.hasAttribute('data-near'), focused: row.contains(document.activeElement) || row === document.activeElement }
    })
    check('F1', 'a link to a case lands on its row, stitched as nearest, focused', card.top >= 0 && card.top < card.vh && card.near && card.focused, JSON.stringify(card))
    await page.evaluate(() => document.querySelector('#h17 a[href="#layer-data"]').click())
    await page.waitForTimeout(3000)
    const layer = await page.evaluate(() => {
      const li = document.getElementById('layer-data')
      const r = li.getBoundingClientRect()
      return { focused: li === document.activeElement || li.contains(document.activeElement), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, shown: getComputedStyle(li).clipPath === 'none' || !/100%/.test(getComputedStyle(li).clipPath) }
    })
    check('F5', 'a link to the Data layer lands on that row, shown, in view and focused', layer.focused && layer.top >= 0 && layer.bottom <= layer.vh && layer.shown, JSON.stringify(layer))
    await own.close()
  }

  // P1: the pulse. One tap names what it takes, points to proof, and starts the message.
  {
    const page = await ctx.newPage()
    await page.route(ENDPOINT, (route) => route.fulfill({ status: 200, body: '{"ok":true}', contentType: 'application/json' }))
    await page.goto(BASE + '/')
    await page.waitForTimeout(1500)
    const need = dicts.en.pulse.needs.assistant.label
    await page.locator('#pulse button', { hasText: need }).click()
    await page.waitForTimeout(400)
    const res = await page.evaluate(() => ({
      pressed: document.querySelector('#pulse [role="radio"][aria-checked="true"]')?.textContent ?? '',
      verdict: document.querySelector('#pulse [aria-live]')?.textContent ?? '',
      proof: document.querySelector('#pulse [aria-live] a[href^="#h"]')?.getAttribute('href') ?? '',
      msg: document.querySelector('#contact-msg')?.value ?? '',
      // The stage's layers: the ones the answer takes are picked (AI among them), the others not.
      lit: [...document.querySelectorAll('#stage li[id^="layer-"]')].filter((li) => li.dataset.picked === 'true').map((li) => li.id),
      uses: document.querySelector('#pulse [aria-live]')?.textContent.includes('1, 2, 3, 5, 7'),
    }))
    check('P1', 'the pulse answer lights its layers, links its proof and starts the message', res.pressed.includes(need) && res.verdict.includes(dicts.en.pulse.verdict) && res.proof === '#h22' && res.msg.startsWith(need) && res.lit.includes('layer-ai') && !res.lit.includes('layer-design') && res.uses, JSON.stringify({ ...res, verdict: res.verdict.slice(0, 60) }))
    await page.close()
  }

  // S1: the scroll is never taken over. No pins, no snapping, and the page height is final from the start.
  // A fresh context: O6 above leaves motion off in `ctx`.
  {
    const own = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await own.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(1500)
    const early = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.waitForTimeout(4500)
    const late = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, pins: document.querySelectorAll('.pin-spacer').length, lenis: document.documentElement.classList.contains('lenis') }))
    check('S1', 'motion on: no pins or snapping, and the page height never changes after load', late.pins === 0 && Math.abs(late.h - early) < 2, JSON.stringify({ early, ...late }))
    // The stage holds the screen with sticky positioning and the scroll brings the layers into orbit.
    const engine = await page.evaluate(async () => {
      const el = document.getElementById('stage')
      const top = el.getBoundingClientRect().top + scrollY
      window.scrollTo({ top: top + (el.offsetHeight - innerHeight) * 0.6, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 600))
      const w = el.querySelector('[data-window="stage"]').getBoundingClientRect()
      return { held: w.top >= 0 && w.bottom <= innerHeight + 1, p: Number(el.style.getPropertyValue('--hold')), orbit: el.querySelectorAll('#stage li[data-on]').length }
    })
    check('S1', 'the stage holds the screen and the scroll brings the layers into orbit', engine.held && engine.p > 0.3 && engine.p < 0.9 && engine.orbit === 7, JSON.stringify(engine))
    // The proof: five patches, one open case.
    const proof = await page.evaluate(async () => {
      const el = document.getElementById('day')
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 1400))
      return { rows: el.querySelectorAll('li[id^="h"]').length, lit: el.querySelectorAll('li[id^="h"][data-lit]').length }
    })
    check('S1', 'the proof shows five rows and the marker has lit the ones it passed', proof.rows === 5 && proof.lit >= 1, JSON.stringify(proof))
    await own.close()
  }

  // S2: a wide but short laptop screen (nothing holds there): every case is reachable.
  {
    const short = await browser.newContext({ viewport: { width: 1366, height: 650 } })
    const page = await short.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(2500)
    const res = await page.evaluate(() => {
      const day = document.getElementById('day').getBoundingClientRect()
      const cases = [...document.querySelectorAll('#day li[id^="h"]')]
      return {
        visible: cases.every((c) => getComputedStyle(c).visibility === 'visible'),
        inside: cases.map((c) => c.getBoundingClientRect()).every((r) => r.left >= 0 && r.right <= innerWidth && r.top >= day.top - 1 && r.bottom <= day.bottom + 1),
      }
    })
    check('S2', '1366×650 with motion on: the proof reads top to bottom, every case reachable', res.visible && res.inside, JSON.stringify(res))
    await short.close()
  }

  // AC9 and the film: the page stays within the film's length, and the world steps aside without a real GPU.
  // A fresh context: the motion-switch test above leaves motion off in `ctx`.
  {
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await fresh.newPage()
    await page.goto(BASE + '/')
    await page.waitForTimeout(4000)
    const res = await page.evaluate(() => {
      const still = document.querySelector('#top [class*="still"]')
      return {
        screens: document.documentElement.scrollHeight / innerHeight,
        live: document.documentElement.classList.contains('gl-live'),
        off: document.documentElement.classList.contains('gl-off'),
        still: still ? getComputedStyle(still).display !== 'none' : false,
      }
    })
    // The film's own length (seven held acts); a section that grew by accident would show here.
    check('AC9', 'desktop home page is at most 23 screens tall', res.screens <= 23, `${res.screens.toFixed(1)} screens`)
    // This machine renders WebGL in software, so the world must step aside for the drawn still.
    check('—', 'software GPU: no live 3D, the drawn still shows instead', !res.live && res.off && res.still, JSON.stringify(res))
    const forced = await fresh.newPage()
    await forced.goto(BASE + '/?gl=force')
    const live = await forced.waitForFunction(() => document.documentElement.classList.contains('gl-live'), null, { timeout: 60000 }).then(() => true, () => false)
    check('—', '?gl=force starts the live film', live)
    await forced.close()
    await fresh.close()
  }

  check('—', 'no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
} finally {
  await browser.close()
  stop()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: e2e-shots/`)
process.exit(failed.length ? 1 : 0)
