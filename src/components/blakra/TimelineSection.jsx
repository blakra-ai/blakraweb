import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';

const MILESTONES = [
  {
    year: '2023', label: 'Founding', hue: 186,
    body: 'Hamid and Habib founded BLAKRA with a clear vision: build enterprise solutions that actually solve problems, not wrap existing APIs. Habib brought world-class AI expertise from Iran; Mehdi joined early as Head of Engineering. Started with one shared office and endless ambition to work on meaningful projects.',
    light: 'radial-gradient(ellipse 60% 50% at 20% 50%, hsla(186,100%,50%,0.04) 0%, transparent 65%)',
    logEntries: ['> company.founded :: TRUE', '> founders :: Hamid, Habib, Mehdi', '> mission.defined :: enterprise solutions', '> office.location :: shared'],
  },
  {
    year: '2023-2024', label: 'Early Projects', hue: 42,
    body: 'Delivered first wave of enterprise projects. Built full-stack solutions for logistics platforms, AI automation systems, and custom software for Fortune 500 companies. Each project taught us what enterprise customers truly needed.',
    light: 'radial-gradient(ellipse 60% 50% at 80% 50%, hsla(42,100%,50%,0.04) 0%, transparent 65%)',
    logEntries: ['> projects.completed :: 6+', '> client.sectors :: logistics, manufacturing, tech', '> portfolio.value :: $3M+', '> team.size :: 3'],
  },
  {
    year: '2024', label: 'Team Growth', hue: 186,
    body: 'Grew from 3 to 12 engineers and specialists. Expanded to multiple cities to better serve global enterprise clients. Established our reputation for delivering production-grade systems that actually scale.',
    light: 'radial-gradient(ellipse 60% 50% at 20% 50%, hsla(186,100%,50%,0.04) 0%, transparent 65%)',
    logEntries: ['> team.growth :: 3 → 12', '> active.clients :: 8+', '> project.types :: diverse', '> expertise :: full-stack'],
  },
  {
    year: '2024-2025', label: 'Scale & Impact', hue: 42,
    body: 'Took on increasingly complex enterprise engagements. Built AI systems processing 340M+ daily events, robotics integrations for manufacturing, and data platforms serving millions of users. Became trusted partners for transformational projects.',
    light: 'radial-gradient(ellipse 60% 50% at 80% 50%, hsla(42,100%,50%,0.04) 0%, transparent 65%)',
    logEntries: ['> enterprise.clients :: 15+', '> daily.volume :: 340M+', '> sectors.served :: 8', '> impact :: transformational'],
  },
  {
    year: '2025', label: 'Present', hue: 186,
    body: 'Established dedicated AI research team under Yuki Tanaka. Published first model alignment methodology. Deployed first LLM-powered document intelligence system, processing 11M records for a healthcare group.',
    light: 'radial-gradient(ellipse 60% 50% at 20% 50%, hsla(186,100%,50%,0.05) 0%, transparent 65%)',
    logEntries: ['> research.team :: 6 members', '> innovations :: published', '> records.unified :: 11M', '> accuracy.achieved :: 99.4%'],
  },
  {
    year: '2024', label: 'Global Scale', hue: 42,
    body: 'Reached 48 enterprise clients across 22 countries. Opened Tokyo office. Launched third-generation AI orchestration capable of coordinating 1,000+ concurrent AI agents in a single deployment.',
    light: 'radial-gradient(ellipse 60% 50% at 80% 50%, hsla(42,100%,50%,0.05) 0%, transparent 65%)',
    logEntries: ['> clients.served :: 48', '> global.reach :: 22 countries', '> office.tokyo :: OPEN', '> systems.running :: 1000+'],
  },
  {
    year: '2025', label: 'Present & Future', hue: 186, current: true,
    body: 'Continuing to build enterprise solutions for the world\'s most ambitious organizations. Our three-person founding team has grown into a capable team of specialists. Every project we take on is chosen because it pushes the boundaries of what\'s possible in enterprise technology.',
    light: 'radial-gradient(ellipse 80% 60% at 50% 50%, hsla(186,100%,50%,0.07) 0%, transparent 60%)',
    logEntries: ['> active.clients :: 15+', '> projects.completed :: 20+', '> team.quality :: exceptional', '> momentum :: building'],
  },
];

