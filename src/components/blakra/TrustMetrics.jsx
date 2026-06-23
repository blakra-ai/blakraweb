import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

const METRICS = [
  { value: 94,   suffix: '+',  label: 'Enterprise Clients',       sub: 'Across 18 industries',                hue: 265 },
  { value: 34,   suffix: '',   label: 'Countries Deployed',        sub: 'Global production footprint',         hue: 190 },
  { value: 99.97,suffix: '%',  label: 'System Uptime SLA',         sub: 'Contractually guaranteed',            hue: 285 },
  { value: 3.8,  suffix: 'B',  label: 'Daily API Calls Served',    sub: 'Peak throughput capacity',            hue: 220 },
  { value: 47,   suffix: '%',  label: 'Avg Efficiency Gain',       sub: 'Measured post-deployment',            hue: 265 },
  { value: 6,    suffix: 'x',  label: 'Faster Time-to-Market',     sub: 'vs. in-house development',            hue: 190 },
];

const CLIENTS = [
  'Fortune 50 Financial Institution',
  'Global Logistics Network',
  'Defense Contractor',
  'Tier-1 Healthcare Provider',
  'Multinational Retail Group',
  'Sovereign Wealth Fund',
];

/* Animated counter */
function Counter({ value, suffix, hue, isInView }) {
  const [display, setDisplay] = useState(0);
  const isDecimal = value % 1 !== 0;

  useEffect(() => {
    if (!isInView) return;
    const duration = 1800;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(isDecimal ? parseFloat((eased * value).toFixed(2)) : Math.round(eased * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value, isDecimal]);

  return (
    <span className="font-grotesk font-bold leading-none tracking-[-0.04em]"
      style={{
        fontSize: 'clamp(40px, 5.5vw, 80px)',
        color: `hsla(${hue},80%,68%,0.92)`,
        textShadow: `0 0 60px hsla(${hue},80%,65%,0.3)`,
      }}>
      {display}{suffix}
    </span>
  );
}

export default function TrustMetrics() {
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);

  return (
    <section
      id="trust"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#050408', minHeight: '80vh' }}
    >
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #060406, transparent)' }} />

      {/* Ghost type */}
      <motion.div style={{ y: bgY }}
        className="absolute right-[-3%] top-[10%] font-grotesk font-bold text-white/[0.012] leading-none select-none pointer-events-none"
        style={{ fontSize: '16vw', letterSpacing: '-0.05em', y: bgY }}>
        TRUST
      </motion.div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        {/* Label */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16">
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Impact at Scale</span>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-20">
          <motion.h2
            initial={{ y: '110%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(32px,6vw,96px)] font-bold tracking-[-0.04em] leading-none text-white"
          >
            Numbers that<br />
            <span className="italic font-light" style={{ color: 'rgba(255,255,255,0.12)' }}>Don't Lie.</span>
          </motion.h2>
        </div>

        {/* Metrics — asymmetric horizontal layout, NOT a grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-0 gap-y-0 mb-24">
          {METRICS.map((m, i) => (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.1, duration: 1, ease: [0.16,1,0.3,1] }}
              className="py-10 relative"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderRight: (i % 3 !== 2) ? '1px solid rgba(255,255,255,0.04)' : 'none',
                paddingLeft: (i % 3 === 0) ? '0' : 'max(24px,3vw)',
                paddingRight: 'max(16px,2vw)',
              }}
            >
              <Counter value={m.value} suffix={m.suffix} hue={m.hue} isInView={isInView} />
              <p className="font-grotesk text-sm md:text-base font-semibold mt-3 mb-1"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                {m.label}
              </p>
              <p className="font-mono text-[9px] tracking-[0.1em]"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                {m.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Client types — editorial list, NOT logos */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-0">
          <div className="md:w-[38%] md:pr-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 1 }}
            >
              <h3 className="font-grotesk text-lg font-semibold text-white mb-2">Who We Serve</h3>
              <p className="font-inter font-light text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.28)' }}>
                Enterprise organizations where the cost of getting technology wrong is measured in billions, not thousands.
              </p>
            </motion.div>
          </div>
          <div className="md:w-[62%]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {CLIENTS.map((c, i) => (
                <motion.div key={c}
                  initial={{ opacity: 0, x: 16 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.9 + i * 0.08, duration: 0.7 }}
                  className="py-4 flex items-center gap-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="w-1 h-1 rounded-full bg-primary/40 flex-shrink-0" />
                  <span className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{c}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}