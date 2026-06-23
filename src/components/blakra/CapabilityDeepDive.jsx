import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* Architecture diagram nodes per capability */
const ARCH = {
  'ai-dev': {
    title: 'AI Systems Architecture',
    layers: [
      { label: 'Data Ingestion', nodes: ['Raw Data Sources', 'Stream Processors', 'Quality Checks'], hue: 186 },
      { label: 'Model Layer', nodes: ['Pre-training', 'Fine-tuning Pipeline', 'RLHF / Alignment', 'Eval Framework'], hue: 42 },
      { label: 'Inference', nodes: ['Batched Serving', 'Real-time API', 'Edge Deployment'], hue: 186 },
      { label: 'Observability', nodes: ['Drift Detection', 'Latency Monitor', 'Safety Guardrails'], hue: 42 },
    ],
    metrics: [
      { label: 'Token throughput', val: '847K/s' },
      { label: 'Inference p95', val: '<8ms' },
      { label: 'Model accuracy', val: '99.4%' },
      { label: 'Alignment score', val: '0.994' },
    ],
  },
  'automation': {
    title: 'Automation Orchestration Architecture',
    layers: [
      { label: 'Trigger Layer', nodes: ['Event Bus', 'Scheduled Jobs', 'API Hooks'], hue: 42 },
      { label: 'Decision Engine', nodes: ['Rule Evaluator', 'ML Classifier', 'Priority Queue'], hue: 186 },
      { label: 'Execution', nodes: ['RPA Workers', 'AI Agents', 'Human-in-Loop'], hue: 42 },
      { label: 'Audit & Recovery', nodes: ['Exception Router', 'State Persistence', 'Rollback Logic'], hue: 186 },
    ],
    metrics: [
      { label: 'Ops reduced', val: '78%' },
      { label: 'Error rate', val: '0.03%' },
      { label: 'Mean resolution', val: '1.2s' },
      { label: 'Concurrent flows', val: '1,200+' },
    ],
  },
  'custom-software': {
    title: 'Custom Software Delivery Architecture',
    layers: [
      { label: 'Discovery', nodes: ['Problem Framing', 'System Mapping', 'Constraint Analysis'], hue: 186 },
      { label: 'Design', nodes: ['API Contracts', 'Data Models', 'Load Profiles'], hue: 42 },
      { label: 'Build', nodes: ['Core Services', 'Integration Layer', 'Test Harness'], hue: 186 },
      { label: 'Operate', nodes: ['CI/CD Pipeline', 'Observability', 'SLA Enforcement'], hue: 42 },
    ],
    metrics: [
      { label: 'Avg. delivery', val: '14 wks' },
      { label: 'Defect rate', val: '<0.8%' },
      { label: 'Test coverage', val: '94%' },
      { label: 'Uptime SLA', val: '99.97%' },
    ],
  },
  'robotics': {
    title: 'Robotics Integration Architecture',
    layers: [
      { label: 'Perception', nodes: ['Sensor Fusion', 'Point Cloud Processing', 'Vision Models'], hue: 42 },
      { label: 'Planning', nodes: ['Path Planning', 'Collision Avoidance', 'Task Sequencing'], hue: 186 },
      { label: 'Control', nodes: ['Real-time Controller', 'PLC Bridge', 'Safety Monitor'], hue: 42 },
      { label: 'Fleet Ops', nodes: ['Telemetry Ingest', 'Digital Twin', 'Predictive Maint.'], hue: 186 },
    ],
    metrics: [
      { label: 'Control loop', val: '1ms' },
      { label: 'Downtime ↓', val: '78%' },
      { label: 'Cells managed', val: '340+' },
      { label: 'Alert latency', val: '12ms' },
    ],
  },
  'data-intelligence': {
    title: 'Data Intelligence Platform Architecture',
    layers: [
      { label: 'Ingestion', nodes: ['Kafka Streams', 'Batch Loaders', 'CDC Pipelines'], hue: 186 },
      { label: 'Processing', nodes: ['Feature Eng.', 'Anomaly Detection', 'Aggregators'], hue: 42 },
      { label: 'Intelligence', nodes: ['Predictive Models', 'NLP Extraction', 'Graph Reasoning'], hue: 186 },
      { label: 'Delivery', nodes: ['Decision APIs', 'BI Dashboards', 'Alert Engine'], hue: 42 },
    ],
    metrics: [
      { label: 'Daily events', val: '340M+' },
      { label: 'Ingest latency', val: '<50ms' },
      { label: 'Model refresh', val: 'Real-time' },
      { label: 'Accuracy gain', val: '+34%' },
    ],
  },
  'enterprise-arch': {
    title: 'Enterprise Architecture Layers',
    layers: [
      { label: 'Assessment', nodes: ['Tech Debt Audit', 'Dependency Map', 'Risk Profile'], hue: 42 },
      { label: 'Strategy', nodes: ['Migration Roadmap', 'Platform Selection', 'CapEx Model'], hue: 186 },
      { label: 'Migration', nodes: ['Strangler Pattern', 'Data Migration', 'Zero-downtime Cut'], hue: 42 },
      { label: 'Operations', nodes: ['Governance Model', 'Security Posture', 'Cost Optimization'], hue: 186 },
    ],
    metrics: [
      { label: 'Migration time', val: '6-18mo' },
      { label: 'Tech debt ↓', val: '72%' },
      { label: 'Cost savings', val: '38% avg' },
      { label: 'MTTR ↓', val: '64%' },
    ],
  },
};