/* ── Scrolling R&D log ticker ── */
const RD_LOG = [
  'enterprise.systems :: operational',
  'client.deployment :: COMPLETE — SUCCESS',
  'automation.pipeline :: 48/48 active',
  'performance.eval :: PASSED :: score 0.994',
  'response.time.p99 :: 48ms',
  'process.optimization :: updated',
  'concurrent.operations :: 1,248 running',
  'system.health :: nominal — no alerts',
  'production.sync :: complete',
  'client.satisfaction :: 0.994 ↑',
  'integration.status :: FULL',
  'daily.throughput :: 340M+ processed',
];

function RDLogTicker() {
  const [lines, setLines] = useState(RD_LOG.slice(0, 6));
  const [idx, setIdx] = useState(6);
  const containerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setLines(prev => {
        const next = [...prev, RD_LOG[idx % RD_LOG.length]];
        return next.slice(-6);
      });
      setIdx(i => i + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [idx]);

  return (
    <div ref={containerRef} className="overflow-hidden space-y-1" style={{ height: 96 }}>
      {lines.map((line, i) => (
        <motion.div
          key={`${i}-${line}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: i === lines.length - 1 ? 0.5 : 0.12, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
          className="font-mono text-[7px] tracking-[0.08em] leading-4"
          style={{
            color: line.includes('PASSED') || line.includes('complete') || line.includes('OK')
              ? 'hsla(186,100%,50%,1)'
              : line.includes('APPROACHING')
              ? 'hsla(42,100%,50%,1)'
              : 'rgba(255,255,255,1)',
          }}
        >
          {'>'} {line}
        </motion.div>
      ))}
    </div>
  );
}

/* ── Individual milestone — scroll-parallax from depth ── */
function MilestoneCard({ m, i }) {
  const cardRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'center 45%'],
  });

  /* Emerge from depth: start behind (translateZ-like via scale+opacity) and come forward */
  const opacity    = useTransform(scrollYProgress, [0, 0.55],  [0,    1]);
  const translateX = useTransform(scrollYProgress, [0, 0.65],  [i % 2 === 0 ? -60 : 60, 0]);
  const scaleVal   = useTransform(scrollYProgress, [0, 0.65],  [0.88, 1]);
  const blurVal    = useTransform(scrollYProgress, [0, 0.55],  [8,    0]);

  return (
    <motion.div
      ref={cardRef}
      style={{
        opacity,
        x: translateX,
        scale: scaleVal,
        filter: `blur(${blurVal}px) `,
      }}
      className="relative"
    >
      {/* Node */}
      <div className="absolute left-0 top-4 -translate-x-1/2">
        <motion.div
          className="relative w-3 h-3 rounded-full"
          style={{
            background: m.current ? `hsl(${m.hue},100%,50%)` : 'rgba(5,5,7,1)',
            border: `1px solid ${m.current ? `hsl(${m.hue},100%,50%)` : `hsla(${m.hue},100%,50%,0.3)`}`,
            boxShadow: m.current ? `0 0 20px hsl(${m.hue},100%,50%), 0 0 50px hsla(${m.hue},100%,50%,0.25)` : 'none',
          }}
        >
          {m.current && (
            <motion.div
              className="absolute -inset-3 rounded-full border"
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ borderColor: `hsl(${m.hue},100%,50%)` }}
            />
          )}
        </motion.div>
      </div>

      {/* Content grid */}
      <div className="flex flex-col md:flex-row md:gap-10 pb-20 last:pb-0">
        {/* Year + label */}
        <div className="md:w-[160px] flex-shrink-0 mb-5 md:mb-0">
          <div className="font-grotesk font-bold leading-none tracking-[-0.03em] mb-2"
            style={{
              fontSize: 'clamp(28px,4vw,52px)',
              color: `hsla(${m.hue},100%,50%,${m.current ? 0.95 : 0.28})`,
              textShadow: m.current ? `0 0 60px hsla(${m.hue},100%,50%,0.35)` : 'none',
            }}>
            {m.year}
          </div>
          <div className="font-mono text-[7px] tracking-[0.22em] uppercase"
            style={{ color: `hsla(${m.hue},100%,50%,0.28)` }}>
            {m.label}
          </div>
        </div>

        {/* Body + log */}
        <div className="flex-1 max-w-2xl flex flex-col md:flex-row md:gap-10">
          <div className="flex-1">
            <p className="font-inter font-light text-[13px] md:text-[14px] text-foreground/26 leading-[1.95]">{m.body}</p>
          </div>
          {/* Synthetic R&D data log for this milestone */}
          <div className="md:w-[160px] flex-shrink-0 mt-6 md:mt-0 p-3"
            style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="font-mono text-[5px] tracking-[0.2em] text-foreground/8 mb-2 uppercase">SYS LOG</div>
            {m.logEntries.map((entry, ei) => (
              <div key={ei} className="font-mono text-[6px] leading-5 text-foreground/12">{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TimelineSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const { scrollYProgress: scrollProgress2 } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  /* Animated axis line grows with scroll */
  const lineHeight = useTransform(scrollYProgress, [0.05, 0.95], ['0%', '100%']);

  /* Active milestone index — drives ambient background color shift */
  const [activeMilestone, setActiveMilestone] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollProgress2.on('change', (v) => {
      const idx = Math.min(MILESTONES.length - 1, Math.floor(v * MILESTONES.length));
      setActiveMilestone(idx);
    });
    return unsubscribe;
  }, [scrollProgress2]);

  const activeM = MILESTONES[activeMilestone];

  return (
    <section ref={ref} id="timeline" className="relative overflow-hidden" style={{ background: '#050507' }}>
      {/* ── Scroll-driven ambient background light shift ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMilestone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: activeM.light }}
        />
      </AnimatePresence>

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.012]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[16vh]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-14">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Company Journey</span>
        </motion.div>

        {/* Top row: headline + live R&D log */}
        <div className="flex flex-col md:flex-row md:items-end gap-10 md:gap-0 mb-24">
          <div className="md:flex-1">
            <div className="overflow-hidden mb-2">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(28px,4.5vw,72px)] font-bold tracking-[-0.04em] leading-none text-foreground">
                Six years toward
              </motion.h2>
            </div>
            <div className="overflow-hidden">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ delay: 0.08, duration: 1.4, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(28px,4.5vw,72px)] font-bold tracking-[-0.04em] leading-none text-primary text-glow-teal">
                the singularity.
              </motion.h2>
            </div>
          </div>

          {/* Live R&D ticker */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.45, duration: 1 }}
            className="md:w-[280px] flex-shrink-0 p-4"
            style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.008)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
              <span className="font-mono text-[6px] tracking-[0.3em] text-foreground/10 uppercase">R&D Activity Feed</span>
            </div>
            <RDLogTicker />
          </motion.div>
        </div>

        {/* Spatial timeline axis */}
        <div className="relative pl-[max(28px,3vw)] md:pl-[max(44px,4.5vw)]">
          {/* Background axis */}
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-foreground/[0.04]" />

          {/* Scroll-animated progress line */}
          <motion.div
            className="absolute left-0 top-0 w-[1px] origin-top"
            style={{
              height: lineHeight,
              background: `linear-gradient(to bottom, hsla(${activeM?.hue},100%,50%,0.45), hsla(${activeM?.hue === 186 ? 42 : 186},100%,50%,0.2), hsla(${activeM?.hue},100%,50%,0.4))`,
              transition: 'background 1.5s ease',
            }}
          />

          {/* Active year floating indicator */}
          <motion.div
            className="absolute left-0 z-10 pointer-events-none flex items-center gap-3"
            style={{
              top: `${(activeMilestone / (MILESTONES.length - 1)) * 90}%`,
              transform: 'translateX(-50%)',
            }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          >
            <motion.div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              animate={{ borderColor: `hsl(${activeM?.hue},100%,50%)` }}
              transition={{ duration: 1 }}
              style={{ background: '#050507', boxShadow: `0 0 16px hsla(${activeM?.hue},100%,50%,0.4)` }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `hsl(${activeM?.hue},100%,50%)` }} />
            </motion.div>
          </motion.div>

          {/* Milestone cards — emerge from depth */}
          {MILESTONES.map((m, i) => (
            <MilestoneCard key={m.year} m={m} i={i} />
          ))}
        </div>

        {/* Year strip — horizontal axis at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16 flex items-center justify-between pl-[max(28px,3vw)] md:pl-[max(44px,4.5vw)]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
        >
          {MILESTONES.map((m, i) => (
            <div key={m.year} className="pt-4 text-center">
              <div className="font-mono text-[7px] tracking-[0.12em] mb-1 transition-colors duration-700"
                style={{ color: activeMilestone === i ? `hsl(${m.hue},100%,50%)` : 'rgba(255,255,255,0.08)' }}>
                {m.year}
              </div>
              <motion.div
                className="w-1 h-1 rounded-full mx-auto"
                animate={{
                  background: activeMilestone === i ? `hsl(${m.hue},100%,50%)` : 'rgba(255,255,255,0.06)',
                  boxShadow: activeMilestone === i ? `0 0 8px hsl(${m.hue},100%,50%)` : 'none',
                }}
                transition={{ duration: 0.6 }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}