import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import PortfolioCard from './PortfolioCard';

const PORTFOLIO_ITEMS = [
  {
    id: 'portfolio-01',
    code: 'PORT.01',
    title: 'Enterprise AI Transformation',
    category: 'AI & Automation',
    description: 'End-to-end AI infrastructure migration for Fortune 500 financial institution. Deployed cognitive RPA across 40+ business processes.',
    impact: '35%',
    impactLabel: 'efficiency gain',
    tags: ['AI', 'Enterprise', 'RPA', 'Cloud'],
    hue: 265,
    image: null,
  },
  {
    id: 'portfolio-02',
    code: 'PORT.02',
    title: 'Real-Time Market Analytics',
    category: 'Data Intelligence',
    description: 'High-frequency trading signal detection platform processing 5M+ events/sec. Achieved 92% prediction accuracy on 48-hour market movements.',
    impact: '5M+',
    impactLabel: 'events per second',
    tags: ['Data', 'Real-Time', 'Analytics'],
    hue: 190,
    image: null,
  },
  {
    id: 'portfolio-03',
    code: 'PORT.03',
    title: 'Autonomous Systems Framework',
    category: 'Robotics & IoT',
    description: 'Distributed autonomy platform for 50,000+ edge devices. Decentralized decision-making with 99.98% uptime across global network.',
    impact: '50K+',
    impactLabel: 'devices orchestrated',
    tags: ['Robotics', 'IoT', 'Distributed'],
    hue: 285,
    image: null,
  },
  {
    id: 'portfolio-04',
    code: 'PORT.04',
    title: 'Quantum-Classical Compute Bridge',
    category: 'Quantum Computing',
    description: 'Hybrid quantum-classical architecture enabling drug discovery simulations previously impossible. Compressed research cycles from 7 years to 18 months.',
    impact: '7Y→18M',
    impactLabel: 'timeline compression',
    tags: ['Quantum', 'Biotech', 'Simulation'],
    hue: 220,
    image: null,
  },
  {
    id: 'portfolio-05',
    code: 'PORT.05',
    title: 'Neural Interface Calibration',
    category: 'Neurotech',
    description: 'Sub-millisecond brain-computer interface for surgical robotics. Surgeon intent translated to robotic action faster than conscious perception.',
    impact: '<1ms',
    impactLabel: 'latency achieved',
    tags: ['Neurotech', 'Medical', 'Hardware'],
    hue: 265,
    image: null,
  },
  {
    id: 'portfolio-06',
    code: 'PORT.06',
    title: 'Autonomous Supply Chain',
    category: 'Logistics & Optimization',
    description: 'AI-driven supply chain optimization for multinational retail. Reduced inventory costs by 28% while improving fulfillment speed by 41%.',
    impact: '28%',
    impactLabel: 'cost reduction',
    tags: ['Logistics', 'Optimization', 'ML'],
    hue: 190,
    image: null,
  },
];

export default function PortfolioGallery() {
  const [selectedId, setSelectedId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' });

  // Extract unique categories
  const categories = ['All', ...new Set(PORTFOLIO_ITEMS.map(item => item.category))];

  // Filter items
  const filteredItems = filterCategory === 'All'
    ? PORTFOLIO_ITEMS
    : PORTFOLIO_ITEMS.filter(item => item.category === filterCategory);

  const selectedItem = PORTFOLIO_ITEMS.find(item => item.id === selectedId);

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#050407', minHeight: '100vh' }}
    >
      {/* Scene transition — top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #030507, transparent)' }}
      />

      {/* Ghost background text */}
      <div className="absolute right-[-8%] top-[5%] pointer-events-none select-none overflow-hidden opacity-5">
        <div className="font-grotesk font-bold leading-none"
          style={{
            fontSize: '25vw',
            letterSpacing: '-0.06em',
            color: 'rgba(255,255,255,0.1)',
          }}
        >
          PORTFOLIO
        </div>
      </div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-accent/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-accent/35">Portfolio</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.1 }}
          className="mb-20"
        >
          <h2 className="font-grotesk text-[clamp(40px,8vw,100px)] font-bold tracking-[-0.05em] leading-none text-white mb-4">
            Featured Work
          </h2>
          <p className="font-inter text-[14px] md:text-[16px] leading-relaxed max-w-2xl"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Custom engineered solutions that transformed enterprise infrastructure, accelerated AI deployment, and pushed the boundaries of what's possible.
          </p>
        </motion.div>

        {/* Filter pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap gap-3 mb-16"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded transition-all duration-500"
              style={{
                background: filterCategory === category
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${
                  filterCategory === category
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(255,255,255,0.08)'
                }`,
                color: filterCategory === category
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.4)',
              }}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Portfolio grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <AnimatePresence mode="wait">
            {filteredItems.map((item, idx) => (
              <PortfolioCard
                key={item.id}
                {...item}
                index={idx}
                isInView={isInView}
                onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Detail view — modal-like overlay */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-2xl rounded-lg overflow-hidden border backdrop-blur-md"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  background: 'rgba(5,4,7,0.8)',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="text-white/60">×</span>
                </button>

                <div className="p-6 md:p-8">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="font-mono text-[8px] tracking-[0.2em] uppercase mb-2"
                      style={{ color: `hsla(${selectedItem.hue},80%,65%,0.6)` }}
                    >
                      {selectedItem.category}
                    </div>
                    <h2 className="font-grotesk text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white">
                      {selectedItem.title}
                    </h2>
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase"
                      style={{ color: `hsla(${selectedItem.hue},80%,65%,0.5)` }}
                    >
                      {selectedItem.code}
                    </p>
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        Overview
                      </h3>
                      <p className="font-inter text-sm leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        {selectedItem.description}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        Key Metric
                      </h3>
                      <div>
                        <p className="font-grotesk font-bold leading-none tracking-[-0.02em] mb-1"
                          style={{
                            fontSize: '32px',
                            color: `hsla(${selectedItem.hue},80%,65%,0.9)`,
                            textShadow: `0 0 24px hsla(${selectedItem.hue},80%,65%,0.25)`,
                          }}
                        >
                          {selectedItem.impact}
                        </p>
                        <p className="font-mono text-[8px] tracking-[0.2em] uppercase"
                          style={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                          {selectedItem.impactLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 pt-6 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    {selectedItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[8px] tracking-[0.15em] uppercase px-3 py-1.5 rounded"
                        style={{
                          background: `hsla(${selectedItem.hue},80%,65%,0.08)`,
                          color: `hsla(${selectedItem.hue},80%,65%,0.6)`,
                          border: `1px solid hsla(${selectedItem.hue},80%,65%,0.15)`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #030507, transparent)' }}
      />
    </section>
  );
}
