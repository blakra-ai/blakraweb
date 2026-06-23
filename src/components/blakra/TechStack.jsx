import React, { useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

const LAYERS = [
  {
    id: 'inference',
    label: 'Inference Layer',
    code: 'SYS.01',
    desc: 'Custom-trained transformer architectures deployed on distributed GPU clusters. Sub-100ms inference at global scale via edge-first routing.',
    items: ['PyTorch / JAX', 'ONNX Runtime', 'TensorRT', 'vLLM', 'Triton Inference'],
    hue: 265,
  },
  {
    id: 'orchestration',
    label: 'Orchestration',
    code: 'SYS.02',
    desc: 'Multi-agent pipeline orchestration with deterministic task graphs, fault-tolerant retries, and real-time state materialization.',
    items: ['LangGraph', 'Temporal', 'Apache Airflow', 'Ray', 'Celery'],
    hue: 190,
  },
  {
    id: 'data',
    label: 'Data Infrastructure',
    code: 'SYS.03',
    desc: 'Petabyte-scale streaming and batch pipelines with lineage tracking, schema evolution, and sub-second query latency.',
    items: ['Apache Kafka', 'Spark', 'dbt', 'Snowflake', 'ClickHouse'],
    hue: 285,
  },
  {
    id: 'platform',
    label: 'Platform & Deploy',
    code: 'SYS.04',
    desc: 'Zero-downtime blue/green deployments on multi-cloud with automated rollback, observability, and compliance guardrails.',
    items: ['Kubernetes', 'Terraform', 'ArgoCD', 'Prometheus', 'OpenTelemetry'],
    hue: 220,
  },
];

const ARCH_NODES = [
  { label: 'Client', x: '5%',  y: '50%', size: 'sm' },
  { label: 'API GW', x: '22%', y: '50%', size: 'sm' },
  { label: 'Orchestrator', x: '40%', y: '30%', size: 'lg' },
  { label: 'Model Cluster', x: '58%', y: '18%', size: 'md' },
  { label: 'Data Mesh', x: '58%', y: '50%', size: 'md' },
  { label: 'Edge Nodes', x: '58%', y: '78%', size: 'sm' },
  { label: 'Storage', x: '76%', y: '50%', size: 'sm' },
  { label: 'Observe', x: '92%', y: '28%', size: 'sm' },
];

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[2,4],[2,5],[4,6],[3,7],[4,7],
];

const sizeStyle = { lg: 'w-14 h-14', md: 'w-10 h-10', sm: 'w-7 h-7' };
const dotStyle  = { lg: 'w-2 h-2', md: 'w-1.5 h-1.5', sm: 'w-1 h-1' };

export default function TechStack() {
  const [active, setActive] = useState('inference');
  const sectionRef = useRef(null);
  const diagRef    = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const diagInView = useInView(diagRef, { once: true, margin: '-60px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);

  const layer = LAYERS.find(l => l.id === active);

  return (
    <section
      id="stack"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#040507', minHeight: '100vh' }}
    >
      {/* Top DOF blend */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #050407, transparent)' }} />

      {/* Ghost label — depth layer */}
      <motion.div style={{ y: bgY }}
        className="absolute right-[-6%] bottom-[8%] font-grotesk font-bold text-white/[0.012] leading-none select-none pointer-events-none"
        style={{ fontSize: '18vw', letterSpacing: '-0.05em', y: bgY }}>
        STACK
      </motion.div>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        {/* Label */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16">
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Engineering Stack</span>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-20">
          <motion.h2
            initial={{ y: '110%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(36px,7vw,110px)] font-bold tracking-[-0.04em] leading-none text-white"
          >
            Built for<br />
            <span className="italic font-light" style={{ color: 'rgba(255,255,255,0.12)' }}>Production.</span>
          </motion.h2>
        </div>

        {/* Architecture diagram */}
        <div ref={diagRef} className="relative w-full mb-20 overflow-hidden"
          style={{ height: 'clamp(160px, 24vw, 280px)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {/* Background grid */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.012) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {CONNECTIONS.map(([ai, bi], i) => {
              const a = ARCH_NODES[ai], b = ARCH_NODES[bi];
              return (
                <motion.line key={i}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={diagInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.9 }}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(139,92,246,0.15)" strokeWidth="0.7" strokeDasharray="4 4"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {ARCH_NODES.map((n, i) => (
            <motion.div key={n.label}
              initial={{ scale: 0, opacity: 0 }}
              animate={diagInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.07, duration: 0.6, ease: [0.16,1,0.3,1] }}
              className="absolute"
              style={{ left: n.x, top: n.y, transform: 'translate(-50%,-50%)' }}
            >
              <div className={`${sizeStyle[n.size]} rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center`}
                style={{ boxShadow: '0 0 20px rgba(139,92,246,0.06)' }}>
                <div className={`${dotStyle[n.size]} rounded-full bg-primary/40`} />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap">
                <span className="font-mono text-[7px] tracking-[0.15em] text-white/25 uppercase">{n.label}</span>
              </div>
            </motion.div>
          ))}

          {/* Terminal label */}
          <div className="absolute top-3 right-4 font-mono text-[7px] tracking-[0.2em] text-white/15 uppercase">
            System Architecture · Simplified
          </div>
        </div>

        {/* Layer selector + detail */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-0">
          {/* Left — layer tabs */}
          <div className="lg:w-[40%] lg:pr-16 flex flex-col gap-0">
            {LAYERS.map((l, i) => (
              <motion.button key={l.id}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                onClick={() => setActive(l.id)}
                className="group text-left py-5 flex items-center gap-5 relative overflow-hidden"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="w-[2px] h-5 flex-shrink-0 transition-all duration-500"
                  style={{
                    background: active === l.id ? `hsl(${l.hue},80%,68%)` : 'rgba(255,255,255,0.08)',
                    boxShadow: active === l.id ? `0 0 8px hsl(${l.hue},80%,68%)` : 'none',
                  }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-grotesk text-lg font-semibold transition-colors duration-300"
                      style={{ color: active === l.id ? 'white' : 'rgba(255,255,255,0.25)' }}>
                      {l.label}
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.2em] transition-colors duration-300"
                      style={{ color: active === l.id ? `hsla(${l.hue},80%,65%,0.5)` : 'rgba(255,255,255,0.1)' }}>
                      {l.code}
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to right, hsla(${l.hue},80%,65%,0.02), transparent)` }} />
              </motion.button>
            ))}
          </div>

          {/* Right — detail */}
          <div className="lg:w-[60%] lg:pl-16 relative">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px]"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
            {layer && (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}
              >
                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-4"
                  style={{ color: `hsla(${layer.hue},80%,68%,0.45)` }}>{layer.code}</div>
                <h3 className="font-grotesk text-3xl md:text-4xl font-bold text-white tracking-tight mb-6"
                  style={{ textShadow: `0 0 40px hsla(${layer.hue},80%,68%,0.2)` }}>
                  {layer.label}
                </h3>
                <p className="font-inter font-light text-sm md:text-[15px] leading-[1.9] mb-10 max-w-md"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {layer.desc}
                </p>
                <div className="flex flex-wrap gap-3">
                  {layer.items.map((item, i) => (
                    <motion.span key={item}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.5 }}
                      className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5"
                      style={{
                        border: `1px solid hsla(${layer.hue},60%,60%,0.15)`,
                        color: `hsla(${layer.hue},70%,70%,0.6)`,
                        background: `hsla(${layer.hue},80%,65%,0.04)`,
                      }}>
                      {item}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}