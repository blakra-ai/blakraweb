import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Philosophy', id: 'philosophy' },
  { label: 'Systems', id: 'services' },
  { label: 'Universe', id: 'universe' },
  { label: 'Projects', id: 'projects' },
  { label: 'Lab', id: 'lab' },
  { label: 'Trust', id: 'trust' },
  { label: 'Timeline', id: 'timeline' },
  { label: 'Contact', id: 'contact' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled ? 'glass-dark py-3' : 'py-6'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="relative group">
            <span className="font-space text-xl md:text-2xl font-bold tracking-[0.3em] text-foreground group-hover:text-glow-violet transition-all duration-500">
              BLAKRA
            </span>
            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-500" />
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="relative group"
              >
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {item.label}
                </span>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => scrollTo('contact')}
              className="hidden md:block font-mono text-[11px] tracking-[0.15em] uppercase px-5 py-2.5 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-500 rounded-sm"
            >
              Initiate
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-2"
            >
              <motion.span
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
                className="block w-6 h-[1px] bg-foreground"
              />
              <motion.span
                animate={{ opacity: menuOpen ? 0 : 1 }}
                className="block w-6 h-[1px] bg-foreground"
              />
              <motion.span
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
                className="block w-6 h-[1px] bg-foreground"
              />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            {navItems.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(item.id)}
                className="font-space text-2xl tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
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