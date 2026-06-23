import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEQUENCES = [
  { t: 0,    text: 'BIOS v9.2.0 :: BLAKRA CORE ARCHITECTURE', col: 'white/20' },
  { t: 340,  text: 'Quantum entropy seed: 7f3a9b2c1d8e4f0a', col: 'white/15' },
  { t: 620,  text: 'Loading consciousness tensor [██████████] 100%', col: 'white/15' },
  { t: 880,  text: 'Initializing neural mesh... OK', col: 'white/20' },
  { t: 1100, text: 'Calibrating chakra energy grid... ALIGNED', col: 'primary' },
  { t: 1380, text: 'Singularity engine: ACTIVE', col: 'primary' },
  { t: 1620, text: 'Gravity field: STABLE', col: 'white/20' },
  { t: 1900, text: '──────────────────────────────────────────', col: 'white/8' },
  { t: 2100, text: 'BLAKRA OS READY', col: 'accent' },
];

export default function BootScene({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('boot');

  useEffect(() => {
    SEQUENCES.forEach((s) => {
      setTimeout(() => setLines(prev => [...prev, s]), s.t);
    });

    // Progress animation
    const start = Date.now();
    const duration = 2600;
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    setTimeout(() => setPhase('reveal'), 2700);
    setTimeout(() => { setPhase('exit'); onComplete(); }, 4200);
  }, [onComplete]);

  const colClass = (col) => {
    if (col === 'primary') return 'text-primary';
    if (col === 'accent') return 'text-accent';
    return `text-${col}`;
  };

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}
          className="fixed inset-0 z-[9999] bg-[#040404] flex flex-col justify-end noise"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />

          {phase === 'boot' && (
            <div className="relative z-10 p-8 md:p-16 max-w-3xl">
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`text-[10px] md:text-xs leading-6 tracking-wider ${colClass(line.col)}`}
                >
                  {line.text}
                  {i === lines.length - 1 && <span className="blink ml-1 text-primary">_</span>}
                </motion.div>
              ))}

              {/* Progress bar */}
              <div className="mt-12 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] tracking-[0.3em] text-white/20 uppercase">Loading</span>
                  <span className="text-[9px] text-primary/60">{Math.round(progress)}%</span>
                </div>
                <div className="h-[1px] bg-white/5 w-full relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  >
                    <div className="h-full bg-primary/50" />
                    <div className="absolute right-0 top-0 h-full w-6 blur-sm bg-primary/80" />
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}
                >
                  <h1 className="font-grotesk text-[clamp(48px,12vw,160px)] font-bold tracking-[-0.04em] text-white leading-none">
                    BLAKRA
                  </h1>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="mt-4 text-[10px] tracking-[0.6em] uppercase text-white/25"
                  >
                    System Awakened
                  </motion.p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}