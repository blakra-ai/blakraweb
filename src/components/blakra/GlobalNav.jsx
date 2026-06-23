import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { label: 'Philosophy', id: 'philosophy' },
  { label: 'Capabilities', id: 'services' },
  { label: 'Work', id: 'projects' },
  { label: 'Team', id: 'team' },
  { label: 'Lab', id: 'lab' },
  { label: 'Contact', id: 'contact' },
];

export default function GlobalNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 100);
      
      // Track active section
      const sections = NAV.map(n => document.getElementById(n.id)).filter(Boolean);
      const current = sections.find(s => {
        const rect = s.getBoundingClientRect();
        return rect.top <= window.innerHeight / 3 && rect.bottom > window.innerHeight / 3;
      });
      if (current) setActiveSection(current.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.16,1,0.3,1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-5 transition-all duration-700"
        style={{
          background: scrolled ? 'rgba(5,5,7,0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(28px) saturate(1.2)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.03)' : '1px solid transparent',
        }}
      >
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group magnetic-target">
          <span className="font-grotesk text-sm font-bold tracking-[0.5em] uppercase text-foreground/45 group-hover:text-primary transition-colors duration-500">
            BLAKRA
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className="relative font-mono text-[8px] tracking-[0.3em] uppercase transition-colors duration-500 py-1"
              style={{ color: activeSection === item.id ? 'hsla(186,100%,50%,0.7)' : 'rgba(255,255,255,0.18)' }}
            >
              {item.label}
              {activeSection === item.id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-[1px]"
                  style={{ background: 'hsla(186,100%,50%,0.4)' }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <button
            onClick={() => go('contact')}
            className="hidden md:block font-mono text-[8px] tracking-[0.3em] uppercase text-foreground/25 border border-foreground/6 hover:border-primary/40 hover:text-primary transition-all duration-500 px-4 py-2 magnetic-target"
          >
            Connect
          </button>
          <button onClick={() => setOpen(!open)} className="flex flex-col gap-[5px] lg:hidden p-1">
            <motion.div animate={{ rotate: open ? 45 : 0, y: open ? 7 : 0 }} transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }} className="w-5 h-[1px] bg-foreground/50" />
            <motion.div animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.15 }} className="w-5 h-[1px] bg-foreground/50" />
            <motion.div animate={{ rotate: open ? -45 : 0, y: open ? -7 : 0 }} transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }} className="w-5 h-[1px] bg-foreground/50" />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
            className="fixed inset-0 z-40 flex flex-col items-start justify-center px-12"
            style={{ background: 'rgba(5,5,7,0.97)', backdropFilter: 'blur(40px)' }}
          >
            {NAV.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16,1,0.3,1] }}
                onClick={() => go(item.id)}
                className="font-grotesk text-3xl font-bold tracking-tight text-foreground/20 hover:text-primary py-4 transition-colors duration-400"
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}