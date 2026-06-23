import React, { useRef, useEffect } from 'react';

/**
 * Energy flow lines — animated data paths between abstract points.
 * Used as an atmospheric overlay between sections.
 * Pure canvas, no DOM elements.
 */
export default function EnergyFlowCanvas({ opacity = 0.4, hue = 265, pathCount = 6 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0, raf;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate bezier path seeds
    const paths = Array.from({ length: pathCount }, (_, i) => ({
      x0: Math.random() * 0.3,
      y0: 0.1 + (i / pathCount) * 0.8,
      x1: 0.3 + Math.random() * 0.4,
      y1: Math.random(),
      x2: 0.6 + Math.random() * 0.4,
      y2: Math.random(),
      x3: 0.7 + Math.random() * 0.3,
      y3: 0.1 + (i / pathCount) * 0.8,
      phase: (i / pathCount) * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.005,
      hue: hue + (i % 3) * 25,
    }));

    const draw = () => {
      t += 1;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      paths.forEach((p) => {
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * p.speed + p.phase));

        ctx.beginPath();
        ctx.moveTo(p.x0 * W, p.y0 * H);
        ctx.bezierCurveTo(
          p.x1 * W, p.y1 * H + Math.sin(t * 0.008 + p.phase) * 30,
          p.x2 * W, p.y2 * H + Math.cos(t * 0.006 + p.phase) * 25,
          p.x3 * W, p.y3 * H
        );

        const grad = ctx.createLinearGradient(p.x0 * W, p.y0 * H, p.x3 * W, p.y3 * H);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 65%, 0)`);
        grad.addColorStop(0.35, `hsla(${p.hue}, 80%, 65%, ${pulse * opacity * 0.6})`);
        grad.addColorStop(0.65, `hsla(${p.hue + 30}, 80%, 60%, ${pulse * opacity * 0.4})`);
        grad.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Traveling energy dot
        const dotT = ((t * p.speed * 0.5 + p.phase) % (Math.PI * 2)) / (Math.PI * 2);
        // Cubic bezier point at dotT
        const bt = dotT;
        const bx = Math.pow(1-bt,3)*p.x0*W + 3*Math.pow(1-bt,2)*bt*p.x1*W + 3*(1-bt)*bt*bt*p.x2*W + bt*bt*bt*p.x3*W;
        const by = Math.pow(1-bt,3)*p.y0*H + 3*Math.pow(1-bt,2)*bt*(p.y1*H+Math.sin(t*0.008+p.phase)*30) + 3*(1-bt)*bt*bt*(p.y2*H+Math.cos(t*0.006+p.phase)*25) + bt*bt*bt*p.y3*H;

        const dotGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
        dotGlow.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${pulse * opacity})`);
        dotGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = dotGlow;
        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [opacity, hue, pathCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}