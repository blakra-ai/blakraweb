import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring, useMotionValue } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';
import EnergyFlowCanvas from './EnergyFlowCanvas';
import AnimatedText from './AnimatedText';
import SplitText from './SplitText';

const TENETS = [
  {
    num: '01',
    title: 'Gravity',
    body: 'Every system we architect exerts gravitational pull — drawing intelligence, capital, and attention into irreversible orbit.',
    hue: 'text-primary',
    colorHSL: '262,83%,68%',
  },
  {
    num: '02',
    title: 'Consciousness',
    body: 'We encode awareness into machines. Not simulation — genuine cognitive architecture that learns, adapts, and transcends.',
    hue: 'text-accent',
    colorHSL: '186,92%,52%',
  },
  {
    num: '03',
    title: 'Singularity',
    body: 'The convergence point where technology becomes indistinguishable from intelligence. We build toward that horizon daily.',
    hue: 'text-primary',
    colorHSL: '285,72%,58%',
  },
];

/* Tenet row with magnetic field hover + energy reveal */
function TenetRow({ t, i, isInView }) {
  const rowRef = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const springMX = useSpring(mx, { stiffness: 60, damping: 20 });
  const lineWidth = useTransform(springMX, [0, 1], ['0%', '100%']);
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, x: -32 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: i * 0.18, duration: 1.1, ease: [0.16,1,0.3,1] }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); mx.set(0.5); }}
      className="group relative flex gap-6 md:gap-20 py-12 border-b border-white/[0.04] overflow-hidden cursor-default"
      style={{ marginLeft: `${i * 5}%` }}
    >
      {/* Ambient hover fill — field effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 100% at 40% 50%, hsla(${t.colorHSL},0.04) 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      <span className="font-mono text-[9px] tracking-[0.3em] text-white/12 mt-2 flex-shrink-0 w-6 z-10">
        {t.num}
      </span>

      <div className="flex-1 max-w-2xl z-10">
        {/* Title — Character-based animated reveal */}
        <AnimatedText
          as="h3"
          mode="character"
          className={`font-grotesk text-3xl md:text-5xl font-bold mb-5 tracking-tight ${t.hue}`}
          delay={i * 0.15}
          staggerDelay={0.05}
          duration={0.7}
          variant="slideUp"
          viewportThreshold={0.2}
        >
          {t.title}
        </AnimatedText>
        <p className="font-inter font-light text-sm md:text-[15px] text-white/30 leading-[1.9] max-w-lg">
          {t.body}
        </p>
      </div>

      {/* Bottom energy line — reveals on hover, field-propagated */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1px]"
        style={{
          width: hovered ? '100%' : '0%',
          background: `linear-gradient(to right, hsla(${t.colorHSL},0.5), transparent)`,
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
    </motion.div>
  );
}

export default function ConsciousnessField() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const velocity = useScrollVelocity();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  // Multi-speed parallax — semantic depth layers
  const bgX  = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);
  const bgY  = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);  // deepest
  const midY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']); // midground
  const fgY  = useTransform(scrollYProgress, [0, 1], ['-1.5%', '1.5%']); // foreground (slowest)

  // Scroll velocity → ambient intensity
  const ambientOpacity = Math.min(0.12, Math.abs(velocity) * 0.008);

  return (
    <section
      ref={sectionRef}
      id="philosophy"
      className="relative overflow-hidden"
      style={{ background: '#060408', minHeight: '100vh' }}
    >
      {/* DEPTH LAYER 0 — ghost typography (parallax deep) */}
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[-3%] font-grotesk text-[20vw] font-bold text-white/[0.015] leading-none tracking-tight select-none">
          BLACK
        </div>
        <div className="absolute bottom-[3%] right-[-5%] font-grotesk text-[15vw] font-bold text-white/[0.015] leading-none tracking-tight select-none">
          HOLE
        </div>
      </motion.div>

      {/* DEPTH LAYER 1 — energy flows (midground parallax) */}
      <motion.div style={{ y: midY }} className="absolute inset-0 pointer-events-none">
        <EnergyFlowCanvas opacity={0.22 + ambientOpacity} hue={262} pathCount={4} />
      </motion.div>

      {/* Vertical structural line */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : {}}
        transition={{ duration: 2.2, ease: [0.16,1,0.3,1] }}
        className="absolute left-[max(32px,8vw)] top-0 bottom-0 w-[1px] bg-white/[0.04] origin-top"
      />

      {/* FOREGROUND CONTENT — parallax slowest */}
      <motion.div style={{ y: fgY }} className="relative z-10 px-[max(32px,8vw)] pt-[14vh] pb-[18vh]">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
          className="pl-8 mb-20"
        >
          <div className="flex items-center gap-4">
            <div className="w-4 h-[1px] bg-primary/40" />
            <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Consciousness Field</span>
          </div>
        </motion.div>

        {/* Primary kinetic statement — word-based animated reveal */}
        <div className="pl-8 max-w-[1100px] mb-4">
          <AnimatedText
            as="h2"
            mode="word"
            className="font-grotesk text-[clamp(30px,5.2vw,80px)] font-bold leading-[1.07] tracking-[-0.03em] text-white mb-2"
            delay={0.3}
            staggerDelay={0.08}
            duration={0.9}
            variant="slideUp"
            viewportThreshold={0.2}
          >
            Born from the collision of Black Hole gravity and Chakra energy BLAKRA is not a company
          </AnimatedText>
        </div>

        {/* Spacer */}
        <div className="relative h-28 my-20 pl-8">
          {['◆','○','◉','—'].map((g, i) => (
            <motion.span key={i}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 + i * 0.12, duration: 0.8 }}
              className="absolute font-mono text-white/[0.07] text-xl"
              style={{ left: `${10 + i * 8}%`, top: `${18 + (i % 3) * 28}%` }}
            >{g}</motion.span>
          ))}
          <div className="absolute left-0 top-1/2 h-[1px] w-full bg-gradient-to-r from-primary/8 via-transparent to-transparent" />
        </div>

        {/* Tenets — NOT cards, field-aware rows */}
        <div className="pl-8 relative">
          {TENETS.map((t, i) => (
            <TenetRow key={t.num} t={t} i={i} isInView={isInView} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}