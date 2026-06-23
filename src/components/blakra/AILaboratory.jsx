import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useScrollVelocity } from './useScrollVelocity';

/* ─── Oscilloscope — material: metal (sharp, reflective) ─────── */
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
      { amp: 0.28, freq: 2.3, phase: 0,   hue: 265, alpha: 0.7,  lw: 1.8 },
      { amp: 0.14, freq: 5.1, phase: 1.2, hue: 190, alpha: 0.45, lw: 1.2 },
      { amp: 0.08, freq: 11.7,phase: 2.4, hue: 285, alpha: 0.28, lw: 0.8 },
    ];

    const draw = () => {
      t += 0.022;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = 'rgba(3,5,7,0.35)';
      ctx.fillRect(0, 0, W, H);

      // Metallic grid — sharp, precise (material: metal)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += W / 8) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += H / 4) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

      signals.forEach((sig) => {
        // Main waveform
        ctx.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const n = x / W;
          const y = H/2 + H * sig.amp * Math.sin(n * sig.freq * Math.PI * 2 + t + sig.phase) * (0.7 + 0.3 * Math.sin(n * 16 + t * 0.28));
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${sig.hue},82%,65%,${sig.alpha})`;
        ctx.lineWidth = sig.lw;
        ctx.stroke();

        // Sharp metallic highlight on crest
        const scanX = (t * 42) % W;
        const scanY = H/2 + H * sig.amp * Math.sin((scanX/W) * sig.freq * Math.PI * 2 + t + sig.phase);
        const dg = ctx.createRadialGradient(scanX, scanY, 0, scanX, scanY, 18);
        dg.addColorStop(0, `hsla(${sig.hue},90%,85%,0.9)`);
        dg.addColorStop(0.4, `hsla(${sig.hue},90%,70%,0.4)`);
        dg.addColorStop(1, 'transparent');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(scanX, scanY, 18, 0, Math.PI * 2); ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full" />;
}

const LAB_METRICS = [
  { label: 'Inference Latency', val: '0.8ms',  delta: '-12%', good: true },
  { label: 'Model Accuracy',    val: '99.4%',  delta: '+0.3%', good: true },
  { label: 'Throughput',        val: '847K/s', delta: '+18%', good: true },
  { label: 'Energy Efficiency', val: '94.7%',  delta: '+2.1%', good: true },
];

/* Metric row with field-hover bar fill */
function MetricRow({ m, i, isInView }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: 0.6 + i * 0.1, duration: 0.9, ease: [0.16,1,0.3,1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-baseline justify-between pb-5 cursor-default overflow-hidden"
    >
      {/* Field hover fill */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: 'linear-gradient(to right, rgba(139,92,246,0.04), transparent)',
          opacity: hovered ? 1 : 0,
        }}
      />
      {/* Time-dilation: bottom line grows slower on hover = emphasis */}
      <div className="absolute bottom-0 left-0 h-[1px] transition-all duration-700"
        style={{
          width: hovered ? '100%' : '0%',
          background: 'linear-gradient(to right, rgba(139,92,246,0.3), transparent)',
          transitionDuration: '900ms',
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.04]" />
      <span className="font-mono text-[10px] tracking-[0.1em] text-white/25 uppercase z-10">{m.label}</span>
      <div className="flex items-baseline gap-3 z-10">
        <span className="font-grotesk text-xl font-semibold text-white">{m.val}</span>
        <span className={`font-mono text-[9px] ${m.good ? 'text-accent' : 'text-red-400'}`}>{m.delta}</span>
      </div>
    </motion.div>
  );
}

export default function AILaboratory() {
  const sectionRef = useRef(null);
  const isInView   = useInView(sectionRef, { once: true, margin: '-80px' });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const velocity = useScrollVelocity();

  // Depth parallax — oscilloscope panel moves at different rate than headline
  const oscY   = useTransform(scrollYProgress, [0, 1], ['4%', '-4%']);   // midground
  const headY  = useTransform(scrollYProgress, [0, 1], ['2%', '-2%']);   // foreground (slower)

  // Ambient haze — reacts to scroll velocity
  const hazeOpacity = Math.min(0.5, 0.2 + Math.abs(velocity) * 0.02);

  return (
    <section
      id="lab"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: '#030507', minHeight: '100vh' }}
    >
      {/* Atmospheric depth gradient — soft glow layer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 40% at 78% 52%, rgba(30,8,60,${hazeOpacity}) 0%, transparent 70%)`,
          transition: 'background 0.3s ease',
        }}
      />

      {/* Depth-of-field: top edge bleeds from previous scene */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #040608, transparent)' }}
      />

      <div className="relative z-10 px-[max(32px,6vw)] pt-[14vh] pb-[12vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="flex items-center gap-4 mb-16"
        >
          <div className="w-4 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">AI Laboratory</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-0">
          {/* LEFT — headline + metrics (foreground parallax) */}
          <motion.div style={{ y: headY }} className="lg:w-[45%] lg:pr-16 flex flex-col justify-center">
            <div className="overflow-hidden mb-2">
              <motion.h2
                initial={{ y: '110%' }}
                animate={isInView ? { y: 0 } : {}}
                transition={{ duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(36px,5.5vw,82px)] font-bold tracking-[-0.04em] leading-[0.92] text-white"
              >
                Experimental
              </motion.h2>
            </div>
            <div className="overflow-hidden mb-10">
              <motion.h2
                initial={{ y: '110%' }}
                animate={isInView ? { y: 0 } : {}}
                transition={{ delay: 0.08, duration: 1.3, ease: [0.16,1,0.3,1] }}
                className="font-grotesk text-[clamp(36px,5.5vw,82px)] font-bold tracking-[-0.04em] leading-[0.92] italic font-light"
                style={{ color: 'rgba(255,255,255,0.1)' }}
              >
                Intelligence.
              </motion.h2>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 1 }}
              className="font-inter font-light text-sm md:text-[15px] text-white/28 leading-[1.85] max-w-sm mb-12"
            >
              Where the boundary between simulation and reality dissolves.
              Our lab operates at the frontier of what machines can perceive, reason, and create.
            </motion.p>

            <div className="space-y-0">
              {LAB_METRICS.map((m, i) => <MetricRow key={m.label} m={m} i={i} isInView={isInView} />)}
            </div>
          </motion.div>

          {/* RIGHT — oscilloscope + terminal (midground parallax — moves more) */}
          <motion.div style={{ y: oscY }} className="lg:w-[55%] flex flex-col gap-3">
            {/* Oscilloscope — material: metal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, filter: 'blur(4px)' }}
              animate={isInView ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
              transition={{ delay: 0.3, duration: 1.3, ease: [0.16,1,0.3,1] }}
              className="relative overflow-hidden"
              style={{ height: 260, border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <OscilloscopeCanvas />
              <div className="absolute top-0 left-0 right-0 px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(3,5,7,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex gap-1.5">
                  {[0.5,0.25,0.12].map((o,i) => <div key={i} className="w-2 h-2 rounded-full bg-white" style={{opacity: o}} />)}
                </div>
                <span className="ml-2 font-mono text-[8px] text-white/18 tracking-[0.2em]">
                  NEURAL_SIGNAL_MONITOR :: LIVE
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                  <span className="font-mono text-[7px] text-accent/50">REC</span>
                </div>
              </div>
            </motion.div>

            {/* Terminal — material: data (flat, technical) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 1.1, ease: [0.16,1,0.3,1] }}
              className="overflow-hidden p-5"
              style={{ background: 'rgba(3,5,7,0.92)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="font-mono text-[9px] tracking-wider space-y-1.5 text-white/22">
                {[
                  '> MODEL_ID: BLAKRA-CORTEX-v8.4.2',
                  '> INFERENCE ENGINE: ACTIVE',
                  '> BATCH_SIZE: 4096 | PRECISION: FP16',
                  '> ATTENTION_HEADS: 128 | LAYERS: 96',
                ].map((l, i) => <div key={i}>{l}</div>)}
                <div className="text-primary/55">
                  {'> PROCESSING STREAM :: RUNNING'}<span className="blink">_</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}