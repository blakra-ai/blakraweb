import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function OscilloscopeCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0, raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const signals = [
      { amp: 0.28, freq: 2.3, phase: 0, hue: 186, alpha: 0.65, lw: 1.8 },
      { amp: 0.14, freq: 5.1, phase: 1.2, hue: 42, alpha: 0.42, lw: 1.2 },
      { amp: 0.08, freq: 11.7, phase: 2.4, hue: 200, alpha: 0.25, lw: 0.7 },
      { amp: 0.05, freq: 22, phase: 3.6, hue: 186, alpha: 0.12, lw: 0.4 },
    ];

    const draw = () => {
      t += 0.018;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = 'rgba(5,5,7,0.25)';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += W / 10) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += H / 5) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      signals.forEach((sig) => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 1.5) {
          const n = x / W;
          const y = H/2 + H * sig.amp * Math.sin(n * sig.freq * Math.PI * 2 + t + sig.phase) * (0.7 + 0.3 * Math.sin(n * 16 + t * 0.28));
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${sig.hue},90%,60%,${sig.alpha})`;
        ctx.lineWidth = sig.lw;
        ctx.stroke();

        // Scan dot
        const scanX = (t * 35) % W;
        const scanY = H/2 + H * sig.amp * Math.sin((scanX/W) * sig.freq * Math.PI * 2 + t + sig.phase);
        const dg = ctx.createRadialGradient(scanX, scanY, 0, scanX, scanY, 14);
        dg.addColorStop(0, `hsla(${sig.hue},100%,85%,0.9)`);
        dg.addColorStop(0.4, `hsla(${sig.hue},100%,70%,0.3)`);
        dg.addColorStop(1, 'transparent');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(scanX, scanY, 14, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function LogScroller() {
  const [lines, setLines] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    const LOG_ENTRIES = [
      '> Enterprise integration: COMPLETE',
      '> System optimization: 2.3%',
      '> Response efficiency: 1.47e-4 sec',
      '> Client throughput: 847K ops/s',
      '> Platform utilization: 67.3%',
      '> Performance benchmark: 0.994',
      '> Production pipeline: OPTIMAL',
      '> Service availability: 99.97%',
      '> Data throughput: 12.4TB/day',
      '> System convergence: STABLE',
      '> Process depth: 14 layers',
      '> Quality assurance: VERIFIED',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLines(prev => {
        const next = [...prev, LOG_ENTRIES[i % LOG_ENTRIES.length]];
        if (next.length > 8) next.shift();
        return next;
      });
      i++;
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  return (
    <div ref={logRef} className="font-mono text-[7px] tracking-[0.1em] space-y-1 overflow-hidden h-[100px]">
      {lines.map((line, i) => (
        <motion.div key={`${i}-${line}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: i === lines.length - 1 ? 0.4 : 0.15, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{ color: line.includes('COMPLETE') || line.includes('OPTIMAL') || line.includes('VERIFIED') ? 'hsla(186,100%,50%,0.5)' : 'hsla(0,0%,100%,0.2)' }}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}

const RESEARCH = [
  { code: 'R&D.01', title: 'Adaptive Reasoning Under Uncertainty', status: 'Active Research', desc: 'Developing LLM architectures that maintain coherent reasoning chains when operating with incomplete, conflicting, or adversarial input data. Target application: high-stakes enterprise decision systems.', hue: 186 },
  { code: 'R&D.02', title: 'Autonomous Exception Resolution', status: 'Prototype Stage', desc: 'AI agents that identify, diagnose, and resolve operational exceptions in enterprise workflows without human escalation. Currently tested in financial reconciliation environments.', hue: 42 },
  { code: 'R&D.03', title: 'Embodied AI for Unstructured Environments', status: 'Early Research', desc: 'Bridging simulation-to-reality transfer for robotic systems operating in environments with high variability and dynamic obstacles. Targeting logistics and healthcare settings.', hue: 186 },
];

