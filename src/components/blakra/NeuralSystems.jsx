import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';
import EnergyFlowCanvas from './EnergyFlowCanvas';

const SYSTEMS = [
  { id: 'ai',   code: 'NRL.01', name: 'AI Systems',        sub: 'Cognitive Architecture',  x: '10%', y: '20%', size: 'large',
    desc: 'Deep cognitive models engineered for generalization. Our AI systems don\'t just predict — they reason, synthesize, and evolve.', hue: 265 },
  { id: 'rob',  code: 'NRL.02', name: 'Robotics',           sub: 'Autonomous Intelligence', x: '58%', y: '8%',  size: 'medium',
    desc: 'Physical intelligence at scale. Robotic systems with perception-action loops that navigate the irreducible complexity of real environments.', hue: 190 },
  { id: 'auto', code: 'NRL.03', name: 'Automation',         sub: 'Process Consciousness',   x: '78%', y: '38%', size: 'medium',
    desc: 'Workflows that think. Our automation platforms don\'t execute scripts — they orchestrate intelligence across distributed systems.', hue: 285 },
  { id: 'data', code: 'NRL.04', name: 'Data Intelligence',  sub: 'Signal Extraction',       x: '20%', y: '58%', size: 'small',
    desc: 'Signal from noise at planetary scale. Real-time pipelines that transform raw data entropy into prescient intelligence.', hue: 220 },
  { id: 'inf',  code: 'NRL.05', name: 'Infrastructure',     sub: 'Self-Healing Grid',       x: '60%', y: '62%', size: 'small',
    desc: 'Infrastructure that breathes. Adaptive topology that reconfigures, heals, and optimizes itself without human intervention.', hue: 265 },
  { id: 'neu',  code: 'NRL.06', name: 'Neural Interface',   sub: 'Mind-Machine Bridge',     x: '38%', y: '35%', size: 'large',
    desc: 'Sub-millisecond brain-computer interfaces that dissolve the boundary between cognition and computation.', hue: 190 },
];

const sizeMap  = { large: 'w-20 h-20 md:w-28 md:h-28', medium: 'w-14 h-14 md:w-20 md:h-20', small: 'w-10 h-10 md:w-14 md:h-14' };
const ringMap  = { large: 'w-40 h-40 md:w-52 md:h-52', medium: 'w-28 h-28 md:w-40 md:h-40', small: 'w-20 h-20 md:w-28 md:h-28' };

