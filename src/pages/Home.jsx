import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CursorSystem from '../components/blakra/CursorSystem';
import GlobalNav from '../components/blakra/GlobalNav';
import HeroSection from '../components/blakra/HeroSection';
import PhilosophySection from '../components/blakra/PhilosophySection';
import ServicesSection from '../components/blakra/ServicesSection';
import ProjectsSection from '../components/blakra/ProjectsSection';
import EngStackSection from '../components/blakra/EngStackSection';
import TeamSection from '../components/blakra/TeamSection';
import TrustSection from '../components/blakra/TrustSection';
import TimelineSection from '../components/blakra/TimelineSection';
import LabSection from '../components/blakra/LabSection';
import ContactSection from '../components/blakra/ContactSection';
import Footer from '../components/blakra/Footer';

/* Boot sequence */
const BOOT_LINES = [
  'BLAKRA ENTERPRISE SYSTEMS v2.1.0 :: INITIALIZED',
  'Security clearance verified :: AUTHORIZED',
  'Loading operational framework... 100%',
  'Enterprise integration layer... ACTIVE',
  'Client deployment infrastructure... READY',
  'System monitoring dashboard... ONLINE',
  'BLAKRA CORE SYSTEMS READY',
];

function BootScene({ onComplete }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => {
        if (!cancelled) setLineIdx(i + 1);
      }, 300 + i * 260));
    });

    const start = Date.now();
    const dur = 2200;
    let raf;
    const tick = () => {
      if (cancelled) return;
      const p = Math.min(100, ((Date.now() - start) / dur) * 100);
      setProgress(Math.round(p));
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    timers.push(setTimeout(() => { if (!cancelled) { setDone(true); onComplete(); } }, 2800));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []); // eslint-disable-line

  if (done) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] flex flex-col justify-end p-8 md:p-16"
      style={{ background: '#050507' }}
    >
      <div className="max-w-2xl space-y-1 mb-12">
        {BOOT_LINES.slice(0, lineIdx).map((line, i) => (
          <div key={i} className="font-mono text-[10px] md:text-xs leading-6 tracking-wider"
            style={{ color: i >= lineIdx - 1 ? 'hsla(186,100%,50%,0.7)' : 'rgba(255,255,255,0.12)' }}>
            {line}{i === lineIdx - 1 && <span className="blink ml-1">_</span>}
          </div>
        ))}
      </div>
      <div className="max-w-sm">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[8px] tracking-[0.3em] text-foreground/12 uppercase">Initializing</span>
          <span className="font-mono text-[8px] text-primary/50">{progress}%</span>
        </div>
        <div className="h-[1px] bg-white/[0.04] w-full relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 h-full bg-primary/40 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [booted, setBooted] = useState(false);
  const onBootComplete = useCallback(() => setBooted(true), []);

  return (
    <div className="relative" style={{ background: '#050507' }}>
      {/* Cursor elements */}
      <div id="cursor-dot" />
      <div id="cursor-ring" />
      <CursorSystem />

      {/* Boot */}
      {!booted && <BootScene onComplete={onBootComplete} />}

      {/* Main site — scene-by-scene */}
      <GlobalNav />
      <HeroSection />
      <PhilosophySection />
      <ServicesSection />
      <ProjectsSection />
      <TrustSection />
      <EngStackSection />
      <TeamSection />
      <TimelineSection />
      <LabSection />
      <ContactSection />
      <Footer />
    </div>
  );
}