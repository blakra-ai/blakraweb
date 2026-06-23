import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <footer ref={ref} className="relative border-t border-foreground/[0.03] py-16 px-[max(32px,6vw)]" style={{ background: '#050507' }}>
      {/* Subtle ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsla(186,100%,50%,0.01), transparent 60%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <div>
            <span className="font-grotesk text-xl font-bold tracking-[0.5em] uppercase text-foreground/12">BLAKRA</span>
            <p className="font-mono text-[7px] tracking-[0.4em] uppercase text-foreground/6 mt-2">Black Hole × Chakra — Digital Consciousness Engineered</p>
          </div>
          <div className="flex flex-wrap gap-6 md:gap-10">
            {['philosophy','services','projects','lab','contact'].map((id) => (
              <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                className="font-mono text-[7px] tracking-[0.2em] uppercase text-foreground/10 hover:text-foreground/30 transition-colors duration-500">
                {id}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-foreground/[0.03] flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono text-[7px] tracking-[0.15em] text-foreground/6">© 2025 BLAKRA. All systems reserved.</span>
          <div className="flex items-center gap-3">
            {[186, 42, 200, 186].map((hue, i) => (
              <div key={i} className="w-1 h-1 rounded-full animate-pulse" style={{ background: `hsla(${hue},100%,50%,0.25)`, animationDelay: `${i * 0.5}s` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </footer>
  );
}