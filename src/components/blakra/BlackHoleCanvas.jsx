import React, { useRef, useEffect, useCallback } from 'react';

export default function BlackHoleCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);

  const initParticles = useCallback((width, height) => {
    const particles = [];
    const count = Math.min(600, Math.floor((width * height) / 3000));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * Math.min(width, height) * 0.45;
      particles.push({
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        baseRadius: radius,
        angle,
        speed: 0.0003 + Math.random() * 0.002,
        size: 0.5 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.7,
        hue: Math.random() > 0.5 ? 270 + Math.random() * 30 : 190 + Math.random() * 20,
        drift: (Math.random() - 0.5) * 0.3,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener('mousemove', handleMouse);

    const draw = () => {
      timeRef.current += 1;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.fillStyle = 'rgba(5,5,5,0.15)';
      ctx.fillRect(0, 0, w, h);

      // Black hole center
      const bhGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      bhGrad.addColorStop(0, 'rgba(0,0,0,1)');
      bhGrad.addColorStop(0.5, 'rgba(5,5,5,0.95)');
      bhGrad.addColorStop(1, 'rgba(5,5,5,0)');
      ctx.fillStyle = bhGrad;
      ctx.fillRect(cx - 150, cy - 150, 300, 300);

      // Energy rings
      for (let ring = 0; ring < 4; ring++) {
        const ringRadius = 60 + ring * 50 + Math.sin(t * 0.01 + ring) * 10;
        const ringHue = ring % 2 === 0 ? 270 : 190;
        const ringOpacity = 0.08 + Math.sin(t * 0.015 + ring * 0.5) * 0.04;
        
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${ringHue}, 80%, 60%, ${ringOpacity})`;
        ctx.lineWidth = 1;
        ctx.ellipse(cx, cy, ringRadius, ringRadius * 0.3, t * 0.002 + ring * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particles spiral
      particlesRef.current.forEach((p) => {
        p.angle += p.speed;
        p.baseRadius -= 0.02;
        
        // Mouse influence
        const mouseInfluenceX = (mx - 0.5) * 30;
        const mouseInfluenceY = (my - 0.5) * 30;

        if (p.baseRadius < 5) {
          p.baseRadius = 80 + Math.random() * Math.min(w, h) * 0.45;
          p.opacity = 0.1 + Math.random() * 0.7;
        }

        p.x = cx + Math.cos(p.angle) * p.baseRadius + mouseInfluenceX + Math.sin(t * 0.005) * p.drift * 20;
        p.y = cy + Math.sin(p.angle) * (p.baseRadius * 0.4) + mouseInfluenceY + Math.cos(t * 0.005) * p.drift * 20;

        const distToCenter = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        const brightness = Math.max(30, Math.min(70, 40 + (distToCenter / 300) * 30));
        const saturation = 80;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - distToCenter / 400) * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${saturation}%, ${brightness}%, ${p.opacity * (distToCenter > 30 ? 1 : 0.1)})`;
        ctx.fill();

        // Glow
        if (p.size > 1.2 && distToCenter > 50) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, ${saturation}%, ${brightness}%, ${p.opacity * 0.05})`;
          ctx.fill();
        }
      });

      // Center glow pulse
      const pulseSize = 40 + Math.sin(t * 0.02) * 15;
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
      centerGlow.addColorStop(0, `hsla(270, 80%, 60%, ${0.1 + Math.sin(t * 0.02) * 0.05})`);
      centerGlow.addColorStop(0.5, `hsla(280, 70%, 50%, 0.03)`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#050505' }}
    />
  );
}