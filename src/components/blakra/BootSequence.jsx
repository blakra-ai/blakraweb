import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const bootLines = [
  { text: '> INITIALIZING BLAKRA CORE SYSTEMS...', delay: 0 },
  { text: '> NEURAL INTERFACE v7.2.1 :: ONLINE', delay: 400 },
  { text: '> QUANTUM MESH CONNECTED', delay: 700 },
  { text: '> CHAKRA ENERGY GRID :: CALIBRATING...', delay: 1000 },
  { text: '> SINGULARITY ENGINE :: ACTIVATED', delay: 1400 },
  { text: '> CONSCIOUSNESS MATRIX :: SYNCED', delay: 1800 },
  { text: '> ALL SYSTEMS NOMINAL', delay: 2200 },
  { text: '> ENTERING THE VOID...', delay: 2600 },
];

export default function BootSequence({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [phase, setPhase] = useState('boot'); // boot -> reveal -> done

  useEffect(() => {
    bootLines.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text]);
      }, line.delay);
    });

    setTimeout(() => setPhase('reveal'), 3200);
    setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 4200);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center noise-overlay"
        >
          {phase === 'boot' && (
            <div className="max-w-lg w-full px-8">
              {/* Pulsing logo */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-12 text-center"
              >
                <div className="inline-block relative">
                  <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-6">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
                  </div>
                </div>
              </motion.div>

              {/* Boot lines */}
              <div className="space-y-2">
                {visibleLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-[11px] md:text-xs tracking-wider"
                  >
                    <span className={i === visibleLines.length - 1 ? 'text-primary' : 'text-muted-foreground'}>
                      {line}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Progress */}
              <motion.div className="mt-10 h-[1px] bg-secondary overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'easeInOut' }}
                  className="h-full gradient-violet-cyan"
                />
              </motion.div>
            </div>
          )}

          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <h1 className="font-space text-5xl md:text-7xl font-bold tracking-[0.4em] text-foreground text-glow-violet">
                BLAKRA
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 font-mono text-[10px] tracking-[0.4em] text-muted-foreground uppercase"
              >
                Digital Consciousness Engineered
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}