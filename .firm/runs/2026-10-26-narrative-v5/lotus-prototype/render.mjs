import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const dir = '/tmp/claude-1000/-home-ashen--claude-spares-spare-pV2ctT/610a7134-2340-4c4d-86f3-fa7eb3c57194/scratchpad/lotus'
const frag = readFileSync(`${dir}/${process.argv[2] || 'lotus.frag'}`, 'utf8')
const vert = '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'
const frames = JSON.parse(process.argv[3])
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 640, height: 520 } })
await page.setContent('<canvas id=c width=640 height=520></canvas><style>body{margin:0}</style>')
for (const [name, u] of Object.entries(frames)) {
  await page.evaluate(({ vert, frag, u }) => {
    const c = document.getElementById('c'); const gl = c.getContext('webgl2', { preserveDrawingBuffer: true })
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh }
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vert)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(p); gl.useProgram(p)
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
    const l = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0)
    const U = (n) => gl.getUniformLocation(p, n)
    gl.uniform2f(U('uRes'), c.width, c.height); gl.uniform1f(U('uTime'), u.time ?? 2)
    for (const [k, v] of Object.entries(u)) { if (k === 'time') continue; const loc = U(k); if (Array.isArray(v)) gl[`uniform${v.length}f`](loc, ...v); else gl.uniform1f(loc, v) }
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish()
  }, { vert, frag, u })
  await page.screenshot({ path: `${dir}/${name}.jpg`, type: "jpeg", quality: 86 })
  console.log(name)
}
await browser.close()
