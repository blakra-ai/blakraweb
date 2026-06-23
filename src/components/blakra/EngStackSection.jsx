import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const LAYERS = [
  { label: 'Intelligence Layer', code: 'L1', items: ['Custom LLMs & fine-tuning', 'Multi-modal reasoning', 'Reinforcement learning', 'Model evaluation & alignment'], hue: 186 },
  { label: 'Orchestration Layer', code: 'L2', items: ['Multi-agent frameworks', 'Workflow state machines', 'Event-driven pipelines', 'Real-time decision routing'], hue: 42 },
  { label: 'Data Layer', code: 'L3', items: ['Stream processing at scale', 'Vector & relational stores', 'Feature engineering pipelines', 'Data quality enforcement'], hue: 186 },
  { label: 'Infrastructure Layer', code: 'L4', items: ['Multi-cloud Kubernetes', 'GPU cluster management', 'Edge deployment', 'CI/CD for AI systems'], hue: 42 },
];

const PRINCIPLES = [
  { num: '01', title: 'Systems over features', body: 'We design for emergent behavior, not feature lists. Every component is architected for the system it belongs to.' },
  { num: '02', title: 'Explainability by default', body: 'AI systems must be auditable. We instrument every decision point so humans retain meaningful oversight.' },
  { num: '03', title: 'Fail-safe, not fail-proof', body: 'Complex systems fail. We design degradation paths, human escalation protocols, and recovery mechanisms from the first line of code.' },
  { num: '04', title: 'Latency as a constraint', body: 'Real-time is a product requirement, not a luxury. We design for operational latency bounds before architectural choices.' },
];

function DataFlowDiagram({ isInView }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0, raf;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();

    const nodes = [
      { x: 0.1, y: 0.5, label: 'DATA IN', hue: 186 },
      { x: 0.3, y: 0.2, label: 'PROCESS', hue: 42 },
      { x: 0.3, y: 0.8, label: 'ENRICH', hue: 186 },
      { x: 0.55, y: 0.5, label: 'REASON', hue: 186 },
      { x: 0.78, y: 0.25, label: 'ACT', hue: 42 },
      { x: 0.78, y: 0.75, label: 'LEARN', hue: 186 },
      { x: 0.95, y: 0.5, label: 'OUTPUT', hue: 42 },
    ];

    const edges = [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[5,1],[4,6],[5,6]];

    const draw = () => {
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw edges with animated pulses
      edges.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const x1 = na.x * W, y1 = na.y * H;
        const x2 = nb.x * W, y2 = nb.y * H;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Multiple pulse dots per edge
        for (let p = 0; p < 2; p++) {
          const progress = (t * 0.35 + (a + b) * 0.25 + p * 0.5) % 1;
          const px = x1 + (x2 - x1) * progress;
          const py = y1 + (y2 - y1) * progress;
          const hue = na.hue;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 5);
          pg.addColorStop(0, `hsla(${hue},100%,65%,0.9)`);
          pg.addColorStop(1, 'transparent');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach((n) => {
        const nx = n.x * W, ny = n.y * H;
        const pulse = 1 + Math.sin(t * 1.2 + n.x * 12) * 0.1;
        const r = 20 * pulse;

        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        g.addColorStop(0, `hsla(${n.hue},100%,50%,0.15)`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue},100%,60%,0.85)`;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(nx, ny, 8, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${n.hue},100%,60%,0.15)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.font = `${Math.max(7, 8 * (W / 500))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `hsla(${n.hue},60%,65%,0.4)`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, nx, ny + 20);
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [isInView]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 220 }} />;
}

function LayerCard({ layer, i, isInView }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.5 + i * 0.1, duration: 0.9 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-5 relative overflow-hidden group"
      style={{
        borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
      }}
    >
      {/* Hover activation */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 0.05 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ background: `radial-gradient(circle at 50% 50%, hsla(${layer.hue},100%,50%,1), transparent 70%)` }}
      />

      <div className="flex items-center gap-2.5 mb-3 relative z-10">
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          animate={{
            background: hovered ? `hsl(${layer.hue},100%,50%)` : `hsla(${layer.hue},100%,50%,0.5)`,
            boxShadow: hovered ? `0 0 8px hsla(${layer.hue},100%,50%,0.5)` : 'none',
          }}
          transition={{ duration: 0.3 }}
        />
        <span className="font-mono text-[7px] tracking-[0.25em] uppercase"
          style={{ color: `hsla(${layer.hue},100%,50%,0.5)` }}>{layer.code}</span>
        <span className="font-mono text-[7px] tracking-[0.1em] uppercase text-foreground/18">{layer.label}</span>
      </div>
      <ul className="space-y-1.5 relative z-10">
        {layer.items.map((item) => (
          <li key={item} className="font-inter font-light text-[12px] text-foreground/20 flex items-center gap-2">
            <div className="w-0.5 h-0.5 rounded-full bg-foreground/12 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function EngStackSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="stack" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-16">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Engineering Architecture</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-0">
          <motion.div className="lg:w-[44%] lg:pr-14">
            <div className="overflow-hidden mb-2">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(30px,4.5vw,66px)] font-bold tracking-[-0.04em] leading-[0.92] text-foreground">
                How we think
              </motion.h2>
            </div>
            <div className="overflow-hidden mb-12">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ delay: 0.06, duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(30px,4.5vw,66px)] font-bold tracking-[-0.04em] leading-[0.92] italic font-light text-foreground/8">
                about systems.
              </motion.h2>
            </div>

            <div className="space-y-0">
              {PRINCIPLES.map((p, i) => (
                <motion.div key={p.num}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.9 }}
                  className="py-6 border-b border-foreground/[0.04] group"
                >
                  <div className="flex gap-5">
                    <span className="font-mono text-[7px] tracking-[0.2em] text-foreground/8 mt-1 flex-shrink-0">{p.num}</span>
                    <div>
                      <h4 className="font-grotesk text-sm font-semibold text-foreground/50 mb-2 group-hover:text-foreground/70 transition-colors duration-500">{p.title}</h4>
                      <p className="font-inter font-light text-[13px] text-foreground/20 leading-[1.85]">{p.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="lg:w-[56%] lg:pl-14 relative">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px] bg-foreground/[0.04]" />

            <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.35, duration: 1 }}
              className="mb-8 p-4 relative overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-[7px] tracking-[0.3em] text-foreground/10 uppercase">Data Flow Architecture</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-primary/50 animate-pulse" />
                  <span className="font-mono text-[5px] text-primary/35">LIVE</span>
                </div>
              </div>
              <DataFlowDiagram isInView={isInView} />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {LAYERS.map((layer, i) => (
                <LayerCard key={layer.code} layer={layer} i={i} isInView={isInView} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}