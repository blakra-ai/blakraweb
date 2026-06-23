import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const TEAM = [
  {
    id: 'hamid', name: 'Hamid Reza Alizadeh (Ashen)', role: 'Founder & Chief Technology Officer',
    initials: 'AS', 
    expertise: 'Full-stack development, system architecture, cross-platform applications, AI tooling',
    bio: 'Bridge between ideas and implementation. Experienced across backend systems, desktop (Windows), mobile (Android/iOS), web, and cloud infrastructure. Leads product architecture and core engineering.',
    years: '15+ years in software engineering', hue: 186,
  },
  {
    id: 'habib', name: 'Habiburahman Karokhi', role: 'AI & Research Lead',
    initials: 'HK',
    expertise: 'Machine learning, open-source contributions, applied research',
    bio: 'Longtime collaborator who moved to the US and co-founded the company with Hamid. Focuses on practical AI solutions and reliable model deployment, emphasizing reproducibility and safety.',
    years: '10+ years in ML & AI engineering', hue: 42,
  },
  {
    id: 'mehdi', name: 'Mehdi Jantpor', role: 'Head of Engineering',
    initials: 'MJ',
    expertise: 'Scalable systems, backend engineering, performance',
    bio: 'A pragmatic engineer with deep experience building production systems. Joined early to help take prototypes into reliable, maintainable products for enterprise clients.',
    years: '12+ years in software engineering', hue: 186,
  },
];

export default function TeamSection() {
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="team" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      {/* Network visualization — subtle */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.015]" viewBox="0 0 1000 1000">
        {TEAM.map((_, i) => {
          const y = 120 + i * 140;
          return TEAM.slice(i + 1).map((_, j) => {
            const y2 = 120 + (i + j + 1) * 140;
            return (
              <line key={`${i}-${j}`}
                x1={200 + Math.sin(i) * 100} y1={y}
                x2={200 + Math.sin(i + j + 1) * 100} y2={y2}
                stroke="hsl(186,100%,50%)" strokeWidth="0.5" />
            );
          });
        })}
      </svg>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-16">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Intelligence Nodes</span>
        </motion.div>

        <div className="overflow-hidden mb-16">
          <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(30px,5.5vw,82px)] font-bold tracking-[-0.04em] leading-none text-foreground">
            The engineers, researchers
            <span className="ml-4 italic font-light text-foreground/8">and architects</span>
            <br />
            <span className="text-primary text-glow-teal">who make it real.</span>
          </motion.h2>
        </div>

        <div className="space-y-0">
          {TEAM.map((member, i) => (
            <motion.div key={member.id}
              initial={{ opacity: 0, x: -28 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.09, duration: 1 }}
              onMouseEnter={() => setHovered(member.id)}
              onMouseLeave={() => setHovered(null)}
              className="group relative py-9 border-b border-foreground/[0.04] cursor-default overflow-hidden"
            >
              {/* Hover gradient */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: hovered === member.id ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                style={{ background: `linear-gradient(to right, hsla(${member.hue},100%,50%,0.025), transparent 50%)` }}
              />

              <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-0">
                <div className="md:w-[28%] flex items-start gap-4">
                  {/* Avatar */}
                  <motion.div
                    className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 font-grotesk font-semibold text-sm"
                    style={{
                      background: hovered === member.id ? `hsla(${member.hue},100%,50%,0.15)` : `hsla(${member.hue},100%,50%,0.08)`,
                      border: `1px solid hsla(${member.hue},100%,50%,0.2)`,
                      color: `hsl(${member.hue},100%,50%)`,
                    }}
                    animate={{
                      boxShadow: hovered === member.id ? `0 0 16px hsla(${member.hue},100%,50%,0.3)` : 'none',
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {member.initials}
                  </motion.div>
                  <div>
                    <h3 className="font-grotesk text-lg font-semibold tracking-tight transition-colors duration-500"
                      style={{ color: hovered === member.id ? 'white' : 'rgba(255,255,255,0.4)' }}>
                      {member.name}
                    </h3>
                    <p className="font-mono text-[7px] tracking-[0.2em] uppercase mt-1 transition-colors duration-500"
                      style={{ color: hovered === member.id ? `hsla(${member.hue},100%,50%,0.5)` : 'rgba(255,255,255,0.12)' }}>
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="md:w-[24%] md:px-6">
                  <p className="font-inter font-light text-[12px] text-foreground/20 leading-relaxed">{member.expertise}</p>
                </div>

                <div className="md:w-[38%] md:pr-8">
                  <AnimatePresence mode="wait">
                    {hovered === member.id ? (
                      <motion.p
                        key="bio"
                        initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, filter: 'blur(3px)' }}
                        transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
                        className="font-inter font-light text-[13px] text-foreground/26 leading-[1.85]"
                      >
                        {member.bio}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="years"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-[8px] tracking-[0.1em] text-foreground/10"
                      >
                        {member.years}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="hidden md:block md:w-[10%] text-right">
                  <span className="font-mono text-[7px] tracking-[0.2em] text-foreground/6 transition-colors duration-500 group-hover:text-foreground/18">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Animated bottom accent */}
              <motion.div className="absolute bottom-0 left-0 h-[1px]"
                animate={{ width: hovered === member.id ? '100%' : '0%' }}
                transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}
                style={{ background: `linear-gradient(to right, hsla(${member.hue},100%,50%,0.3), transparent)` }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}