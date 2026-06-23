import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';

const PROJECTS = [
  { id: 'nexus',  code: 'MEM.01', title: 'NEXUS',  arc: 'Autonomous Fleet Intelligence',  impact: '10,000+', impactLabel: 'vehicles in orbit',    year: '2024', col: 265,
    body: 'A cognitive OS for 10,000 autonomous vehicles. Real-time collision avoidance, route optimization, and energy arbitrage on a single unified neural mesh. 99.97% safety compliance across 47 cities.',
    tags: ['AI', 'Robotics', 'Real-Time Systems'] },
  { id: 'prism',  code: 'MEM.02', title: 'PRISM',  arc: 'Predictive Market Intelligence',  impact: '2.4B',    impactLabel: 'data points per day',  year: '2023', col: 190,
    body: 'Enterprise prescience engine for a Fortune 50 institution. 2.4 billion signals daily across 180 markets, 94% accurate 72-hour forecasts. Replaced 40 analysts with one model.',
    tags: ['Data Intelligence', 'ML', 'Enterprise'] },
  { id: 'cortex', code: 'MEM.03', title: 'CORTEX', arc: 'Neural Interface Platform',        impact: '<1ms',    impactLabel: 'human-machine latency', year: '2024', col: 285,
    body: 'The world\'s first commercial brain-computer interface with sub-millisecond bidirectional latency. Used in surgical robotics — surgeon intent translates to robotic action faster than conscious perception.',
    tags: ['Neurotech', 'Hardware', 'Surgical AI'] },
  { id: 'helix',  code: 'MEM.04', title: 'HELIX',  arc: 'Genomic Computing Grid',           impact: '340%',    impactLabel: 'faster drug discovery',  year: '2023', col: 220,
    body: 'Quantum-classical compute grid that compressed 12 years of drug discovery into 3.5 years. Simulates molecular interactions at quantum accuracy across 50,000 compounds simultaneously.',
    tags: ['Biotech', 'Quantum', 'Cloud'] },
];

export default function MemoryLayer() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-60px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const velocity = useScrollVelocity();

  // Depth parallax — impact number (deepest) vs title (foreground)
  const impactY = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);  // deeper layer
  const titleY  = useTransform(scrollYProgress, [0, 1], ['2%', '-2%']);  // foreground

  const proj = PROJECTS[active];

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#050407', minHeight: '100vh' }}
    >
      {/* Scene transition — DOF blur edge from above */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #030507, transparent)' }}
      />

      {/* Ghost background — large project code, deep layer */}
      <motion.div
        style={{ y: impactY }}
        className="absolute right-[-4%] top-[10%] pointer-events-none select-none overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={proj.id + '-bg'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="font-grotesk font-bold leading-none"
            style={{
              fontSize: '22vw',
              letterSpacing: '-0.06em',
              color: `hsla(${proj.col},80%,65%,0.03)`,
            }}
          >
            {proj.title}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">Memory Layer</span>
        </motion.div>

        {/* Cinematic headline — foreground parallax */}
        <motion.div style={{ y: titleY }} className="overflow-hidden mb-20">
          <motion.h2
            initial={{ y: '110%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{ duration: 1.5, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(40px,8vw,120px)] font-bold tracking-[-0.05em] leading-none text-white"
          >
            Reconstructed
            <span className="ml-4 italic font-light" style={{ color: 'rgba(255,255,255,0.08)' }}>Realities.</span>
          </motion.h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-0">
          {/* Left — index selector, material: data (flat) */}
          <div className="lg:w-[38%] lg:pr-16">
            {PROJECTS.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -24 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: [0.16,1,0.3,1] }}
                onClick={() => setActive(i)}
                className="group w-full text-left py-6 flex items-start gap-5 relative overflow-hidden"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Active bar */}
                <div className="flex-shrink-0 mt-1.5 w-[2px] h-6 transition-all duration-600"
                  style={{
                    background: active === i ? `hsl(${p.col},80%,68%)` : 'rgba(255,255,255,0.08)',
                    boxShadow: active === i ? `0 0 8px hsl(${p.col},80%,68%)` : 'none',
                    transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-grotesk text-xl md:text-2xl font-bold tracking-tight transition-colors duration-400"
                      style={{ color: active === i ? 'white' : 'rgba(255,255,255,0.25)' }}>
                      {p.title}
                    </h3>
                    <span className="font-mono text-[8px] tracking-[0.2em] transition-colors duration-400"
                      style={{ color: active === i ? `hsla(${p.col},80%,65%,0.5)` : 'rgba(255,255,255,0.08)' }}>
                      {p.year}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] mt-1 tracking-[0.1em] uppercase transition-colors duration-400"
                    style={{ color: active === i ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
                    {p.arc}
                  </p>
                </div>
                {/* Field hover fill */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to right, hsla(${p.col},80%,65%,0.025), transparent)` }}
                />
              </motion.button>
            ))}
          </div>

          {/* Right — detail, off-axis with depth overlap */}
          <div className="lg:w-[62%] relative">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px]"
              style={{ background: 'rgba(255,255,255,0.04)' }} />

            <AnimatePresence mode="wait">
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
                className="lg:pl-16"
              >
                {/* Impact — plasma material (emissive, huge) */}
                <div className="mb-10">
                  <p className="font-grotesk font-bold leading-none tracking-[-0.05em]"
                    style={{
                      fontSize: 'clamp(64px, 10vw, 140px)',
                      color: `hsla(${proj.col},80%,65%,0.92)`,
                      textShadow: `0 0 100px hsla(${proj.col},80%,65%,0.35), 0 0 40px hsla(${proj.col},80%,65%,0.15)`,
                    }}>
                    {proj.impact}
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.3em] uppercase mt-2"
                    style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {proj.impactLabel}
                  </p>
                </div>

                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                  style={{ color: 'rgba(255,255,255,0.15)' }}>
                  {proj.code} — {proj.arc}
                </div>

                <p className="font-inter font-light text-sm md:text-[15px] leading-[1.85] mb-10 max-w-lg"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {proj.body}
                </p>

                <div className="flex gap-5 flex-wrap">
                  {proj.tags.map((tag) => (
                    <span key={tag} className="font-mono text-[9px] tracking-[0.2em] uppercase"
                      style={{ color: 'rgba(255,255,255,0.18)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}