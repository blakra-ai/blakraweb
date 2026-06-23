import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const nodes = [
  { label: 'Neural Core', x: 50, y: 40, size: 60, category: 'ai' },
  { label: 'Quantum Engine', x: 25, y: 25, size: 45, category: 'compute' },
  { label: 'Data Nexus', x: 72, y: 30, size: 50, category: 'data' },
  { label: 'Robo Cortex', x: 35, y: 65, size: 42, category: 'robotics' },
  { label: 'Auto Mesh', x: 68, y: 62, size: 48, category: 'automation' },
  { label: 'Vision Lab', x: 15, y: 50, size: 38, category: 'ai' },
  { label: 'Edge Cloud', x: 82, y: 48, size: 40, category: 'compute' },
  { label: 'Synth Net', x: 45, y: 78, size: 36, category: 'data' },
  { label: 'Bio Link', x: 58, y: 18, size: 34, category: 'robotics' },
  { label: 'Holo Grid', x: 20, y: 80, size: 32, category: 'automation' },
];

const connections = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 6], [5, 9], [7, 9], [1, 8], [2, 8],
];

const categoryColors = {
  ai: 'from-primary to-plasma-purple',
  compute: 'from-electric-blue to-accent',
  data: 'from-accent to-chakra-cyan',
  robotics: 'from-primary to-crimson-energy',
  automation: 'from-plasma-purple to-electric-blue',
};

const categoryBorders = {
  ai: 'border-primary/30 hover:border-primary/60',
  compute: 'border-electric-blue/30 hover:border-electric-blue/60',
  data: 'border-accent/30 hover:border-accent/60',
  robotics: 'border-primary/30 hover:border-crimson-energy/60',
  automation: 'border-plasma-purple/30 hover:border-plasma-purple/60',
};

export default function UniverseSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      setOffset({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <section id="universe" className="relative py-32 md:py-48 overflow-hidden">
      <div ref={ref} className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="mb-6"
        >
          <span className="font-mono text-[10px] tracking-[0.5em] uppercase text-primary/60">
            003 — Universe
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="font-space text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
        >
          Technology
          <br />
          <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Universe
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-muted-foreground text-sm md:text-base max-w-xl mb-16"
        >
          Explore our interconnected ecosystem of technologies. Each node represents a specialized system — together they form a living neural galaxy.
        </motion.p>

        {/* Interactive universe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.6, duration: 1 }}
          className="relative w-full aspect-[16/10] rounded-sm glass-panel overflow-hidden"
        >
          {/* Grid background */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full" style={{ transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.3}px)` }}>
            {connections.map(([a, b], i) => {
              const na = nodes[a];
              const nb = nodes[b];
              const isHighlighted = hoveredNode === a || hoveredNode === b;
              return (
                <motion.line
                  key={i}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: isHighlighted ? 0.4 : 0.08 } : {}}
                  transition={{ delay: 1 + i * 0.05, duration: 0.8 }}
                  x1={`${na.x}%`} y1={`${na.y}%`}
                  x2={`${nb.x}%`} y2={`${nb.y}%`}
                  stroke={isHighlighted ? 'hsl(270 80% 60%)' : 'hsl(0 0% 50%)'}
                  strokeWidth={isHighlighted ? 1.5 : 0.5}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.8 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setHoveredNode(i)}
              onMouseLeave={() => setHoveredNode(null)}
              className="absolute cursor-pointer group"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: `translate(-50%, -50%) translate(${offset.x * (0.2 + i * 0.05)}px, ${offset.y * (0.2 + i * 0.05)}px)`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              {/* Glow ring */}
              <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${categoryColors[node.category]} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
                style={{ width: node.size * 2, height: node.size * 2, left: -node.size / 2, top: -node.size / 2 }}
              />

              {/* Node circle */}
              <div
                className={`relative rounded-full border ${categoryBorders[node.category]} bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all duration-500 group-hover:scale-110`}
                style={{ width: node.size, height: node.size }}
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${categoryColors[node.category]}`} />
              </div>

              {/* Label */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap transition-opacity duration-300 ${
                hoveredNode === i ? 'opacity-100' : 'opacity-50'
              }`}>
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                  {node.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}