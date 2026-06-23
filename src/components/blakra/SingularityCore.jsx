import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import EnergyFlowCanvas from './EnergyFlowCanvas';
import AnimatedText from './AnimatedText';
import SplitText from './SplitText';
import MagneticText from './MagneticText';

/* ─── Particle Engine ───────────────────────────────────────────── */
function BlackHoleEngine({ canvasRef, mouseRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const rings = [
      { count: 120, r: 0.13, speed: 0.0008, tilt: 0.15, hue: 265, width: 0.8 },
      { count: 90,  r: 0.19, speed: -0.0005, tilt: 0.35, hue: 285, width: 0.6 },
      { count: 70,  r: 0.26, speed: 0.0004, tilt: 0.55, hue: 190, width: 0.5 },
      { count: 50,  r: 0.32, speed: -0.0003, tilt: 0.7, hue: 230, width: 0.4 },
      { count: 200, r: 0.42, speed: 0.00025, tilt: 0.2, hue: 270, width: 0.3 },
    ];

    const allParticles = rings.flatMap((ring) =>
      Array.from({ length: ring.count }, (_, i) => ({
        angle: (i / ring.count) * Math.PI * 2 + Math.random() * 0.2,
        baseR: ring.r,
        speed: ring.speed * (0.8 + Math.random() * 0.4),
        tilt: ring.tilt,
        hue: ring.hue + (Math.random() - 0.5) * 20,
        alpha: 0.3 + Math.random() * 0.7,
        size: ring.width * (0.5 + Math.random() * 1.5),
        phase: Math.random() * Math.PI * 2,
        radialDrift: (Math.random() - 0.5) * 0.012,
      }))
    );

    const accretion = Array.from({ length: 300 }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: 0.07 + Math.random() * 0.38,
      speed: 0.002 + Math.random() * 0.006,
      decay: 0.0004 + Math.random() * 0.0008,
      hue: Math.random() > 0.6 ? 270 : 190,
      alpha: 0.15 + Math.random() * 0.4,
      size: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      t += 1;
      const W = canvas.width, H = canvas.height;
      const cx = W * 0.5, cy = H * 0.5;
      const scale = Math.min(W, H);

      ctx.fillStyle = 'rgba(4,4,4,0.18)';
      ctx.fillRect(0, 0, W, H);

      const nebGrad = ctx.createRadialGradient(cx, cy, scale * 0.05, cx, cy, scale * 0.5);
      nebGrad.addColorStop(0, 'rgba(80,30,130,0.04)');
      nebGrad.addColorStop(0.4, 'rgba(40,10,80,0.02)');
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, W, H);

      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const mdx = (mx / W - 0.5) * 40, mdy = (my / H - 0.5) * 40;

      allParticles.forEach((p) => {
        p.angle += p.speed;
        const cosT = Math.cos(p.tilt);
        const r = scale * (p.baseR + Math.sin(p.angle * 3 + p.phase) * p.radialDrift);
        const px = cx + Math.cos(p.angle) * r + mdx * 0.3;
        const py = cy + Math.sin(p.angle) * r * cosT + mdy * 0.3;
        const distToCenter = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        const fadeCenter = Math.min(1, (distToCenter - scale * 0.04) / (scale * 0.06));
        const glowAlpha = p.alpha * fadeCenter * (0.6 + Math.sin(t * 0.02 + p.phase) * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${glowAlpha})`;
        ctx.fill();
        if (p.size > 0.8) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * 5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${glowAlpha * 0.06})`;
          ctx.fill();
        }
      });

      accretion.forEach((p) => {
        p.angle += p.speed;
        p.r -= p.decay;
        if (p.r < 0.03) { p.r = 0.07 + Math.random() * 0.38; p.angle = Math.random() * Math.PI * 2; }
        const r = scale * p.r;
        const px = cx + Math.cos(p.angle) * r + mdx * 0.2;
        const py = cy + Math.sin(p.angle) * r * 0.3 + mdy * 0.2;
        const distToCenter = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        const fadeCenter = Math.min(1, (distToCenter - scale * 0.03) / (scale * 0.04));
        const radialFade = Math.min(1, (p.r - 0.03) / 0.05);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        const brightness = 50 + (1 - p.r / 0.4) * 30;
        ctx.fillStyle = `hsla(${p.hue}, 80%, ${brightness}%, ${p.alpha * fadeCenter * radialFade})`;
        ctx.fill();
      });

      const ehSize = scale * 0.05;
      const ehGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ehSize * 2.2);
      ehGrad.addColorStop(0, 'rgba(0,0,0,1)');
      ehGrad.addColorStop(0.5, 'rgba(2,1,4,0.98)');
      ehGrad.addColorStop(0.8, 'rgba(4,2,8,0.7)');
      ehGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ehGrad;
      ctx.fillRect(cx - ehSize * 2.5, cy - ehSize * 2.5, ehSize * 5, ehSize * 5);

      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        const pr = ehSize * (1.18 + Math.sin(a * 3 + t * 0.03) * 0.04);
        const px = cx + Math.cos(a) * pr;
        const py = cy + Math.sin(a) * pr * 0.28;
        const hue = a > Math.PI ? 270 : 190;
        const bright = 0.5 + Math.sin(a * 2 + t * 0.04) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${bright * 0.6})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [canvasRef, mouseRef]);
  return null;
}

/* ─── Magnetic CTA button ───────────────────────────────────────── */
function MagneticButton({ onClick, children }) {
  const ref = useRef(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 18 });
  const sy = useSpring(y, { stiffness: 180, damping: 18 });

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
    if (dist < 100) {
      const force = (1 - dist / 100) * 0.45;
      x.set((e.clientX - cx) * force);
      y.set((e.clientY - cy) * force);
    }
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="group relative flex items-center gap-3"
    >
      <div className="w-11 h-11 rounded-full border border-primary/30 flex items-center justify-center group-hover:border-primary/70 transition-all duration-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full" style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
        <div className="relative w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform duration-500" />
      </div>
      <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-white/35 group-hover:text-white/65 transition-colors duration-500">
        {children}
      </span>
    </motion.button>
  );
}

