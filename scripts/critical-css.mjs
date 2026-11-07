/*
 * The first screen's CSS, for the prerenderer to inline: the built sheet with every rule removed
 * that cannot touch the first screen. A small parser for the sheet Vite emits (minified, no comments):
 * a rule stays when each class and id of one of its selectors is on the first screen or is set at
 * run time on <html> (motion and world state). Rules without a class (tokens, resets) always stay.
 * It only removes: what stays keeps its order, and the whole sheet follows at the end of <body>.
 */

/** Classes the page sets at run time on <html> before or just after the first paint. */
const RUNTIME = new Set(['js', 'booted', 'loading', 'motion-on', 'motion-off', 'gl-live', 'gl-off', 'porthole-margin', 'custom-cursor', 'lenis', 'lenis-smooth', 'lenis-stopped'])

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

/** Where the element that opens at `from` ends (after its closing tag), counting nesting by tag. */
function elementEnd(html, from) {
  const tag = /<\/?([a-zA-Z][\w-]*)(?:"[^"]*"|'[^']*'|[^'">])*?(\/?)>/g
  tag.lastIndex = from
  let depth = 0
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    const name = m[1].toLowerCase()
    if (VOID.has(name) || m[2]) {
      if (depth === 0) return tag.lastIndex
      continue
    }
    depth += m[0][1] === '/' ? -1 : 1
    if (depth === 0) return tag.lastIndex
  }
  return html.length
}

/** The elements directly inside `<main>`, as [start, end] offsets. */
function mainChildren(html) {
  const open = html.match(/<main\b[^>]*>/)
  if (!open) return []
  const close = elementEnd(html, open.index) - '</main>'.length
  const out = []
  let at = open.index + open[0].length
  while (at < close) {
    const next = html.indexOf('<', at)
    if (next < 0 || next >= close) break
    if (html.startsWith('<!--', next)) {
      at = html.indexOf('-->', next) + 3
      continue
    }
    const end = elementEnd(html, next)
    out.push([next, end])
    at = end
  }
  return out
}

/**
 * The class names on the first screen of a rendered page: everything before <main>'s first child
 * ends (the header too), and its last child (on the home page, the fixed depth gauge).
 */
export function firstScreenClasses(html) {
  const kids = mainChildren(html)
  const parts = kids.length ? [html.slice(0, kids[0][1]), html.slice(...kids.at(-1))] : [html]
  const names = new Set()
  for (const part of parts) {
    for (const m of part.matchAll(/\bclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) names.add(c)
    for (const m of part.matchAll(/\bid="([^"]*)"/g)) names.add(`#${m[1]}`)
  }
  return names
}

/** The sheet's top level as nodes: { prelude, body } for blocks, { text } for statements. */
function parse(css) {
  const nodes = []
  let i = 0
  while (i < css.length) {
    let start = i
    let quote = ''
    let paren = 0
    for (; i < css.length; i++) {
      const c = css[i]
      if (quote) {
        if (c === '\\') i++
        else if (c === quote) quote = ''
      } else if (c === '"' || c === "'") quote = c
      else if (c === '(') paren++
      else if (c === ')') paren--
      else if (paren === 0 && (c === '{' || c === ';')) break
    }
    if (i >= css.length) break
    if (css[i] === ';') {
      nodes.push({ text: css.slice(start, i + 1) })
      i++
      continue
    }
    const prelude = css.slice(start, i).trim()
    const open = ++i
    let depth = 1
    quote = ''
    for (; i < css.length && depth; i++) {
      const c = css[i]
      if (quote) {
        if (c === '\\') i++
        else if (c === quote) quote = ''
      } else if (c === '"' || c === "'") quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
    }
    nodes.push({ prelude, body: css.slice(open, i - 1) })
  }
  return nodes
}

/** Split a selector list on its top-level commas. */
function splitSelectors(list) {
  const out = []
  let depth = 0
  let from = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) {
      out.push(list.slice(from, i))
      from = i + 1
    }
  }
  out.push(list.slice(from))
  return out
}

/** Whether a selector can match on the first screen; functional pseudo-classes and attribute values are not read. */
function reaches(selector, used) {
  let plain = selector
  for (let prev = ''; prev !== plain; ) {
    prev = plain
    plain = plain.replace(/:[\w-]+\([^()]*\)/g, '').replace(/\[[^\]]*\]/g, '')
  }
  for (const m of plain.matchAll(/([.#])(-?[\w-]+)/g)) {
    const name = m[1] === '#' ? `#${m[2]}` : m[2]
    if (!used.has(name) && !RUNTIME.has(name)) return false
  }
  return true
}

function filter(css, used, keptKeyframes) {
  let out = ''
  for (const node of parse(css)) {
    if (node.text) {
      out += node.text
      continue
    }
    const { prelude, body } = node
    if (/^@(media|supports|layer|container)\b/.test(prelude)) {
      const inner = filter(body, used, keptKeyframes)
      if (inner) out += `${prelude}{${inner}}`
    } else if (/^@(-webkit-)?keyframes\b/.test(prelude)) keptKeyframes.push({ name: prelude.split(/\s+/)[1], text: `${prelude}{${body}}` })
    else if (prelude.startsWith('@')) out += `${prelude}{${body}}`
    else {
      const kept = splitSelectors(prelude).filter((s) => reaches(s, used))
      if (kept.length) out += `${kept.join(',')}{${body}}`
    }
  }
  return out
}

/** The rules of `css` that can touch the first screen, whose classes are `used`. */
export function criticalCss(css, used) {
  const keyframes = []
  const out = filter(css, used, keyframes)
  return out + keyframes.filter((k) => out.includes(k.name)).map((k) => k.text).join('')
}
