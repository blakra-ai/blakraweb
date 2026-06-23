import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import ServiceModuleCanvas from './ServiceModuleCanvas';
import CapabilityDeepDive from './CapabilityDeepDive';

const CAPABILITIES = [
  {
    id: 'ai-dev', code: '01', name: 'AI Systems Development',
    tagline: 'From research to production-grade intelligence.',
    body: 'We architect and deploy end-to-end AI systems — from training custom foundation models and fine-tuning domain-specific LLMs, to building inference pipelines that handle millions of requests per day. We don\'t wrap APIs. We build cognitive infrastructure.',
    specs: ['Custom LLM fine-tuning', 'Multi-modal systems', 'Real-time inference at scale', 'Model evaluation & alignment'],
    example: 'Financial services firm: Built custom LLM + document intelligence system processing 400K+ compliance documents monthly. 91% time reduction, 99.7% accuracy.',
    hue: 186,
  },
  {
    id: 'automation', code: '02', name: 'Automation Engineering',
    tagline: 'Processes that think. Systems that evolve.',
    body: 'Enterprise automation that goes beyond scripts and triggers. We design intelligent workflow orchestration that monitors, decides, and adapts — reducing operational load by 60–80% while improving process accuracy across the entire value chain.',
    specs: ['AI workflow orchestration', 'RPA with cognitive layer', 'Cross-system integration', 'Autonomous exception handling'],
    example: 'SaaS platform: Deployed AI support system resolving 68% of tickets autonomously. Average response time: 18 hours → 4 minutes. NPS improved +23 points.',
    hue: 42,
  },
  {
    id: 'custom-software', code: '03', name: 'Custom Software Development',
    tagline: 'Precision-engineered for your exact problem space.',
    body: 'We build software that solves specific, hard problems — not template solutions. Every system we deliver is designed for the operational reality of the client: their scale, their data, their existing infrastructure, their users.',
    specs: ['Systems & backend architecture', 'Real-time data platforms', 'API design & integration layers', 'Internal enterprise tooling'],
    example: 'Healthcare network: Unified 11M patient records across 42 facilities. Reduced clinical staff documentation time from 35% to 8% of shift.',
    hue: 186,
  },
  {
    id: 'robotics', code: '04', name: 'Robotics Integration',
    tagline: 'Physical intelligence for the real world.',
    body: 'We bridge the gap between AI models and physical systems. From perception-action loop design to robotic fleet orchestration, we deploy autonomous agents in manufacturing, logistics, healthcare, and hazardous environments where software alone cannot operate.',
    specs: ['Perception & sensor fusion', 'Motion planning & control', 'Fleet management systems', 'Edge-deployed AI models'],
    example: 'Auto manufacturer: 340 robotic cells with real-time telemetry. Reduced unplanned downtime by 78%. Saved $4.1M annually in operational costs.',
    hue: 42,
  },
  {
    id: 'data-intelligence', code: '05', name: 'Data Intelligence Platforms',
    tagline: 'Signal extraction at planetary scale.',
    body: 'We build the infrastructure that transforms raw data into operational intelligence. Real-time ingestion pipelines, multi-source fusion engines, and predictive analytics systems that give organizations a genuine informational advantage.',
    specs: ['Real-time streaming pipelines', 'Predictive analytics engines', 'Multi-source data fusion', 'Decision intelligence dashboards'],
    example: 'European logistics network: Dynamic rerouting system. Reduced late deliveries by 31%, fuel costs by 18%. Real-time latency: 200ms.',
    hue: 186,
  },
  {
    id: 'enterprise-arch', code: '06', name: 'Enterprise System Architecture',
    tagline: 'Infrastructure designed for the next decade.',
    body: 'Strategic technology architecture for organizations operating at scale. We redesign legacy systems, define migration paths, and build extensible foundations that carry your current capabilities forward without technical debt accumulation.',
    specs: ['Legacy modernization', 'Microservices & event-driven design', 'Multi-cloud & hybrid infrastructure', 'Security & compliance frameworks'],
    example: 'Fortune 500 tech firm: Redesigned monolithic system to microservices. Deployment frequency: 6 weeks → daily. Reduced infrastructure costs by $2.3M/year.',
    hue: 42,
  },
];

/* ── Energy flow ring around module ── */
function EnergyRing({ hue, hovered }) {
  const color = `hsl(${hue},100%,50%)`;
  const op = hovered ? 0.45 : 0.1;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* TL corner */}
      <div className="absolute top-0 left-0" style={{ opacity: op, transition: 'opacity 0.5s' }}>
        <div style={{ position:'absolute', top:0, left:0, width:16, height:1, background: color }} />
        <div style={{ position:'absolute', top:0, left:0, width:1, height:16, background: color }} />
      </div>
      {/* TR corner */}
      <div className="absolute top-0 right-0" style={{ opacity: op, transition: 'opacity 0.5s' }}>
        <div style={{ position:'absolute', top:0, right:0, width:16, height:1, background: color }} />
        <div style={{ position:'absolute', top:0, right:0, width:1, height:16, background: color }} />
      </div>
      {/* BL corner */}
      <div className="absolute bottom-0 left-0" style={{ opacity: op, transition: 'opacity 0.5s' }}>
        <div style={{ position:'absolute', bottom:0, left:0, width:16, height:1, background: color }} />
        <div style={{ position:'absolute', bottom:0, left:0, width:1, height:16, background: color }} />
      </div>
      {/* BR corner */}
      <div className="absolute bottom-0 right-0" style={{ opacity: op, transition: 'opacity 0.5s' }}>
        <div style={{ position:'absolute', bottom:0, right:0, width:16, height:1, background: color }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:1, height:16, background: color }} />
      </div>
      {/* Scanning beam — only when hovered */}
      {hovered && (
        <motion.div
          className="absolute top-0 bottom-0 w-[1px]"
          animate={{ left: ['0%', '100%', '0%'], opacity: [0, 0.18, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }}
        />
      )}
    </div>
  );
}

