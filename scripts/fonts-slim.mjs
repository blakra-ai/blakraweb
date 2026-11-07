#!/usr/bin/env node
/*
 * Cuts the three self-hosted WOFF2s down to the weights the site's CSS uses, from the @fontsource files:
 * every glyph and OpenType feature of their latin subset stays, the unused part of the weight axis goes.
 * Newsreader italic is only ever set at 400, Geist Mono at 400 … 700, Geist at 300 … 700. A new weight in
 * the CSS means a new run with a wider range here. The @font-face blocks need no change.
 *
 *   npm i --no-save subset-font fontkit && node scripts/fonts-slim.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as fontkit from 'fontkit'
import subsetFont from 'subset-font'

const pkg = (name, file) => join('node_modules/@fontsource-variable', name, 'files', file)
const fonts = [
  { src: pkg('newsreader', 'newsreader-latin-wght-italic.woff2'), out: 'newsreader-latin-wght-italic.woff2', wght: 400 },
  { src: pkg('geist', 'geist-latin-wght-normal.woff2'), out: 'geist-latin-wght-normal.woff2', wght: { min: 300, max: 700 } },
  { src: pkg('geist-mono', 'geist-mono-latin-wght-normal.woff2'), out: 'geist-mono-latin-wght-normal.woff2', wght: { min: 400, max: 700 } },
]

for (const { src, out, wght } of fonts) {
  const bytes = readFileSync(src)
  const font = fontkit.create(bytes)
  const text = String.fromCodePoint(...font.characterSet)
  const features = new Set([...(font.GSUB?.featureList ?? []), ...(font.GPOS?.featureList ?? [])].map((f) => f.tag))
  const slim = await subsetFont(bytes, text, { targetFormat: 'woff2', variationAxes: { wght }, layoutFeatures: [...features], preserveNameIds: [0, 13, 14] })
  writeFileSync(join('src/assets/fonts', out), slim)
  console.log(`${out}: ${bytes.length} → ${slim.length} B`)
}