const METRICS = [
  { label: 'Inference Latency', val: '0.8ms', delta: '-12%' },
  { label: 'Model Accuracy', val: '99.4%', delta: '+0.3%' },
  { label: 'Throughput', val: '847K/s', delta: '+18%' },
  { label: 'Energy Efficiency', val: '94.7%', delta: '+2.1%' },
];

export default function LabSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="lab" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-16">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Research & Development</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-0">
          <motion.div className="lg:w-[42%] lg:pr-14 flex flex-col">
            <div className="overflow-hidden mb-2">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(30px,4.5vw,66px)] font-bold tracking-[-0.04em] leading-[0.92] text-foreground">
                What we're
              </motion.h2>
            </div>
            <div className="overflow-hidden mb-10">
              <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ delay: 0.07, duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(30px,4.5vw,66px)] font-bold tracking-[-0.04em] leading-[0.92] italic font-light text-foreground/8">
                building next.
              </motion.h2>
            </div>

            <motion.p initial={{ opacity: 0, y: 14 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.38, duration: 1 }}
              className="font-inter font-light text-sm text-foreground/20 leading-[1.88] max-w-sm mb-14">
              Our lab runs experiments that feed directly into production systems. We don't do research for its own sake — everything we investigate has a deployment path.
            </motion.p>

            {/* Live metrics */}
            <div className="space-y-0">
              <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.5, duration: 0.8 }}
                className="font-mono text-[7px] tracking-[0.3em] uppercase text-foreground/10 pb-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                Live Deployment Metrics
              </motion.div>
              {METRICS.map((m, i) => (
                <motion.div key={m.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.55 + i * 0.09, duration: 0.8 }}
                  className="flex items-baseline justify-between py-4 border-b border-foreground/[0.04] group"
                >
                  <span className="font-mono text-[8px] tracking-[0.1em] text-foreground/16 uppercase">{m.label}</span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-grotesk text-lg font-semibold text-foreground group-hover:text-glow-teal transition-all duration-500">{m.val}</span>
                    <span className="font-mono text-[8px] text-primary/50">{m.delta}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="lg:w-[58%] lg:pl-14 relative flex flex-col gap-4">
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[1px] bg-foreground/[0.04]" />

            {/* Signal monitor */}
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.3, duration: 1.2 }}
              className="relative overflow-hidden scanline" style={{ height: 200, border: '1px solid rgba(255,255,255,0.04)' }}>
              <OscilloscopeCanvas />
              <div className="absolute top-0 left-0 right-0 px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(5,5,7,0.8)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="flex gap-1.5">
                  {[0.5,0.25,0.12].map((o,i) => <div key={i} className="w-2 h-2 rounded-full bg-foreground" style={{opacity: o}} />)}
                </div>
                <span className="ml-2 font-mono text-[7px] text-foreground/10 tracking-[0.2em]">NEURAL_SIGNAL_MONITOR :: LIVE</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-[6px] text-primary/45">REC</span>
                </div>
              </div>
            </motion.div>

            {/* Real-time log scroller */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 1 }}
              className="p-4"
              style={{ border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.008)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" />
                <span className="font-mono text-[6px] tracking-[0.2em] text-foreground/10 uppercase">System Activity Log</span>
              </div>
              <LogScroller />
            </motion.div>

            {/* Research tracks */}
            <div className="space-y-0">
              {RESEARCH.map((r, i) => (
                <motion.div key={r.code}
                  initial={{ opacity: 0, y: 14 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.55 + i * 0.11, duration: 0.9 }}
                  className="py-5 border-b border-foreground/[0.04] group"
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="font-mono text-[7px] tracking-[0.25em] uppercase"
                      style={{ color: `hsla(${r.hue},100%,50%,0.4)` }}>{r.code}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full" style={{ background: `hsl(${r.hue},100%,50%)`, opacity: 0.6 }} />
                      <span className="font-mono text-[6px] tracking-[0.15em] uppercase text-foreground/12">{r.status}</span>
                    </div>
                  </div>
                  <h4 className="font-grotesk text-sm font-semibold text-foreground/40 mb-2 group-hover:text-foreground/60 transition-colors duration-500">{r.title}</h4>
                  <p className="font-inter font-light text-[12px] text-foreground/20 leading-[1.85]">{r.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}