import { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const PROMPTS = ['What are you building?', 'What challenge are you facing?', 'What does your future look like?'];

export default function ContactSection() {
  const [values, setValues] = useState({ org: '', email: '', msg: '' });
  const [transmitted, setTransmitted] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [focused, setFocused] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    const t = setInterval(() => setCurrentPrompt(p => (p + 1) % PROMPTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const FIELDS = [
    { key: 'org', prompt: '> Organization', placeholder: 'Your company or name', type: 'text' },
    { key: 'email', prompt: '> Email address', placeholder: 'your@email.com', type: 'email' },
    { key: 'msg', prompt: '> Message', placeholder: PROMPTS[currentPrompt], type: 'textarea' },
  ];

  const handleChange = (key, value) => {
    setValues(v => ({...v, [key]: value}));
    if (key === 'msg') setCharCount(value.length);
  };

  return (
    <section ref={ref} id="contact" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      <div className="absolute inset-0 ambient-grid pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute bottom-1/3 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none animate-drift"
        style={{ background: 'radial-gradient(circle, hsla(186,100%,50%,0.015), transparent 60%)', animationDelay: '-8s' }} />

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-16">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Command Interface</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:gap-0">
          <motion.div className="lg:w-[45%] lg:pr-20 mb-16 lg:mb-0 flex flex-col justify-center">
            <div className="overflow-hidden mb-2">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(40px,6vw,88px)] font-bold tracking-[-0.04em] leading-[0.92] text-foreground">
                Begin
              </motion.h2>
            </div>
            <div className="overflow-hidden mb-14">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ delay: 0.08, duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(40px,6vw,88px)] font-bold tracking-[-0.04em] leading-[0.92] text-primary text-glow-teal">
                Transmission.
              </motion.h2>
            </div>

            <motion.p initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.4, duration: 1 }}
              className="font-inter font-light text-sm md:text-[15px] text-foreground/22 leading-[1.9] max-w-sm mb-16">
              Let's talk about what you're building. Whether it's scaling your operations, deploying AI systems, or modernizing your infrastructure — we're here to help you get there.
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.6, duration: 1 }} className="space-y-0">
              {[
                { label: 'Email', val: 'hello@blakra.io' },
                { label: 'Offices', val: 'San Francisco · London · Tokyo' },
                { label: 'Expertise', val: 'Enterprise · AI Systems · Automation' },
              ].map((item) => (
                <div key={item.label} className="flex gap-8 pb-5 mb-0 border-b border-foreground/[0.04] group">
                  <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-foreground/12 w-20 flex-shrink-0">{item.label}</span>
                  <span className="font-inter text-sm text-foreground/30 group-hover:text-foreground/45 transition-colors duration-500">{item.val}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 28 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3, duration: 1.3 }} className="lg:w-[55%] relative">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px] bg-foreground/[0.04]" />
            <div className="lg:pl-16">
              {/* Terminal header */}
              <div className="flex items-center gap-2 mb-10 pb-4 border-b border-foreground/[0.04]">
                <div className="flex gap-1.5">
                  {[0.45,0.22,0.1].map((o,i) => <div key={i} className="w-2 h-2 rounded-full bg-foreground" style={{opacity: o}} />)}
                </div>
                <span className="ml-3 font-mono text-[7px] tracking-[0.25em] text-foreground/8">BLAKRA::TRANSMISSION_INTERFACE</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-[6px] text-primary/38">LIVE</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!transmitted ? (
                  <motion.div key="form" className="space-y-8">
                    {FIELDS.map((field, i) => (
                      <motion.div key={field.key}
                        initial={{ opacity: 0, x: 20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.5 + i * 0.12, duration: 0.9 }}
                      >
                        <div className="font-mono text-[8px] tracking-[0.3em] mb-3 uppercase transition-colors duration-500"
                          style={{ color: focused === field.key ? 'hsla(186,100%,50%,0.7)' : 'hsla(186,100%,50%,0.22)' }}>
                          {field.prompt}
                        </div>
                        {field.type === 'textarea' ? (
                          <div className="relative">
                            <textarea rows={4} placeholder={field.placeholder}
                              onChange={e => handleChange(field.key, e.target.value)}
                              onFocus={() => setFocused(field.key)} onBlur={() => setFocused(null)}
                              className="w-full bg-transparent outline-none font-inter font-light text-sm py-2 resize-none transition-all duration-500 placeholder:text-foreground/8 text-foreground/50"
                              style={{ borderBottom: `1px solid ${focused === field.key ? 'hsla(186,100%,50%,0.45)' : 'rgba(255,255,255,0.05)'}` }} />
                            {focused === 'msg' && (
                              <span className="absolute bottom-3 right-0 font-mono text-[6px] text-foreground/8">{charCount} chars</span>
                            )}
                          </div>
                        ) : (
                          <input type={field.type} placeholder={field.placeholder}
                            onChange={e => handleChange(field.key, e.target.value)}
                            onFocus={() => setFocused(field.key)} onBlur={() => setFocused(null)}
                            className="w-full bg-transparent outline-none font-inter font-light text-sm py-2 transition-all duration-500 placeholder:text-foreground/8 text-foreground/50"
                            style={{ borderBottom: `1px solid ${focused === field.key ? 'hsla(186,100%,50%,0.45)' : 'rgba(255,255,255,0.05)'}` }} />
                        )}
                      </motion.div>
                    ))}
                    <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 1, duration: 0.8 }} className="pt-4">
                      <button onClick={() => setTransmitted(true)} className="group flex items-center gap-5 magnetic-target">
                        <div className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border border-foreground/6 group-hover:border-primary/50 transition-all duration-700">
                          <div className="absolute inset-0 rounded-full bg-primary transition-transform duration-700 scale-0 group-hover:scale-100" style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }} />
                          <svg viewBox="0 0 16 16" className="relative w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 8h12M9 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/25 group-hover:text-background transition-colors duration-300" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-grotesk text-sm font-semibold text-foreground/35 group-hover:text-foreground transition-colors duration-500">Transmit Signal</div>
                          <div className="font-mono text-[7px] tracking-[0.2em] text-foreground/12 uppercase mt-0.5">Encrypted · Instant</div>
                        </div>
                      </button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
                    className="py-10"
                  >
                    <div className="font-mono text-[8px] tracking-[0.3em] space-y-2 mb-10 text-foreground/12">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>{'> SIGNAL RECEIVED'}</motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>{'> ENCRYPTION: AES-256 :: OK'}</motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-primary/50">{'> ROUTING TO INTELLIGENCE TEAM...'}</motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} style={{ color: 'hsla(42,100%,50%,0.5)' }}>{'> TRANSMISSION COMPLETE'}<span className="blink">_</span></motion.div>
                    </div>
                    <h3 className="font-grotesk text-3xl font-bold text-foreground mb-3">Signal Received.</h3>
                    <p className="font-inter font-light text-sm text-foreground/22">Our systems are analyzing your transmission. A human intelligence will respond within 24 hours.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}