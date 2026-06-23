import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SingularityCanvas from './SingularityCanvas';

/* ── Live HUD metrics that tick in real-time ─────────────────── */
const INITIAL_HUD = [
  { label: 'STATUS',      value: 'OPERATIONAL',  raw: null,  hue: 186, unit: '' },
  { label: 'RESPONSE',    value: '48ms',        raw: 48,    hue: 186, unit: 'ms', min: 30, max: 120 },
  { label: 'AVAILABILITY', value: '99.97%',     raw: 99.97, hue: 42,  unit: '%',  min: 95, max: 100 },
  { label: 'EFFICIENCY',  value: '76.2%',       raw: 76.2,  hue: 186, unit: '%',  min: 65, max: 90 },
  { label: 'RELIABILITY', value: '100%',        raw: null,  hue: 42,  unit: '' },
];

const DATA_STREAMS = [
  'enterprise.deployment :: OK',
  'client.integration :: 48 active',
  'automation.efficiency ▲',
  'system.performance :: 0.994',
  'process.optimization :: stable',
  'production.pipeline :: LIVE',
  'service.availability :: 99.97%',
  'compliance.status :: verified',
  'response.latency :: nominal',
  'client.satisfaction :: high',
];

function LiveHUD({ mounted }) {
  const [metrics, setMetrics] = useState(INITIAL_HUD);
  const [streamLines, setStreamLines] = useState([DATA_STREAMS[0], DATA_STREAMS[1]]);
  const [streamIdx, setStreamIdx] = useState(2);
  const [tick, setTick] = useState(0);

  /* Jitter numeric metrics */
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setMetrics(prev => prev.map(m => {
        if (m.raw === null) return m;
        const jitter = (Math.random() - 0.5) * (m.max - m.min) * 0.08;
        const next = Math.max(m.min, Math.min(m.max, m.raw + jitter));
        const formatted = m.unit === 'ms'    ? `${next.toFixed(1)}ms`
                        : m.unit === '%'     ? `${next.toFixed(1)}%`
                        : m.unit === 'K/s'  ? `${Math.round(next)}K/s`
                        : m.value;
        return { ...m, raw: next, value: formatted };
      }));
      setTick(t => t + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [mounted]);

  /* Rolling data stream */
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setStreamLines(prev => {
        const next = [...prev, DATA_STREAMS[streamIdx % DATA_STREAMS.length]];
        return next.slice(-5);
      });
      setStreamIdx(i => i + 1);
    }, 2200);
    return () => clearInterval(id);
  }, [mounted, streamIdx]);

  return (
    <>
      {/* ── Top-right: live metric panel ── */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.4, duration: 1.6, ease: [0.16,1,0.3,1] }}
        className="absolute top-[88px] right-6 md:right-10 z-30 text-right hidden md:block"
      >
        {/* Corner bracket decoration */}
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[1px] bg-primary/20" />
          <div className="absolute top-0 right-0 w-[1px] h-full bg-primary/20" />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-primary/12" />
          <div className="absolute bottom-0 left-0 w-[1px] h-full bg-primary/12" />
        </div>

        <div className="px-4 py-4 space-y-3" style={{ background: 'rgba(5,5,7,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="font-mono text-[6px] tracking-[0.4em] text-foreground/10 uppercase mb-4 text-left flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
            BLAKRA::SYSTEM_MONITOR
          </div>
          {metrics.map((m, i) => (
            <div key={m.label} className="flex items-center justify-between gap-8">
              <span className="font-mono text-[6px] tracking-[0.18em] text-foreground/12 uppercase">{m.label}</span>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-1 h-1 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  style={{ background: `hsl(${m.hue},100%,50%)` }}
                />
                <motion.span
                  key={m.value}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-[8px] tracking-[0.1em]"
                  style={{ color: `hsla(${m.hue},100%,55%,0.65)` }}
                >
                  {m.value}
                </motion.span>
              </div>
            </div>
          ))}
          {/* Mini bar indicator */}
          <div className="mt-3 pt-3 border-t border-foreground/[0.03]">
            <div className="flex gap-[2px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: 3 }}
                  animate={{
                    background: i < Math.round((metrics[2]?.raw ?? 23) / 5)
                      ? `hsla(42,100%,50%,0.6)`
                      : 'rgba(255,255,255,0.04)',
                  }}
                  transition={{ duration: 0.4 }}
                />
              ))}
            </div>
            <div className="font-mono text-[5px] tracking-[0.2em] text-foreground/6 mt-1 text-right">NEURAL LOAD</div>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom-left: data stream feed ── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.0, duration: 1.4, ease: [0.16,1,0.3,1] }}
        className="absolute bottom-16 left-6 md:left-10 z-30 hidden md:block"
        style={{ maxWidth: 280 }}
      >
        <div className="px-4 py-3" style={{ background: 'rgba(5,5,7,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.025)' }}>
          <div className="font-mono text-[6px] tracking-[0.3em] text-foreground/8 uppercase mb-2 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
            DATA STREAM
          </div>
          <div className="space-y-1 overflow-hidden" style={{ height: 68 }}>
            {streamLines.map((line, i) => (
              <motion.div
                key={`${i}-${line}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: i === streamLines.length - 1 ? 0.45 : 0.12, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
                className="font-mono text-[7px] tracking-[0.06em]"
                style={{ color: line.includes('OK') || line.includes('verified') || line.includes('LIVE') ? 'hsla(186,100%,50%,1)' : 'rgba(255,255,255,1)' }}
              >
                {'>'} {line}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Top-left: coordinate / session ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1.2 }}
        className="absolute top-[88px] left-6 md:left-10 z-30 hidden lg:block"
      >
        <div className="font-mono text-[6px] tracking-[0.28em] text-foreground/8 leading-6 space-y-0.5">
          <div>LAT 37.7749° N  ·  LON 122.4194° W</div>
          <div className="text-primary/15">SESSION :: SINGULARITY.{String(tick).padStart(4,'0')}</div>
          <div className="text-foreground/5">{new Date().toISOString().slice(0,19).replace('T',' ')} UTC</div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Gravitational lensing text shader ───────────────────────── */
function LensingTitle({ mousePos, titleY, isReady }) {
  return (
    <motion.div style={{ y: titleY }} className="relative select-none">
      {/* Depth layer 3 — far background, maximum blur, slowest parallax */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ delay: 1.9, duration: 2.5 }}
        aria-hidden
        className="absolute top-0 left-0 font-grotesk font-bold leading-[0.88] tracking-[-0.04em] pointer-events-none"
        style={{
          fontSize: 'clamp(56px,11vw,180px)',
          color: 'transparent',
          WebkitTextStroke: '1px hsla(186,100%,50%,0.02)',
          filter: 'blur(2px)',
          transform: `translate(${mousePos.x * -16}px, ${mousePos.y * -7}px)`,
          transition: 'transform 1.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        BLAKRA
      </motion.div>

      {/* Depth layer 2 — mid ghost, lensing distortion */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ delay: 1.6, duration: 2 }}
        aria-hidden
        className="absolute top-0 left-0 font-grotesk font-bold leading-[0.88] tracking-[-0.04em] pointer-events-none"
        style={{
          fontSize: 'clamp(56px,11vw,180px)',
          color: 'transparent',
          WebkitTextStroke: '1px hsla(186,100%,50%,0.04)',
          transform: `translate(${mousePos.x * -9}px, ${mousePos.y * -4}px) scaleX(${1 + mousePos.x * 0.012}) scaleY(${1 + mousePos.y * 0.006})`,
          transition: 'transform 0.85s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        BLAKRA
      </motion.div>

      {/* Primary title — real layer */}
      <div className="overflow-hidden">
        <motion.h1
          initial={{ y: '120%', rotateX: 18 }}
          animate={{ y: 0, rotateX: 0 }}
          transition={{ delay: 0.8, duration: 1.9, ease: [0.16,1,0.3,1] }}
          className="font-grotesk font-bold leading-[0.88] tracking-[-0.04em] text-foreground"
          style={{
            fontSize: 'clamp(56px,11vw,180px)',
            transform: `translate(${mousePos.x * 4}px, ${mousePos.y * 2}px)`,
            transition: 'transform 0.9s cubic-bezier(0.16,1,0.3,1)',
            /* Subtle chromatic aberration on the text edges via text-shadow */
            textShadow: `
              ${mousePos.x * 2}px 0 0 hsla(186,100%,60%,${Math.abs(mousePos.x) * 0.18}),
              ${-mousePos.x * 2}px 0 0 hsla(42,100%,60%,${Math.abs(mousePos.x) * 0.10})
            `,
          }}
        >
          BLAKRA
        </motion.h1>
      </div>

      {/* Depth layer 1 — front glow, fastest parallax */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ delay: 2.2, duration: 2 }}
        aria-hidden
        className="absolute top-0 left-0 font-grotesk font-bold leading-[0.88] tracking-[-0.04em] pointer-events-none"
        style={{
          fontSize: 'clamp(56px,11vw,180px)',
          color: 'transparent',
          WebkitTextStroke: '1px hsla(186,100%,50%,0.015)',
          transform: `translate(${mousePos.x * 14}px, ${mousePos.y * 7}px)`,
          transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        BLAKRA
      </motion.div>
    </motion.div>
  );
}

export default function HeroSection() {
  const sectionRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });

  /* Scroll-driven camera push-in: canvas scales, content lifts */
  const bgScale        = useTransform(scrollYProgress, [0, 0.65], [1, 1.22]);
  const bgBrightness   = useTransform(scrollYProgress, [0, 0.5],  [1, 0.35]);
  const titleY         = useTransform(scrollYProgress, [0, 1],    [0, -140]);
  const subtitleY      = useTransform(scrollYProgress, [0, 1],    [0, -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.38], [1, 0]);
  const hudOpacity     = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let lx = 0, ly = 0;
    const handleMouse = (e) => {
      lx = (e.clientX / window.innerWidth - 0.5) * 2;
      ly = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x: lx, y: ly });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden" style={{ perspective: '1200px' }}>

      {/* ── Camera push-in: canvas scales on scroll ── */}
      <motion.div
        style={{ scale: bgScale, filter: `brightness(${bgBrightness})` }}
        className="absolute inset-0 origin-center"
      >
        <SingularityCanvas />
      </motion.div>

      {/* Environmental ambient light follows cursor */}
      <div className="ambient-light pointer-events-none" style={{
        left: `${50 + mousePos.x * 12}%`,
        top:  `${50 + mousePos.y * 12}%`,
      }} />

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'radial-gradient(ellipse 58% 58% at 50% 50%, transparent 12%, rgba(5,5,7,0.88) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, transparent, #050507)' }} />

      {/* ── Live Digital HUD overlay ── */}
      <motion.div style={{ opacity: hudOpacity }} className="absolute inset-0 z-30 pointer-events-none">
        <LiveHUD mounted={isReady} />
      </motion.div>

      {/* ── Main content ── */}
      <motion.div style={{ opacity: contentOpacity }} className="relative z-20 h-full flex flex-col justify-center px-8 md:px-[8vw]">

        {/* System tag */}
        <motion.div
          initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.55, duration: 1.5, ease: [0.16,1,0.3,1] }}
          className="mb-10"
        >
          <span className="font-mono text-[9px] md:text-[10px] tracking-[0.6em] uppercase text-primary/55">
            ◉ &nbsp;&nbsp;Engineering Intelligent Futures
          </span>
        </motion.div>

        {/* Gravitational lensing title */}
        <LensingTitle mousePos={mousePos} titleY={titleY} isReady={isReady} />

        <motion.div style={{ y: subtitleY }}>
          <motion.p
            initial={{ opacity: 0, x: 48, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ delay: 1.3, duration: 1.5, ease: [0.16,1,0.3,1] }}
            className="mt-8 font-inter text-[clamp(14px,1.8vw,20px)] font-light italic text-foreground/18 tracking-wide max-w-lg"
          >
            Where gravity becomes intelligence<br className="hidden md:block" /> and energy becomes code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.85, duration: 1.2, ease: [0.16,1,0.3,1] }}
            className="mt-14 flex items-center gap-8"
          >
            <button
              onClick={() => scrollTo('philosophy')}
              className="group relative flex items-center gap-4 magnetic-target"
            >
              <div className="w-14 h-14 rounded-full border border-primary/22 flex items-center justify-center group-hover:border-primary/55 transition-all duration-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full" style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
                <div className="relative w-2.5 h-2.5 rounded-full bg-primary group-hover:scale-[1.8] transition-transform duration-500" />
              </div>
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-foreground/25 group-hover:text-foreground/50 transition-colors duration-500">
                Yield to Gravity
              </span>
            </button>
            <div className="h-[1px] w-16 bg-foreground/[0.04]" />
            <span className="font-mono text-[7px] text-foreground/6 tracking-[0.25em] uppercase hidden md:inline">
              AI · Robotics · Automation
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.9, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none"
      >
        <span className="font-mono text-[7px] tracking-[0.4em] uppercase text-foreground/10">Scroll</span>
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: [0.45,0,0.55,1] }}
          className="w-[1px] h-12 bg-gradient-to-b from-primary/30 to-transparent"
        />
      </motion.div>
    </section>
  );
}