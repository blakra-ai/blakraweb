import React from 'react';
import { motion } from 'framer-motion';

export default function SceneFooter() {
  return (
    <footer className="relative border-t border-white/[0.04] py-12 px-[max(32px,6vw)]"
      style={{ background: '#040404' }}>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <span className="font-grotesk text-xl font-bold tracking-[0.4em] uppercase text-white/20">
            BLAKRA
          </span>
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-white/10 mt-1.5">
            Black Hole × Chakra — Digital Consciousness Engineered
          </p>
        </div>

        <div className="flex flex-wrap gap-6 md:gap-10">
          {[
            { label: 'Philosophy', id: 'philosophy' },
            { label: 'Capabilities', id: 'services' },
            { label: 'Work', id: 'projects' },
            { label: 'Stack', id: 'stack' },
            { label: 'Team', id: 'team' },
            { label: 'Timeline', id: 'timeline' },
            { label: 'Lab', id: 'lab' },
            { label: 'Contact', id: 'contact' },
          ].map(({ label, id }) => (
            <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className="font-mono text-[8px] tracking-[0.2em] uppercase text-white/15 hover:text-white/40 transition-colors duration-300">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="font-mono text-[8px] tracking-[0.15em] text-white/10">
          © 2025 BLAKRA. All systems reserved.
        </span>
        <div className="flex items-center gap-2">
          {[265, 190, 285, 220].map((hue) => (
            <div key={hue} className="w-1 h-1 rounded-full" style={{ background: `hsla(${hue},70%,60%,0.3)` }} />
          ))}
        </div>
      </div>
    </footer>
  );
}