/* Node with magnetic pull */
function SystemNode({ sys, isActive, isInView, onSelect, mousePos }) {
  const ref = useRef(null);
  const dx = useMotionValue(0), dy = useMotionValue(0);
  const sx = useSpring(dx, { stiffness: 120, damping: 22 });
  const sy = useSpring(dy, { stiffness: 120, damping: 22 });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((mousePos.x - cx) ** 2 + (mousePos.y - cy) ** 2);
    const radius = 160;
    if (dist < radius) {
      const force = (1 - dist / radius) * 0.28;
      dx.set((mousePos.x - cx) * force);
      dy.set((mousePos.y - cy) * force);
    } else {
      dx.set(0); dy.set(0);
    }
  }, [mousePos, dx, dy]);

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy, left: sys.x, top: sys.y, transform: 'translate(-50%,-50%)' }}
      className="absolute"
      initial={{ scale: 0, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : {}}
      transition={{ delay: 0.4 + SYSTEMS.indexOf(sys) * 0.1, duration: 0.9, ease: [0.16,1,0.3,1] }}
    >
      <button onClick={() => onSelect(isActive ? null : sys.id)} className="group relative">
        {/* Orbit ring — rotates when active */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${ringMap[sys.size]} rounded-full border transition-all duration-700 ${
          isActive ? 'border-primary/50 animate-spin-xslow' : 'border-white/[0.06] group-hover:border-white/12'
        }`} />
        {/* Secondary orbit */}
        {isActive && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20 animate-spin-medium`}
            style={{ width: 'calc(100% + 48px)', height: 'calc(100% + 48px)', marginLeft: '-24px', marginTop: '-24px' }} />
        )}
        {/* Node sphere */}
        <div className={`relative ${sizeMap[sys.size]} rounded-full border flex items-center justify-center transition-all duration-600 ${
          isActive
            ? 'border-primary/50 bg-primary/8'
            : 'border-white/[0.08] bg-white/[0.02] group-hover:border-white/15 group-hover:bg-white/[0.03]'
        }`}
          style={isActive ? { boxShadow: `0 0 40px hsla(${sys.hue},80%,65%,0.2), 0 0 80px hsla(${sys.hue},80%,65%,0.07)` } : {}}
        >
          <div className={`rounded-full transition-all duration-500 ${
            isActive ? 'w-3 h-3' : 'w-1.5 h-1.5'
          }`} style={{ background: `hsl(${sys.hue},80%,68%)`, boxShadow: isActive ? `0 0 12px hsl(${sys.hue},80%,68%)` : 'none' }} />
        </div>
        {/* Label */}
        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap pointer-events-none transition-opacity duration-400 ${
          isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'
        }`}>
          <div className="font-mono text-[8px] tracking-[0.2em] text-white uppercase">{sys.name}</div>
          <div className="font-mono text-[7px] text-white/25 text-center mt-0.5">{sys.code}</div>
        </div>
      </button>
    </motion.div>
  );
}

export default function NeuralSystems() {
  const [active, setActive] = useState(null);
  const mapRef = useRef(null);
  const sectionRef = useRef(null);
  const isInView = useInView(mapRef, { once: true, margin: '-100px' });
  const velocity = useScrollVelocity();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const activeSystem = SYSTEMS.find(s => s.id === active);

  useEffect(() => {
    const onMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Scroll velocity → field intensity
  const fieldIntensity = Math.min(0.35, 0.1 + Math.abs(velocity) * 0.015);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #060408 0%, #04060a 100%)', minHeight: '100vh' }}
    >
      {/* Star field — deep layer */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/[0.05]"
            style={{
              left: `${(i * 17.3) % 100}%`, top: `${(i * 13.7) % 100}%`,
              width: i % 9 === 0 ? 2 : 1, height: i % 9 === 0 ? 2 : 1,
            }}
          />
        ))}
      </div>

      {/* Energy flows — ambient field, velocity-reactive */}
      <div className="absolute inset-0 pointer-events-none">
        <EnergyFlowCanvas opacity={fieldIntensity} hue={285} pathCount={3} />
      </div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">Neural Systems</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-0">
          {/* Spatial node field */}
          <div ref={mapRef} className="lg:w-1/2 relative h-[60vw] max-h-[560px] min-h-[360px]">
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {SYSTEMS.slice(0, 5).map((s, i) => {
                const target = SYSTEMS[(i + 2) % SYSTEMS.length];
                const isConnected = s.id === active || target.id === active;
                return (
                  <motion.line key={i}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isInView ? { pathLength: 1, opacity: isConnected ? 0.3 : 0.06 } : {}}
                    transition={{ delay: 0.6 + i * 0.12, duration: 1.2 }}
                    x1={s.x} y1={s.y} x2={target.x} y2={target.y}
                    stroke={isConnected ? 'hsl(262,83%,68%)' : 'white'}
                    strokeWidth={isConnected ? 0.8 : 0.4}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {SYSTEMS.map((sys) => (
              <SystemNode key={sys.id} sys={sys} isActive={active === sys.id} isInView={isInView} onSelect={setActive} mousePos={mousePos} />
            ))}
          </div>

          {/* Context panel — material: data surface (flat, sharp) */}
          <div className="lg:w-1/2 flex flex-col justify-center lg:pl-12">
            <AnimatePresence mode="wait">
              {activeSystem ? (
                <motion.div key={activeSystem.id}
                  initial={{ opacity: 0, x: 24, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                  transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
                >
                  <div className="font-mono text-[9px] tracking-[0.4em] mb-4 uppercase"
                    style={{ color: `hsla(${activeSystem.hue},80%,68%,0.5)` }}>
                    {activeSystem.code}
                  </div>
                  <h2 className="font-grotesk text-4xl md:text-5xl font-bold text-white tracking-tight mb-2"
                    style={{ textShadow: `0 0 60px hsla(${activeSystem.hue},80%,68%,0.25)` }}>
                    {activeSystem.name}
                  </h2>
                  <p className="font-grotesk text-sm mb-8" style={{ color: `hsla(${activeSystem.hue},50%,60%,0.5)` }}>
                    {activeSystem.sub}
                  </p>
                  {/* Energy separator — not a border */}
                  <div className="relative h-[1px] w-16 mb-8">
                    <div className="absolute inset-0 bg-primary/30" />
                    <div className="absolute inset-0 blur-sm" style={{ background: `hsla(${activeSystem.hue},80%,68%,0.5)` }} />
                  </div>
                  <p className="font-inter font-light text-sm md:text-[15px] text-white/35 leading-[1.9] max-w-sm">
                    {activeSystem.desc}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="font-grotesk text-4xl md:text-6xl font-bold tracking-[-0.03em] leading-none mb-6">
                    <span className="text-white">Six</span><br />
                    <span className="text-white/10 italic font-light">Systems.</span><br />
                    <span className="text-white">One</span><br />
                    <span className="text-primary">Intelligence.</span>
                  </h2>
                  <p className="font-inter font-light text-sm text-white/20 max-w-xs leading-relaxed">
                    Select a node to explore each system module.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}