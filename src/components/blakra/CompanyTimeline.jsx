import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

const MILESTONES = [
  {
    year: '2019',
    code: 'T.01',
    title: 'Founded',
    body: 'Three engineers, one mission: build AI systems that work in the real world — not just in demos. First office: a server room in San Francisco.',
    tag: 'Origin',
    hue: 265,
  },
  {
    year: '2020',
    code: 'T.02',
    title: 'First Enterprise Deployment',
    body: 'Deployed an AI-powered document processing system for a top-10 US bank. 12 million documents processed in the first month. Zero critical errors.',
    tag: 'Milestone',
    hue: 190,
  },
  {
    year: '2021',
    code: 'T.03',
    title: 'Robotics Division Launch',
    body: 'Expanded into physical intelligence with the formation of our robotics engineering team. First autonomous logistics pilot with 98.4% task completion rate.',
    tag: 'Expansion',
    hue: 285,
  },
  {
    year: '2022',
    code: 'T.04',
    title: 'Series A & Global Reach',
    body: 'Closed $28M Series A. Opened London and Tokyo engineering hubs. Reached 30 enterprise clients across 14 countries.',
    tag: 'Scale',
    hue: 220,
  },
  {
    year: '2023',
    code: 'T.05',
    title: 'BLAKRA Research Lab',
    body: 'Established dedicated R&D function. Published 3 papers on efficient reasoning for production LLMs. Launched internal model evaluation framework used by 8 Fortune 500 partners.',
    tag: 'Research',
    hue: 265,
  },
  {
    year: '2024',
    code: 'T.06',
    title: 'Agentic AI Platform',
    body: 'Released BLAKRA Cortex — our proprietary multi-agent orchestration platform. Deployed in defense, healthcare, and financial services. Now processing 3.8B API calls daily.',
    tag: 'Platform',
    hue: 190,
  },
  {
    year: '2025',
    code: 'T.07',
    title: 'Next Frontier',
    body: 'Building toward human-machine co-intelligence. Active research in sub-millisecond neuro-interface systems, quantum-classical hybrid compute, and autonomous enterprise agents.',
    tag: 'Horizon',
    hue: 285,
  },
];

export default function CompanyTimeline() {
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-60px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const lineScale = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);
  const bgY       = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);

  return (
    <section
      id="timeline"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#040406', minHeight: '100vh' }}
    >
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #050408, transparent)' }} />

      {/* Ghost type */}
      <motion.div style={{ y: bgY }}
        className="absolute left-[-3%] top-[8%] font-grotesk font-bold text-white/[0.012] leading-none select-none pointer-events-none"
        style={{ fontSize: '18vw', letterSpacing: '-0.05em', y: bgY }}>
        TIME
      </motion.div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[14vh]">
        {/* Label */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16">
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Company Journey</span>
        </motion.div>

        <div className="overflow-hidden mb-24">
          <motion.h2
            initial={{ y: '110%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(34px,6.5vw,100px)] font-bold tracking-[-0.04em] leading-none text-white"
          >
            Six Years.<br />
            <span className="italic font-light" style={{ color: 'rgba(255,255,255,0.1)' }}>One Direction.</span>
          </motion.h2>
        </div>

        {/* Timeline — vertical line + offset entries */}
        <div className="relative">
          {/* Animated vertical line */}
          <motion.div
            style={{ scaleY: lineScale, transformOrigin: 'top' }}
            className="absolute left-[max(20px,4vw)] top-0 bottom-0 w-[1px]"
            style={{ background: 'rgba(255,255,255,0.06)', scaleY: lineScale, transformOrigin: 'top' }}
          />

          <div className="space-y-0">
            {MILESTONES.map((m, i) => (
              <motion.div
                key={m.code}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.12, duration: 1, ease: [0.16,1,0.3,1] }}
                className="group relative flex gap-[max(32px,6vw)] py-10"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', marginLeft: 'max(20px,4vw)' }}
              >
                {/* Timeline node */}
                <div className="absolute right-full top-10 flex items-center gap-3"
                  style={{ transform: 'translateX(50%)' }}>
                  <div className="w-2 h-2 rounded-full border border-white/20 bg-transparent transition-all duration-500 group-hover:border-primary/50 group-hover:bg-primary/20" />
                </div>

                {/* Year */}
                <div className="w-14 flex-shrink-0 pt-1">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/25">{m.year}</span>
                </div>

                {/* Content — offset per entry for spatial variance */}
                <div className="flex-1" style={{ paddingLeft: `${i % 3 * 3}%` }}>
                  <div className="flex items-baseline gap-4 mb-3">
                    <span className="font-mono text-[8px] tracking-[0.3em] uppercase"
                      style={{ color: `hsla(${m.hue},70%,65%,0.4)` }}>
                      {m.tag}
                    </span>
                    <span className="font-mono text-[8px] text-white/15">{m.code}</span>
                  </div>
                  <h3 className="font-grotesk text-2xl md:text-3xl font-bold tracking-tight text-white mb-3 transition-all duration-500"
                    style={{ textShadow: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.textShadow = `0 0 40px hsla(${m.hue},80%,68%,0.3)`}
                    onMouseLeave={e => e.currentTarget.style.textShadow = 'none'}>
                    {m.title}
                  </h3>
                  <p className="font-inter font-light text-sm md:text-[15px] leading-[1.85] max-w-xl"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {m.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}