/* ── Individual system module card ── */
function SystemModule({ c, onDeepDive, isInView, i }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ delay: 0.2 + i * 0.09, duration: 1, ease: [0.16,1,0.3,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-pointer"
      style={{
        border: `1px solid ${hovered ? `hsla(${c.hue},100%,50%,0.18)` : 'rgba(255,255,255,0.05)'}`,
        background: hovered ? `hsla(${c.hue},100%,50%,0.025)` : 'rgba(255,255,255,0.01)',
        transition: 'border-color 0.5s, background 0.5s',
      }}
      onClick={() => onDeepDive(c)}
    >
      {/* Internal canvas animation */}
      <div className="relative overflow-hidden" style={{ height: 130 }}>
        <ServiceModuleCanvas capId={c.id} hue={c.hue} active={false} hovered={hovered} />
        {/* Bottom fade from canvas to card content */}
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(5,5,7,0.95))' }} />
      </div>

      {/* Energy ring overlay */}
      <EnergyRing hue={c.hue} hovered={hovered} />

      {/* Card content */}
      <div className="p-5 pb-6">
        <div className="flex items-start justify-between mb-3">
          <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: `hsla(${c.hue},100%,50%,0.4)` }}>{c.code}</span>
          <motion.div
            animate={{
              opacity: hovered ? 1 : 0,
              x: hovered ? 0 : 4,
            }}
            transition={{ duration: 0.35 }}
            className="font-mono text-[7px] tracking-[0.15em] uppercase flex items-center gap-1.5"
            style={{ color: `hsla(${c.hue},100%,50%,0.5)` }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: `hsl(${c.hue},100%,50%)` }} />
            Deep Dive
          </motion.div>
        </div>

        <h3 className="font-grotesk text-sm md:text-[15px] font-semibold leading-tight mb-2 transition-colors duration-500"
          style={{ color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)' }}>
          {c.name}
        </h3>
        <p className="font-inter font-light text-[11px] leading-relaxed transition-colors duration-500"
          style={{ color: hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)' }}>
          {c.tagline}
        </p>

        {/* Spec pills — visible on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, height: hovered ? 'auto' : 0 }}
          transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
          className="overflow-hidden"
        >
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.specs.map(spec => (
              <span key={spec} className="font-mono text-[6px] tracking-[0.08em] px-2 py-1"
                style={{
                  background: `hsla(${c.hue},100%,50%,0.06)`,
                  border: `1px solid hsla(${c.hue},100%,50%,0.12)`,
                  color: `hsla(${c.hue},60%,65%,0.5)`,
                }}>
                {spec}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
        <motion.div
          className="h-full"
          animate={{ width: hovered ? '100%' : '0%' }}
          transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
          style={{ background: `linear-gradient(to right, hsl(${c.hue},100%,50%), transparent)` }}
        />
      </div>
    </motion.div>
  );
}

export default function ServicesSection() {
  const [deepDive, setDeepDive] = useState(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <>
      <section ref={ref} id="services" className="relative overflow-hidden" style={{ background: '#050508', minHeight: '100vh' }}>
        {/* Ambient environment */}
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none animate-drift"
          style={{ background: 'radial-gradient(circle, hsla(42,100%,50%,0.012), transparent 70%)', animationDelay: '-5s' }} />
        <div className="absolute top-1/3 left-1/6 w-[350px] h-[350px] rounded-full pointer-events-none animate-drift"
          style={{ background: 'radial-gradient(circle, hsla(186,100%,50%,0.008), transparent 70%)', animationDelay: '-12s' }} />

        <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[14vh]">
          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
            className="flex items-center gap-4 mb-6">
            <div className="w-6 h-[1px] bg-accent/35" />
            <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">System Modules</span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: '110%' }}
                animate={isInView ? { y: 0 } : {}}
                transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(32px,5.5vw,78px)] font-bold tracking-[-0.04em] leading-none text-foreground"
              >
                Six core
                <span className="text-foreground/8 italic font-light ml-4">disciplines.</span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.35, duration: 1 }}
              className="font-mono text-[8px] tracking-[0.25em] text-foreground/14 max-w-[220px] leading-relaxed uppercase"
            >
              Click any module to<br />explore its architecture
            </motion.p>
          </div>

          {/* 3×2 module grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            {CAPABILITIES.map((c, i) => (
              <div key={c.id} className="relative"
                style={{
                  borderRight: (i + 1) % 3 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                <SystemModule c={c} onDeepDive={setDeepDive} isInView={isInView} i={i} />
              </div>
            ))}
          </div>

          {/* Footer note */}
          <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 1.1, duration: 1 }}
            className="mt-10 flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-primary/30 animate-pulse" />
            <span className="font-mono text-[7px] tracking-[0.3em] text-foreground/8 uppercase">
              All modules are live in production environments
            </span>
          </motion.div>
        </div>
      </section>

      {/* Full-screen deep dive overlay */}
      <AnimatePresence>
        {deepDive && (
          <CapabilityDeepDive
            key={deepDive.id}
            cap={deepDive}
            onClose={() => setDeepDive(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}