/* ─── Scene ─────────────────────────────────────────────────────── */
export default function SingularityCore({ onEnter }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const mouseX = useMotionValue(0), mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 22, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 22, damping: 28 });
  const rotX = useTransform(springY, [0, 1], [-5, 5]);
  const rotY = useTransform(springX, [0, 1], [-5, 5]);

  // Depth parallax layers at different Z speeds
  const layer1X = useTransform(springX, [0, 1], ['-2%', '2%']);
  const layer1Y = useTransform(springY, [0, 1], ['-2%', '2%']);
  const layer2X = useTransform(springX, [0, 1], ['-4%', '4%']);
  const layer2Y = useTransform(springY, [0, 1], ['-4%', '4%']);

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  return (
    <section className="relative w-full h-screen overflow-hidden" style={{ background: '#040404' }}>
      {/* Layer 0 — canvas (deepest) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <BlackHoleEngine canvasRef={canvasRef} mouseRef={mouseRef} />

      {/* Layer 1 — energy flows (midground) */}
      <motion.div style={{ x: layer1X, y: layer1Y }} className="absolute inset-0">
        <EnergyFlowCanvas opacity={0.18} hue={265} pathCount={5} />
      </motion.div>

      {/* Layer 2 — ghost depth typography (parallax slower) */}
      <motion.div
        style={{ x: layer2X, y: layer2Y }}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute font-grotesk font-bold text-white/[0.012] leading-none select-none"
          style={{ fontSize: '28vw', bottom: '-4%', right: '-8%', letterSpacing: '-0.05em' }}
        >
          BLK
        </div>
      </motion.div>

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 25%, rgba(4,4,4,0.75) 100%)' }}
      />
      {/* Bottom-edge scene bleed — depth-of-field blur into next scene */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(4,4,4,0.95))', backdropFilter: 'blur(0px)' }}
      />

      {/* TOP-LEFT: brand mark — foreground layer */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 1.4, ease: [0.16,1,0.3,1] }}
        className="absolute top-8 left-8 z-30"
      >
        <span className="font-grotesk text-[11px] tracking-[0.55em] uppercase text-white/25 font-light">BLAKRA</span>
      </motion.div>

      {/* TOP-RIGHT: coordinates */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 1, ease: [0.16,1,0.3,1] }}
        className="absolute top-8 right-8 z-30 text-right"
      >
        <div className="font-mono text-[8px] tracking-[0.25em] text-white/10 leading-relaxed">
          <div>LAT 37.7749° N</div>
          <div>LON 122.4194° W</div>
          <div className="mt-1 text-primary/30">SINGULARITY.001</div>
        </div>
      </motion.div>

      {/* CENTER: off-axis headline with 3D tilt */}
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1400 }}
        className="absolute inset-0 flex flex-col justify-center z-20 px-8 md:px-[8vw]"
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1.6, ease: [0.16,1,0.3,1] }}
          className="mb-7 ml-1"
        >
          <span className="font-mono text-[9px] tracking-[0.55em] text-primary/45 uppercase">
            ◉ &nbsp;&nbsp;Engineering Intelligent Futures
          </span>
        </motion.div>

        {/* Headline — Character-based animated reveal */}
        <div className="relative">
          <div className="overflow-hidden">
            <AnimatedText
              as="h1"
              mode="character"
              className="font-grotesk font-bold leading-none tracking-[-0.04em] text-[clamp(52px,10vw,160px)] text-white"
              delay={1.1}
              staggerDelay={0.04}
              duration={0.8}
              variant="slideUp"
            >
              BLAKRA
            </AnimatedText>
          </div>
          {/* Ghost layer behind — depth illusion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 2 }}
            className="absolute top-1 left-1 font-grotesk font-bold leading-none tracking-[-0.04em] pointer-events-none select-none"
            style={{
              fontSize: 'clamp(52px,10vw,160px)',
              color: 'transparent',
              WebkitTextStroke: '1px rgba(139,92,246,0.06)',
              zIndex: -1,
            }}
          >
            BLAKRA
          </motion.div>
        </div>

        {/* Tagline with SplitText effect */}
        <SplitText
          as="p"
          direction="bottom"
          delay={1.6}
          duration={1.2}
          className="font-inter text-[clamp(13px,1.8vw,20px)] font-light italic text-white/25 tracking-wide max-w-xl mt-5 ml-1 md:ml-[4vw]"
        >
          Where gravity becomes intelligence and energy becomes code.
        </SplitText>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1, duration: 1.2, ease: [0.16,1,0.3,1] }}
          className="mt-14 flex items-center gap-8"
        >
          <MagneticButton onClick={onEnter}>Enter</MagneticButton>
          <div className="h-[1px] w-12 bg-white/[0.05]" />
          <span className="font-mono text-[8px] text-white/12 tracking-[0.22em] uppercase">AI · Robotics · Automation</span>
        </motion.div>
      </motion.div>

      {/* BOTTOM-RIGHT: scroll field indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 1 }}
        className="absolute bottom-8 right-8 z-20 flex items-center gap-3"
      >
        <div className="flex flex-col gap-[3px]">
          {[0.2, 0.5, 1, 0.5, 0.2].map((o, i) => (
            <div key={i} className="w-[1px] h-3 bg-white" style={{ opacity: o * 0.14 }} />
          ))}
        </div>
        <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-white/10">Scroll field</span>
      </motion.div>
    </section>
  );
}