function ArchDiagram({ arch, hue }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = canvas.offsetHeight || 200;
    let t = 0, raf;

    const draw = () => {
      t += 0.018;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const L = arch.layers.length;
      const colW = W / L;

      arch.layers.forEach((layer, li) => {
        const cx = colW * li + colW / 2;
        if (!layer || !layer.nodes) return;
        /* Column header */
        ctx.font = '7px monospace';
        ctx.fillStyle = `hsla(${layer.hue},80%,60%,0.45)`;
        ctx.textAlign = 'center';
        ctx.fillText(layer.label.toUpperCase(), cx, 20);

        layer.nodes.forEach((node, ni) => {
          const ny = 48 + ni * (H * 0.7 / layer.nodes.length);
          const bw = colW * 0.78, bh = 22;
          const bx = cx - bw / 2, by = ny - bh / 2;
          const scan = ((t * 0.5 + li * 0.3 + ni * 0.2) % 1) * bw;
          ctx.beginPath();
          ctx.rect(bx, by, bw, bh);
          ctx.strokeStyle = `hsla(${layer.hue},70%,55%,0.12)`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bx + scan, by); ctx.lineTo(bx + scan, by + bh);
          ctx.strokeStyle = `hsla(${layer.hue},100%,65%,0.25)`; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.font = '6px monospace';
          ctx.fillStyle = `hsla(0,0%,100%,0.22)`;
          ctx.fillText(node, cx, ny + 3);
          if (Math.sin(t * 1.2 + ni * 1.7 + li * 2.1) > 0.5) {
            ctx.beginPath(); ctx.arc(bx + 6, ny, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${layer.hue},100%,65%,0.7)`; ctx.fill();
          }
        });

        if (li < L - 1 && arch.layers[li + 1]) {
          const nextCx = colW * (li + 1) + colW / 2;
          layer.nodes.forEach((_, ni) => {
            const ny = 48 + ni * (H * 0.7 / layer.nodes.length);
            arch.layers[li + 1].nodes.forEach((_n, nni) => {
              if (Math.abs(nni - ni) > 1) return;
              const ny2 = 48 + nni * (H * 0.7 / arch.layers[li + 1].nodes.length);
              ctx.beginPath();
              ctx.moveTo(cx + colW * 0.39, ny);
              ctx.lineTo(nextCx - colW * 0.39, ny2);
              ctx.strokeStyle = `hsla(${layer.hue},70%,55%,0.04)`;
              ctx.lineWidth = 0.4; ctx.stroke();
              const prog = (t * 0.4 + li * 0.3 + ni * 0.15 + nni * 0.08) % 1;
              const ppx = (cx + colW * 0.39) + ((nextCx - colW * 0.39) - (cx + colW * 0.39)) * prog;
              const ppy = ny + (ny2 - ny) * prog;
              ctx.beginPath(); ctx.arc(ppx, ppy, 1.2, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${layer.hue},100%,70%,0.55)`; ctx.fill();
            });
          });
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [arch, hue]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

export default function CapabilityDeepDive({ cap, onClose }) {
  const arch = ARCH[cap.id] || ARCH['ai-dev'];
  const overlayRef = useRef(null);

  /* Lock scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(3,3,5,0.97)', backdropFilter: 'blur(40px)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 30%, hsla(${cap.hue},100%,50%,0.04) 0%, transparent 70%)` }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Header bar */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.16,1,0.3,1] }}
        className="flex items-center justify-between px-8 md:px-14 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-5">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: `hsl(${cap.hue},100%,50%)`, boxShadow: `0 0 10px hsl(${cap.hue},100%,50%)` }} />
          <span className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: `hsla(${cap.hue},100%,50%,0.5)` }}>
            CAPABILITY {cap.code} :: DEEP DIVE
          </span>
        </div>
        <button
          onClick={onClose}
          className="group flex items-center gap-3 magnetic-target"
        >
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-foreground/15 group-hover:text-foreground/35 transition-colors duration-400">Close</span>
          <div className="w-8 h-8 border border-foreground/8 group-hover:border-foreground/20 transition-colors duration-400 flex items-center justify-center">
            <span className="text-foreground/20 group-hover:text-foreground/45 text-sm transition-colors duration-300">✕</span>
          </div>
        </button>
      </motion.div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-8 md:px-14 py-10 flex flex-col gap-10">
        {/* Title row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.9, ease: [0.16,1,0.3,1] }}
          className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12"
        >
          <div>
            <h2 className="font-grotesk text-3xl md:text-5xl font-bold tracking-tight leading-none mb-3"
              style={{ textShadow: `0 0 80px hsla(${cap.hue},100%,50%,0.25)`, color: 'white' }}>
              {cap.name}
            </h2>
            <p className="font-inter italic text-sm" style={{ color: `hsla(${cap.hue},60%,65%,0.45)` }}>{cap.tagline}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:ml-auto md:flex-shrink-0">
            {arch.metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07, duration: 0.6 }}
                className="px-5 py-3 text-center"
                style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="font-grotesk font-bold text-xl mb-1" style={{ color: `hsla(${cap.hue},100%,55%,0.9)` }}>{m.val}</div>
                <div className="font-mono text-[6px] tracking-[0.12em] text-foreground/18 uppercase">{m.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Architecture diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 1, ease: [0.16,1,0.3,1] }}
          className="relative overflow-hidden"
          style={{ height: 240, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
        >
          <div className="absolute top-3 left-4 font-mono text-[7px] tracking-[0.3em] text-foreground/10 uppercase flex items-center gap-2 z-10">
            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: `hsl(${cap.hue},100%,50%)` }} />
            {arch.title}
          </div>
          <ArchDiagram arch={arch} hue={cap.hue} />
        </motion.div>

        {/* Layer breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-0"
          style={{ border: '1px solid rgba(255,255,255,0.04)' }}
        >
          {arch.layers.map((layer, li) => (
            <div key={layer.label} className="p-5"
              style={{ borderRight: li < arch.layers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div className="font-mono text-[7px] tracking-[0.25em] uppercase mb-3" style={{ color: `hsla(${layer.hue},100%,50%,0.4)` }}>{layer.label}</div>
              {layer.nodes.map(n => (
                <div key={n} className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: `hsla(${layer.hue},100%,55%,0.4)` }} />
                  <span className="font-inter font-light text-[11px] text-foreground/22">{n}</span>
                </div>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Full capability description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.9 }}
          className="max-w-3xl"
        >
          <p className="font-inter font-light text-[14px] md:text-[15px] text-foreground/28 leading-[2]">{cap.body}</p>
          
          {/* Real-world example */}
          {cap.example && (
            <div className="mt-8 p-5" style={{ background: `hsla(${cap.hue},100%,50%,0.04)`, border: `1px solid hsla(${cap.hue},100%,50%,0.12)` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${cap.hue},100%,50%)` }} />
                <span className="font-mono text-[7px] tracking-[0.25em] uppercase text-foreground/40">Real-world impact</span>
              </div>
              <p className="font-inter font-light text-[13px] text-foreground/35 leading-relaxed">{cap.example}</p>
            </div>
          )}
          
          <div className="mt-8 flex flex-wrap gap-3">
            {cap.specs.map(spec => (
              <div key={spec} className="flex items-center gap-2 px-4 py-2" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                <div className="w-1 h-1 rounded-full" style={{ background: `hsl(${cap.hue},100%,50%)` }} />
                <span className="font-mono text-[7px] tracking-[0.12em] text-foreground/25">{spec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}