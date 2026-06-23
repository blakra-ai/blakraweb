import React, { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion';

const TEAM = [
  {
    id: 'ceo',
    name: 'Aryan Mehta',
    role: 'Chief Executive Officer',
    code: 'TEAM.01',
    domain: 'Strategy · Enterprise Architecture',
    bio: 'Former engineering lead at two unicorns. Architect of systems processing $40B in annual transactions. Believes that the most powerful AI systems are built at the intersection of rigorous engineering and deep domain knowledge.',
    expertise: ['System Design', 'Enterprise AI', 'M&A Technical Due Diligence'],
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop',
    hue: 265,
  },
  {
    id: 'cto',
    name: 'Lena Vasquez',
    role: 'Chief Technology Officer',
    code: 'TEAM.02',
    domain: 'AI Research · Infrastructure',
    bio: 'PhD in Distributed Systems from MIT. Led AI infrastructure at scale for 200M+ daily active users. Designed the fault-tolerant neural serving infrastructure underpinning three Fortune 500 deployments.',
    expertise: ['Large-Scale ML', 'Distributed Systems', 'Model Optimization'],
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop',
    hue: 190,
  },
  {
    id: 'cro',
    name: 'Marcus Chen',
    role: 'Head of Engineering',
    code: 'TEAM.03',
    domain: 'Platform · DevOps · Security',
    bio: 'Built and scaled engineering teams from 3 to 120. Deep expertise in zero-trust platform architecture and compliance engineering for regulated industries including finance and healthcare.',
    expertise: ['Platform Engineering', 'Zero-Trust Security', 'Compliance Infra'],
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop',
    hue: 285,
  },
  {
    id: 'cds',
    name: 'Priya Nair',
    role: 'Director of AI Research',
    code: 'TEAM.04',
    domain: 'LLMs · Neuro-Symbolic AI',
    bio: 'Published researcher in reasoning and grounding for language models. Leads BLAKRA\'s R&D function — bridging academic frontier research with production-grade deployment realities.',
    expertise: ['Reasoning Models', 'RLHF', 'Neuro-Symbolic Systems'],
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop',
    hue: 220,
  },
];

function PersonCard({ person, isActive, onClick, index, isInView }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.12, duration: 1, ease: [0.16,1,0.3,1] }}
      onClick={onClick}
      className="group text-left w-full relative"
    >
      {/* Portrait */}
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '3/4' }}>
        <img
          src={person.img}
          alt={person.name}
          className="w-full h-full object-cover transition-all duration-1000"
          style={{
            filter: isActive ? 'grayscale(0%) brightness(1)' : 'grayscale(85%) brightness(0.55)',
            transform: isActive ? 'scale(1.04)' : 'scale(1)',
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `linear-gradient(to top, rgba(4,4,4,0.95) 0%, rgba(4,4,4,0.3) 50%, rgba(4,4,4,0.1) 100%)`,
          }} />
        {/* Active color wash */}
        <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, hsla(${person.hue},80%,65%,0.12) 0%, transparent 60%)`,
            opacity: isActive ? 1 : 0,
          }} />
        {/* Code tag */}
        <div className="absolute top-4 left-4 font-mono text-[8px] tracking-[0.2em] text-white/30">{person.code}</div>
        {/* Active indicator */}
        {isActive && (
          <motion.div layoutId="active-bar"
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ background: `hsl(${person.hue},80%,68%)`, boxShadow: `0 0 12px hsl(${person.hue},80%,68%)` }}
          />
        )}
      </div>

      <h3 className="font-grotesk text-lg font-bold tracking-tight mb-0.5 transition-colors duration-300"
        style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.4)' }}>
        {person.name}
      </h3>
      <p className="font-mono text-[9px] tracking-[0.15em] uppercase transition-colors duration-300"
        style={{ color: isActive ? `hsla(${person.hue},70%,65%,0.7)` : 'rgba(255,255,255,0.2)' }}>
        {person.role}
      </p>
    </motion.button>
  );
}

export default function TeamScene() {
  const [active, setActive] = useState('ceo');
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);

  const person = TEAM.find(p => p.id === active);

  return (
    <section
      id="team"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#060406', minHeight: '100vh' }}
    >
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #040507, transparent)' }} />

      {/* Ghost type — deep layer */}
      <motion.div style={{ y: bgY }}
        className="absolute left-[-4%] bottom-[5%] font-grotesk font-bold text-white/[0.012] leading-none select-none pointer-events-none"
        style={{ fontSize: '20vw', letterSpacing: '-0.05em', y: bgY }}>
        PEOPLE
      </motion.div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16">
          <div className="w-4 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">The People</span>
        </motion.div>

        <div className="overflow-hidden mb-20">
          <motion.h2
            initial={{ y: '110%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(36px,7vw,110px)] font-bold tracking-[-0.05em] leading-none text-white"
          >
            Intelligence<br />
            <span className="italic font-light" style={{ color: 'rgba(255,255,255,0.1)' }}>is Human.</span>
          </motion.h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-0">
          {/* Left — portrait grid */}
          <div className="lg:w-[55%] grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5 lg:pr-16">
            {TEAM.map((p, i) => (
              <PersonCard key={p.id} person={p} isActive={active === p.id}
                onClick={() => setActive(p.id)} index={i} isInView={isInView} />
            ))}
          </div>

          {/* Right — bio panel */}
          <div className="lg:w-[45%] relative">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px]"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="lg:pl-12">
              <AnimatePresence mode="wait">
                {person && (
                  <motion.div key={person.id}
                    initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                    transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
                    className="pt-2"
                  >
                    <div className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: `hsla(${person.hue},80%,68%,0.5)` }}>
                      {person.code} — {person.domain}
                    </div>
                    <h3 className="font-grotesk text-3xl md:text-4xl font-bold text-white tracking-tight mb-1"
                      style={{ textShadow: `0 0 40px hsla(${person.hue},80%,68%,0.2)` }}>
                      {person.name}
                    </h3>
                    <p className="font-grotesk text-sm mb-8"
                      style={{ color: `hsla(${person.hue},50%,65%,0.55)` }}>
                      {person.role}
                    </p>

                    {/* Energy separator */}
                    <div className="relative h-[1px] w-12 mb-8">
                      <div className="absolute inset-0" style={{ background: `hsl(${person.hue},80%,68%,0.3)` }} />
                      <div className="absolute inset-0 blur-sm" style={{ background: `hsl(${person.hue},80%,68%)` }} />
                    </div>

                    <p className="font-inter font-light text-sm md:text-[15px] leading-[1.9] mb-10"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {person.bio}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {person.expertise.map((ex) => (
                        <span key={ex} className="font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1"
                          style={{
                            border: `1px solid hsla(${person.hue},60%,60%,0.15)`,
                            color: `hsla(${person.hue},60%,65%,0.5)`,
                          }}>
                          {ex}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}