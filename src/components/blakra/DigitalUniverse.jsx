import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';

const NODES = [
  { label: 'Neural Core',  r: 0, angle: 0,   ring: 0, hue: 265 },
  { label: 'Quantum Mesh', r: 1, angle: 0,   ring: 1, hue: 190 },
  { label: 'Vision Lab',   r: 1, angle: 72,  ring: 1, hue: 280 },
  { label: 'Data Nexus',   r: 1, angle: 144, ring: 1, hue: 220 },
  { label: 'Robo Cortex',  r: 1, angle: 216, ring: 1, hue: 265 },
  { label: 'Edge Cloud',   r: 1, angle: 288, ring: 1, hue: 190 },
  { label: 'Synth Engine', r: 2, angle: 20,  ring: 2, hue: 280 },
  { label: 'Bio Link',     r: 2, angle: 80,  ring: 2, hue: 220 },
  { label: 'Holo Grid',    r: 2, angle: 140, ring: 2, hue: 265 },
  { label: 'Pulse Net',    r: 2, angle: 200, ring: 2, hue: 190 },
  { label: 'Signal AI',    r: 2, angle: 260, ring: 2, hue: 280 },
  { label: 'Deep Cast',    r: 2, angle: 320, ring: 2, hue: 220 },
];

export default function DigitalUniverse() {
  const canvasRef  = useRef(null);
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const mouseRef   = useRef({ x: 0.5, y: 0.5 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const rafRef = useRef(null);
  const velocity = useScrollVelocity();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  // Depth parallax — title drifts against canvas
  const titleY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const titleX = useTransform(scrollYProgress, [0, 1], ['-1%', '1%']);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    };
    canvas.addEventListener('mousemove', onMove);

    const draw = () => {
      t += 1;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const cx = W / 2, cy = H / 2;
      const radii = [0, Math.min(W, H) * 0.18, Math.min(W, H) * 0.36];

      // "Motion blur" trail
      ctx.fillStyle = 'rgba(4,6,8,0.25)';
      ctx.fillRect(0, 0, W, H);

      const mx = (mouseRef.current.x - 0.5) * 22;
      const my = (mouseRef.current.y - 0.5) * 22;

      // Orbit rings with subtle glow
      [1, 2].forEach((ring) => {
        const grd = ctx.createRadialGradient(cx + mx * 0.05, cy + my * 0.05, radii[ring] - 1, cx + mx * 0.05, cy + my * 0.05, radii[ring] + 1);
        grd.addColorStop(0, 'rgba(255,255,255,0.04)');
        grd.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        grd.addColorStop(1, 'rgba(255,255,255,0.02)');
        ctx.beginPath();
        ctx.arc(cx + mx * 0.05, cy + my * 0.05, radii[ring], 0, Math.PI * 2);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const positions = NODES.map((n) => {
        const r = radii[n.ring];
        // Time dilation: ring 1 slower, ring 2 faster = emphasis contrast
        const speed = n.ring === 1 ? 0.12 : n.ring === 2 ? -0.18 : 0;
        const angle = ((n.angle + t * speed) * Math.PI) / 180;
        return {
          ...n,
          px: cx + Math.cos(angle) * r + mx * (n.ring * 0.1),
          py: cy + Math.sin(angle) * r + my * (n.ring * 0.1),
        };
      });

      // Connections
      positions.forEach((a, i) => {
        positions.forEach((b, j) => {
          if (j <= i) return;
          if (a.ring === 0 || b.ring === 0 || (a.ring !== b.ring && Math.abs(a.hue - b.hue) < 100)) {
            const dist = Math.sqrt((a.px - b.px) ** 2 + (a.py - b.py) ** 2);
            if (dist > Math.min(W, H) * 0.44) return;
            const isHighlighted = hoveredNode === i || hoveredNode === j;
            const grad = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
            grad.addColorStop(0, `hsla(${a.hue},70%,60%,${isHighlighted ? 0.4 : 0.05})`);
            grad.addColorStop(1, `hsla(${b.hue},70%,60%,${isHighlighted ? 0.3 : 0.03})`);
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.strokeStyle = grad;
            ctx.lineWidth = isHighlighted ? 1 : 0.4;
            ctx.stroke();
          }
        });
      });

      // Nodes — material: plasma (emissive)
      positions.forEach((n, i) => {
        const isHover = hoveredNode === i;
        const baseSize = n.ring === 0 ? 9 : n.ring === 1 ? 4.5 : 3;
        // Inertia: nodes breathe with slightly offset phases
        const breath = 1 + Math.sin(t * 0.025 + i) * 0.12;
        const size = baseSize * (isHover ? 2 : breath);

        // Volumetric glow (plasma material)
        for (let gLayer = 3; gLayer >= 1; gLayer--) {
          const gRad = size * (3 + gLayer * 2);
          const gGrad = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, gRad);
          const gAlpha = isHover ? 0.2 / gLayer : 0.04 / gLayer;
          gGrad.addColorStop(0, `hsla(${n.hue},85%,65%,${gAlpha})`);
          gGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = gGrad;
          ctx.beginPath();
          ctx.arc(n.px, n.py, gRad, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(n.px, n.py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue},85%,72%,${isHover ? 1 : 0.55})`;
        ctx.fill();

        if (isHover && n.ring > 0) {
          ctx.save();
          ctx.font = 'bold 8.5px "JetBrains Mono"';
          ctx.fillStyle = 'rgba(255,255,255,0.65)';
          ctx.textAlign = 'center';
          ctx.letterSpacing = '2px';
          ctx.fillText(n.label.toUpperCase(), n.px, n.py - size - 10);
          ctx.restore();
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, [hoveredNode]);

  return (
    <section
      id="universe"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#040608', minHeight: '100vh' }}
    >
      {/* Depth-of-field top fade from previous scene */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, #04060a, transparent)' }}
      />

      {/* DEPTH LAYER 0 — title (parallax foreground) */}
      <motion.div
        style={{ y: titleY, x: titleX }}
        className="absolute z-20 pointer-events-none"
        style={{ top: '12vh', left: 'max(32px, 6vw)', y: titleY, x: titleX }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-10"
        >
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Digital Universe</span>
        </motion.div>

        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-4">
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: '105%' }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
              className="font-grotesk text-[clamp(36px,6vw,90px)] font-bold tracking-[-0.04em] leading-none text-white"
            >
              Living<br />
              <span className="text-white/10 italic font-light">Galaxy</span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 1 }}
            className="font-inter font-light text-xs md:text-sm text-white/20 max-w-[260px] leading-relaxed md:mb-2"
          >
            Twelve systems in orbital resonance. Each node a specialized intelligence. Together — one unified field.
          </motion.p>
        </div>
      </motion.div>

      {/* DEPTH LAYER 1 — canvas galaxy (background) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 1.5 }}
        className="relative w-full border-t border-white/[0.03]"
        style={{ marginTop: 'calc(12vh + 220px)', height: 'min(60vw, 540px)' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute bottom-4 right-5 font-mono text-[8px] tracking-[0.25em] text-white/10 uppercase">
          {NODES.length} Systems · Orbital Field Active
        </div>
      </motion.div>

      {/* Bottom depth fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #040608)' }}
      />
    </section>
  );
}