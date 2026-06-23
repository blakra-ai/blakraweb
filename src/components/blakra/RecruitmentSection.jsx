import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, Sparkles, ArrowRight } from 'lucide-react';

const roles = [
  { title: 'AI Research Scientist', team: 'Intelligence Division', type: 'Full-time' },
  { title: 'Robotics Engineer', team: 'Autonomous Systems', type: 'Full-time' },
  { title: 'Full-Stack Architect', team: 'Platform Engineering', type: 'Full-time' },
  { title: 'Neural Interface Designer', team: 'NeuroTech Lab', type: 'Full-time' },
];

export default function RecruitmentSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-32 md:py-48 overflow-hidden">
      <div className="absolute inset-0 gradient-radial-dark" />

      <div ref={ref} className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Emotional CTA block */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-6" />
          <h2 className="font-space text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            The Future Is
            <br />
            <span className="bg-gradient-to-r from-primary via-plasma-purple to-accent bg-clip-text text-transparent">
              Looking For You
            </span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            We don't hire employees. We recruit architects of tomorrow.
            If you're driven by the impossible and energized by the unknown,
            your frequency matches ours.
          </p>
        </motion.div>

        {/* Open roles */}
        <div className="max-w-3xl mx-auto space-y-3">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
              className="group flex items-center justify-between p-5 glass-panel rounded-sm hover:border-primary/20 transition-all duration-500 cursor-pointer"
            >
              <div>
                <h3 className="font-space text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {role.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground/60 uppercase">
                    {role.team}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground/60 uppercase">
                    {role.type}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </motion.div>
          ))}
        </div>

        {/* View all CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center mt-12"
        >
          <button className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase text-primary hover:text-foreground transition-colors duration-300">
            <Rocket className="w-4 h-4" />
            View All Open Positions
          </button>
        </motion.div>
      </div>
    </section>
  );
}