import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { val: 48, suffix: '+', label: 'Enterprise clients', sub: 'Across Fortune 1000 and growth-stage organizations', hue: 186 },
  { val: 22, suffix: '', label: 'Countries served', sub: 'Active deployments across North America, Europe, and APAC', hue: 42 },
  { val: 99.97, suffix: '%', label: 'System uptime', sub: 'Production SLA across all deployed platforms', hue: 186 },
  { val: 73, suffix: '%', label: 'Avg. efficiency gain', sub: 'Measured across automation and AI deployments', hue: 42 },
  { val: 340, suffix: 'M+', label: 'Events processed daily', sub: 'At peak load across all client environments', hue: 186 },
  { val: 4.1, suffix: '$B+', label: 'Business value delivered', sub: 'Quantified client impact since founding', hue: 42 },
];

const TESTIMONIALS = [
  { quote: 'BLAKRA didn\'t just deliver a system — they redefined how we think about operational intelligence.', source: 'CTO, Fortune 500 Financial Services' },
  { quote: 'The precision and depth of their engineering is unlike anything we\'ve experienced from a technology partner.', source: 'VP Engineering, European Logistics' },
];

function CountUp({ target, suffix, inView }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const isDecimal = target % 1 !== 0;
    const duration = 2200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      // Weighted easing — intentional cubic
      const ease = 1 - Math.pow(1 - progress, 4);
      const val = target * ease;
      setDisplay(isDecimal ? parseFloat(val.toFixed(1)) : Math.round(val));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return <>{display}{suffix}</>;
}

export default function TrustSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="trust" className="relative overflow-hidden" style={{ background: '#050508', minHeight: '60vh' }}>
      {/* Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsla(42,100%,50%,0.012), transparent 60%)' }} />

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[14vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-16">
          <div className="w-6 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">Impact Record</span>
        </motion.div>

        <div className="overflow-hidden mb-16">
          <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(28px,4.5vw,68px)] font-bold tracking-[-0.04em] leading-none text-foreground/50 italic font-light">
            Numbers that do the talking.
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-0 mb-20">
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 1 }}
              className="group py-10 pr-8 relative overflow-hidden"
              style={{
                borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderRight: (i + 1) % 3 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              {/* Status indicator */}
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: `hsla(${s.hue},100%,50%,0.5)` }} />
                <span className="font-mono text-[5px] tracking-[0.2em] uppercase" style={{ color: `hsla(${s.hue},100%,50%,0.25)` }}>VERIFIED</span>
              </div>

              <div className="font-grotesk font-bold leading-none mb-3 text-foreground"
                style={{ fontSize: 'clamp(30px,4.5vw,58px)', letterSpacing: '-0.04em' }}>
                <CountUp target={s.val} suffix={s.suffix} inView={isInView} />
              </div>
              <div className="font-grotesk text-sm font-medium text-foreground/35 mb-2">{s.label}</div>
              <div className="font-inter font-light text-[11px] text-foreground/15 leading-relaxed max-w-[180px]">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials — cinematic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8 + i * 0.15, duration: 1 }}
              className="relative pl-6"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="font-inter font-light text-[15px] text-foreground/22 leading-[1.9] italic mb-4">
                "{t.quote}"
              </p>
              <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-foreground/12">{t.source}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}