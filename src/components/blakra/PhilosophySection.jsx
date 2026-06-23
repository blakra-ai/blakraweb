import { useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

const TENETS = [
  { num: '01', title: 'Results First', body: 'We measure success by quantifiable business impact — efficiency gains, cost reductions, and revenue growth. Every system we build delivers measurable value to our clients.', hue: 186, ghost: 'BUSINESS IMPACT' },
  { num: '02', title: 'Deep Integration', body: 'We don\'t build isolated solutions. We deeply integrate with your existing systems, data, and workflows to amplify what you\'re already doing well.', hue: 42, ghost: 'SEAMLESS ARCHITECTURE' },
  { num: '03', title: 'Continuous Evolution', body: 'Technology changes rapidly. We ensure your systems adapt, scale, and improve over time without requiring complete rebuilds or technical debt accumulation.', hue: 186, ghost: 'SUSTAINABLE GROWTH' },
];

function TenetRow({ t, i, isInView }) {
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef(null);

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: 0.3 + i * 0.2, duration: 1.3, ease: [0.16,1,0.3,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative py-16 md:py-20 border-b border-foreground/[0.04] overflow-hidden cursor-default"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse 80% 120% at 20% 50%, hsla(${t.hue},100%,50%,0.04) 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
        }} />

      {/* Ghost text — depth layer */}
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2 font-grotesk font-bold tracking-[-0.03em] pointer-events-none select-none hidden md:block"
        animate={{ opacity: hovered ? 0.04 : 0, x: hovered ? 0 : 40 }}
        transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
        style={{ fontSize: 'clamp(60px,8vw,120px)', color: `hsl(${t.hue},100%,50%)` }}
      >
        {t.ghost}
      </motion.div>

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-16">
        <div className="flex items-start gap-6 md:gap-10">
          <span className="font-mono text-[9px] tracking-[0.3em] text-foreground/10 mt-3 flex-shrink-0 w-6">{t.num}</span>

          <div className="flex-1 max-w-2xl">
            <motion.h3
              className="font-grotesk text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-none"
              animate={hovered ? { letterSpacing: '-0.01em' } : { letterSpacing: '-0.04em' }}
              transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
              style={{
                color: `hsl(${t.hue},100%,50%)`,
                textShadow: hovered ? `0 0 80px hsla(${t.hue},100%,50%,0.35)` : 'none',
                transition: 'text-shadow 0.8s',
              }}
            >
              {t.title}
            </motion.h3>
            <p className="font-inter font-light text-sm md:text-[15px] text-foreground/25 leading-[2] max-w-lg">{t.body}</p>
          </div>
        </div>

        {/* Active indicator */}
        <motion.div
          className="hidden md:flex items-center gap-2 self-center ml-auto"
          animate={{ opacity: hovered ? 0.5 : 0.1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${t.hue},100%,50%)` }} />
          <span className="font-mono text-[6px] tracking-[0.2em] uppercase text-foreground/15">ACTIVE</span>
        </motion.div>
      </div>

      {/* Animated bottom line */}
      <motion.div className="absolute bottom-0 left-0 h-[1px]"
        animate={{ width: hovered ? '100%' : '0%' }}
        transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
        style={{ background: `linear-gradient(to right, hsla(${t.hue},100%,50%,0.5), transparent)` }} />
    </motion.div>
  );
}

export default function PhilosophySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [80, -40]);

  return (
    <section ref={ref} id="philosophy" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #050507, transparent)' }} />

      {/* Ambient environment */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none animate-drift"
        style={{ background: 'radial-gradient(circle, hsla(186,100%,50%,0.02), transparent 70%)' }} />

      <div className="relative z-10 px-[max(32px,8vw)] pt-[14vh] pb-[18vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="pl-8 mb-24">
          <div className="flex items-center gap-4">
            <div className="w-6 h-[1px] bg-primary/40" />
            <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Consciousness Field</span>
          </div>
        </motion.div>

        <motion.div style={{ y: headlineY }} className="pl-8 max-w-[1100px] mb-8">
          {[
            { text: 'Born from the', cls: 'text-foreground' },
            { text: <><span>collision of </span><span className="text-primary text-glow-teal">Black Hole</span></>, cls: '' },
            { text: <><span className="text-foreground/12 italic font-light">gravity and</span>{' '}<span className="text-accent text-glow-amber">Chakra</span>{' '}<span className="text-foreground/12 italic font-light">energy.</span></>, cls: '' },
            { text: 'BLAKRA is not a company.', cls: 'text-foreground' },
          ].map((line, i) => (
            <div key={i} className="overflow-hidden mb-2">
              <motion.p
                initial={{ y: '110%', filter: 'blur(3px)' }}
                animate={isInView ? { y: 0, filter: 'blur(0px)' } : {}}
                transition={{ delay: i * 0.12, duration: 1.5, ease: [0.16,1,0.3,1] }}
                className={`font-grotesk text-[clamp(28px,5vw,76px)] font-bold leading-[1.08] tracking-[-0.03em] ${line.cls}`}
              >
                {line.text}
              </motion.p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 1 }}
          className="pl-8 font-inter font-light text-[13px] text-foreground/15 max-w-md leading-[1.9] mb-24"
        >
          It is a gravitational system — an architecture of intelligence that pulls complexity into order, ambiguity into clarity, and potential into execution.
        </motion.p>

        <div className="pl-8">
          {TENETS.map((t, i) => <TenetRow key={t.num} t={t} i={i} isInView={isInView} />)}
        </div>
      </div>
    </section>
  );
}