import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';
import EnergyFlowCanvas from './EnergyFlowCanvas';

const PROMPTS = [
  'What are you building?',
  'What challenge are you facing?',
  'What does your future look like?',
  'What would you automate first?',
];

/* Magnetic submit button */
function MagneticSubmit({ onClick }) {
  const ref = useRef(null);
  const dx = useMotionValue(0), dy = useMotionValue(0);
  const sx = useSpring(dx, { stiffness: 160, damping: 16 });
  const sy = useSpring(dy, { stiffness: 160, damping: 16 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
    if (dist < 90) {
      const f = (1 - dist / 90) * 0.5;
      dx.set((e.clientX - cx) * f);
      dy.set((e.clientY - cy) * f);
    }
  };
  const onLeave = () => { dx.set(0); dy.set(0); setHovered(false); };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="group flex items-center gap-5"
    >
      {/* Circle — plasma material on hover */}
      <div className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-700"
        style={{
          border: `1px solid ${hovered ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: hovered ? '0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.08)' : 'none',
        }}>
        {/* Plasma fill */}
        <div className="absolute inset-0 rounded-full bg-primary transition-transform duration-700"
          style={{ transform: hovered ? 'scale(1)' : 'scale(0)', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
        {/* Arrow */}
        <svg viewBox="0 0 16 16" className="relative w-4 h-4 transition-colors duration-300"
          fill="none" stroke={hovered ? 'white' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5">
          <path d="M2 8h12M9 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div className="font-grotesk text-sm font-semibold transition-colors duration-400"
          style={{ color: hovered ? 'white' : 'rgba(255,255,255,0.45)' }}>
          Transmit Signal
        </div>
        <div className="font-mono text-[8px] tracking-[0.2em] text-white/18 uppercase mt-0.5">
          Encrypted · Instant
        </div>
      </div>
    </motion.button>
  );
}

export default function CommandInterface() {
  const [values, setValues] = useState({ org: '', email: '', transmission: '' });
  const [transmitted, setTransmitted] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const velocity   = useScrollVelocity();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  // Depth parallax
  const copyY  = useTransform(scrollYProgress, [0, 1], ['4%', '-4%']);  // foreground
  const formY  = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);  // midground

  useEffect(() => {
    const t = setInterval(() => setCurrentPrompt(p => (p + 1) % PROMPTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const FIELDS = [
    { key: 'org',          prompt: '> IDENTIFY ENTITY',  placeholder: 'Organization / Name',   type: 'text' },
    { key: 'email',        prompt: '> SIGNAL FREQUENCY', placeholder: 'your@email.com',        type: 'email' },
    { key: 'transmission', prompt: '> TRANSMISSION',     placeholder: PROMPTS[currentPrompt],  type: 'textarea' },
  ];

  // Ambient energy intensity from velocity
  const energyOpacity = Math.min(0.3, 0.08 + Math.abs(velocity) * 0.015);

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#040404', minHeight: '100vh' }}
    >
      {/* Deep light beam — atmospheric soft layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute"
          style={{
            top: '-20%', right: '-10%',
            width: '55vw', height: '150%',
            background: 'linear-gradient(225deg, rgba(120,50,200,0.05) 0%, transparent 55%)',
            transform: 'rotate(-15deg)',
          }}
        />
      </div>

      {/* Energy flows — velocity-reactive */}
      <div className="absolute inset-0 pointer-events-none">
        <EnergyFlowCanvas opacity={energyOpacity} hue={265} pathCount={4} />
      </div>

      {/* Precise grid — material: data surface */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Scene top fade */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #050407, transparent)' }}
      />

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Command Interface</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:gap-0">
          {/* LEFT — emotional copy (foreground, slower parallax) */}
          <motion.div style={{ y: copyY }} className="lg:w-[45%] lg:pr-20 mb-16 lg:mb-0 flex flex-col justify-center">
            <div className="overflow-hidden mb-2">
              <motion.h2
                initial={{ y: '110%' }}
                animate={isInView ? { y: 0 } : {}}
                transition={{ duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(40px,6vw,88px)] font-bold tracking-[-0.04em] leading-[0.92] text-white"
              >
                Begin
              </motion.h2>
            </div>
            <div className="overflow-hidden mb-14">
              <motion.h2
                initial={{ y: '110%' }}
                animate={isInView ? { y: 0 } : {}}
                transition={{ delay: 0.08, duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(40px,6vw,88px)] font-bold tracking-[-0.04em] leading-[0.92] text-primary"
                style={{ textShadow: '0 0 80px rgba(139,92,246,0.5)' }}
              >
                Transmission.
              </motion.h2>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 1 }}
              className="font-inter font-light text-sm md:text-[15px] text-white/28 leading-[1.9] max-w-sm mb-16"
            >
              We don't take briefs. We receive missions.
              Tell us what you're building, and we'll tell you how far it can go.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 1 }}
              className="space-y-0"
            >
              {[
                { label: 'Signal',      val: 'hello@blakra.io' },
                { label: 'Coordinates', val: 'SF · LDN · TYO' },
                { label: 'Clearance',   val: 'Enterprise · Research · Defense' },
              ].map((item) => (
                <div key={item.label} className="flex gap-8 pb-5 mb-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/18 w-20 flex-shrink-0">{item.label}</span>
                  <span className="font-inter text-sm text-white/38">{item.val}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — terminal form (midground, moves more) */}
          <motion.div
            style={{ y: formY }}
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3, duration: 1.3, ease: [0.16,1,0.3,1] }}
            className="lg:w-[55%] relative"
          >
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px]"
              style={{ background: 'rgba(255,255,255,0.04)' }} />

            <div className="lg:pl-16">
              {/* Terminal header — material: data */}
              <div className="flex items-center gap-2 mb-10 pb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex gap-1.5">
                  {[0.45,0.22,0.1].map((o,i) => <div key={i} className="w-2 h-2 rounded-full bg-white" style={{opacity: o}} />)}
                </div>
                <span className="ml-3 font-mono text-[8px] tracking-[0.25em] text-white/12">
                  BLAKRA::TRANSMISSION_INTERFACE
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-[7px] text-primary/38">LIVE</span>
                </div>
              </div>

              {!transmitted ? (
                <div className="space-y-8">
                  {FIELDS.map((field, i) => (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, x: 18 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.5 + i * 0.12, duration: 0.9 }}
                    >
                      <div className="font-mono text-[9px] tracking-[0.3em] mb-3 uppercase"
                        style={{ color: focusedField === field.key ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.28)' }}>
                        {field.prompt}
                      </div>
                      {field.type === 'textarea' ? (
                        <textarea rows={4} placeholder={field.placeholder}
                          onChange={e => setValues(v => ({...v, [field.key]: e.target.value}))}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          className="w-full bg-transparent outline-none font-inter font-light text-sm py-2 resize-none transition-colors duration-500 placeholder:text-white/12"
                          style={{
                            borderBottom: `1px solid ${focusedField === field.key ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        />
                      ) : (
                        <input type={field.type} placeholder={field.placeholder}
                          onChange={e => setValues(v => ({...v, [field.key]: e.target.value}))}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          className="w-full bg-transparent outline-none font-inter font-light text-sm py-2 transition-colors duration-500 placeholder:text-white/12"
                          style={{
                            borderBottom: `1px solid ${focusedField === field.key ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        />
                      )}
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="pt-4"
                  >
                    <MagneticSubmit onClick={() => setTransmitted(true)} />
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}
                  className="py-10"
                >
                  <div className="font-mono text-[9px] tracking-[0.3em] space-y-2 mb-8"
                    style={{ color: 'rgba(255,255,255,0.18)' }}>
                    <div>{'> SIGNAL RECEIVED'}</div>
                    <div>{'> ENCRYPTION: AES-256 :: OK'}</div>
                    <div style={{ color: 'rgba(139,92,246,0.5)' }}>{'> ROUTING TO INTELLIGENCE TEAM...'}</div>
                    <div style={{ color: 'rgba(52,211,153,0.5)' }}>{'> TRANSMISSION COMPLETE'}<span className="blink">_</span></div>
                  </div>
                  <h3 className="font-grotesk text-3xl font-bold text-white mb-3">Signal Received.</h3>
                  <p className="font-inter font-light text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Our systems are already analyzing your transmission.
                    A human intelligence will reach out within 24 hours.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}