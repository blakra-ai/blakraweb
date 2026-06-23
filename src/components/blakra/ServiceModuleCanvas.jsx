import { useRef, useEffect } from 'react';

/* Draws unique internal micro-graphics per capability */
export default function ServiceModuleCanvas({ capId, hue, active, hovered }) {
  const ref = useRef(null);
  const state = useRef({ t: 0, raf: null, particles: [] });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    /* Build particles once */
    const P = [];
    for (let i = 0; i < 28; i++) {
      P.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        r: 0.5 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    state.current.particles = P;

    const draw = () => {
      const s = state.current;
      s.t += 0.022;
      const t = s.t;
      const W = canvas.width, H = canvas.height;
      const intensity = active ? 1 : hovered ? 0.55 : 0.22;

      ctx.clearRect(0, 0, W, H);

      /* ── Unique visual per capability ── */
      if (capId === 'ai-dev') {
        /* Neural net topology */
        const layers = [[0.18, [0.2, 0.5, 0.8]], [0.5, [0.15, 0.38, 0.62, 0.85]], [0.82, [0.25, 0.5, 0.75]]];
        layers.forEach(([lx, ys], li) => {
          const nextLayer = layers[li + 1];
          if (!nextLayer) return;
          const [nx, nys] = nextLayer;
          ys.forEach((ly, ni) => {
            nys.forEach(ny => {
              const pulse = (t * 0.6 + li * 0.4 + ni * 0.15) % 1;
              const px = (lx + (nx - lx) * pulse) * W;
              const py = (ly + (ny - ly) * pulse) * H;
              ctx.beginPath();
              ctx.moveTo(lx * W, ly * H);
              ctx.lineTo(nx * W, ny * H);
              ctx.strokeStyle = `hsla(${hue},80%,60%,${0.04 * intensity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${hue},100%,70%,${0.7 * intensity})`;
              ctx.fill();
            });
          });
        });
        layers.forEach(([lx, ys]) => ys.forEach(ly => {
          ctx.beginPath();
          ctx.arc(lx * W, ly * H, 3 + Math.sin(t + lx * 8) * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},90%,60%,${0.55 * intensity})`;
          ctx.fill();
        }));

      } else if (capId === 'automation') {
        /* Circular workflow orbits */
        const cx = W * 0.5, cy = H * 0.5;
        const nodes = 6;
        for (let i = 0; i < nodes; i++) {
          const a = (i / nodes) * Math.PI * 2 + t * 0.35;
          const r = Math.min(W, H) * 0.33;
          const nx = cx + Math.cos(a) * r, ny = cy + Math.sin(a) * r * 0.7;
          const nx2 = cx + Math.cos(a + Math.PI * 2 / nodes) * r;
          const ny2 = cy + Math.sin(a + Math.PI * 2 / nodes) * r * 0.7;
          ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx2, ny2);
          ctx.strokeStyle = `hsla(${hue},80%,55%,${0.08 * intensity})`; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},100%,65%,${0.6 * intensity})`; ctx.fill();
          /* data pulse on edge */
          const pe = (t * 0.5 + i * 0.18) % 1;
          const ppx = nx + (nx2 - nx) * pe, ppy = ny + (ny2 - ny) * pe;
          ctx.beginPath(); ctx.arc(ppx, ppy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},100%,80%,${0.9 * intensity})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(cx, cy, 5 + Math.sin(t * 1.5) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,60%,${0.5 * intensity})`; ctx.fill();
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
        glow.addColorStop(0, `hsla(${hue},100%,55%,${0.12 * intensity})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();

      } else if (capId === 'custom-software') {
        /* Code grid / matrix stream */
        const cols = 8, rows = 5;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const alive = Math.sin(t * 1.1 + c * 1.3 + r * 0.9) > 0.2;
            if (!alive) continue;
            const x = (c / (cols - 1)) * W * 0.85 + W * 0.075;
            const y = (r / (rows - 1)) * H * 0.8 + H * 0.1;
            const a = 0.1 + Math.abs(Math.sin(t * 0.8 + c + r)) * 0.55;
            ctx.font = `${7 + Math.random() * 2}px monospace`;
            ctx.fillStyle = `hsla(${hue},80%,65%,${a * intensity})`;
            ctx.fillText(Math.random() > 0.5 ? '1' : '0', x - 3, y + 3);
          }
        }
        /* Connecting horizontal lines */
        for (let r = 0; r < rows; r++) {
          const y = (r / (rows - 1)) * H * 0.8 + H * 0.1;
          const prog = (t * 0.3 + r * 0.22) % 1;
          ctx.beginPath();
          ctx.moveTo(W * 0.075, y); ctx.lineTo(W * 0.075 + W * 0.85 * prog, y);
          ctx.strokeStyle = `hsla(${hue},80%,60%,${0.12 * intensity})`; ctx.lineWidth = 0.5; ctx.stroke();
        }

      } else if (capId === 'robotics') {
        /* Sensor sweep + joint skeleton */
        const cx = W * 0.5, cy = H * 0.55;
        const sweep = (t * 0.4) % (Math.PI * 2);
        const sweepStart = sweep - 0.8, sweepEnd = sweep + 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.min(W,H) * 0.42, sweepStart, sweepEnd);
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue},100%,55%,${0.04 * intensity})`; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweep) * Math.min(W,H) * 0.44, cy + Math.sin(sweep) * Math.min(W,H) * 0.44 * 0.7);
        ctx.strokeStyle = `hsla(${hue},100%,60%,${0.45 * intensity})`; ctx.lineWidth = 1; ctx.stroke();
        /* Joints */
        [[0.5, 0.2], [0.28, 0.5], [0.72, 0.5], [0.5, 0.8]].forEach(([jx, jy]) => {
          ctx.beginPath(); ctx.arc(jx * W, jy * H, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},90%,65%,${0.5 * intensity})`; ctx.fill();
        });
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,70%,${0.7 * intensity})`; ctx.fill();

      } else if (capId === 'data-intelligence') {
        /* Funnel / pipeline convergence */
        const stages = 4;
        for (let s = 0; s < stages; s++) {
          const x = (s / (stages - 1)) * W * 0.8 + W * 0.1;
          const height = H * (0.7 - s * 0.12);
          const y0 = (H - height) / 2;
          ctx.beginPath();
          ctx.moveTo(x, y0); ctx.lineTo(x, y0 + height);
          ctx.strokeStyle = `hsla(${hue},80%,55%,${0.12 * intensity})`; ctx.lineWidth = 1; ctx.stroke();
          /* Dots flowing through pipe */
          for (let d = 0; d < 3; d++) {
            const dp = (t * 0.5 + s * 0.28 + d * 0.35) % 1;
            const dy = y0 + height * dp;
            ctx.beginPath(); ctx.arc(x, dy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue},100%,70%,${0.75 * intensity * (1 - dp * 0.4)})`; ctx.fill();
          }
          /* Stage label */
          ctx.font = `6px monospace`;
          ctx.fillStyle = `hsla(${hue},60%,65%,${0.25 * intensity})`;
          ctx.textAlign = 'center';
          ctx.fillText(['RAW', 'FUSE', 'REASON', 'ACT'][s], x, H * 0.92);
        }

      } else if (capId === 'enterprise-arch') {
        /* Layered box stack / architecture diagram */
        const layers2 = 4;
        for (let l = 0; l < layers2; l++) {
          const ly = H * (0.15 + l * 0.18);
          const lw = W * (0.85 - l * 0.08);
          const lx = (W - lw) / 2;
          const bright = 0.07 + (layers2 - l) * 0.025;
          ctx.beginPath();
          ctx.rect(lx, ly, lw, H * 0.12);
          ctx.strokeStyle = `hsla(${hue},80%,55%,${bright * intensity})`; ctx.lineWidth = 0.7; ctx.stroke();
          /* Moving scan line inside box */
          const scan = ((t * 0.4 + l * 0.25) % 1) * lw;
          ctx.beginPath();
          ctx.moveTo(lx + scan, ly);
          ctx.lineTo(lx + scan, ly + H * 0.12);
          ctx.strokeStyle = `hsla(${hue},100%,65%,${0.18 * intensity})`; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.font = `6px monospace`;
          ctx.fillStyle = `hsla(${hue},60%,65%,${0.2 * intensity})`;
          ctx.textAlign = 'center';
          ctx.fillText(['INFRA', 'PLATFORM', 'SERVICES', 'PRODUCT'][l], W / 2, ly + H * 0.07);
        }
      }

      /* Universal: floating ambient particles */
      P.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const a = (0.08 + Math.sin(t * 0.8 + p.phase) * 0.06) * intensity;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},70%,65%,${a})`; ctx.fill();
      });

      state.current.raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (state.current.raf) cancelAnimationFrame(state.current.raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capId, hue, active, hovered]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}