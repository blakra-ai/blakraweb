import { useRef, useEffect, useCallback } from 'react';

export default function SingularityCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, prevX: 0.5, prevY: 0.5 });
  const timeRef = useRef(0);

  const initParticles = useCallback((w, h) => {
    const particles = [];
    const count = Math.min(1400, Math.floor((w * h) / 1400));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * Math.min(w, h) * 0.55;
      particles.push({
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        baseRadius: radius,
        angle,
        speed: 0.0002 + Math.random() * 0.003,
        size: 0.3 + Math.random() * 2.5,
        opacity: 0.06 + Math.random() * 0.78,
        hue: Math.random() > 0.72 ? 42 + Math.random() * 12 : 180 + Math.random() * 28,
        drift: (Math.random() - 0.5) * 0.45,
        tiltFactor: 0.15 + Math.random() * 0.42,
        px: 0, py: 0,
        vx: 0, vy: 0,
        mass: 0.4 + Math.random() * 1.4,
        // Data stream particles
        isStream: Math.random() > 0.92,
        streamAngle: Math.random() * Math.PI * 2,
        streamSpeed: 0.5 + Math.random() * 2,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = initParticles(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      const prev = mouseRef.current;
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
        vx: e.clientX / window.innerWidth - prev.x,
        vy: e.clientY / window.innerHeight - prev.y,
        prevX: prev.x,
        prevY: prev.y,
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
      const mouse = mouseRef.current;
      const scale = Math.min(w, h);

      const mwx = mouse.x * w;
      const mwy = mouse.y * h;
      const mouseSpeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
      const mouseIntensity = Math.min(1, mouseSpeed * 80);

      // Intelligent breathing — slow environmental pulse
      const breathe = Math.sin(t * 0.003) * 0.15 + 1;

      // Trail fade — slightly slower for richer trails
      ctx.fillStyle = 'rgba(5,5,7,0.09)';
      ctx.fillRect(0, 0, w, h);

      // ── Gravitational lensing rings — enhanced ────────────
      const lensOffX = (mouse.x - 0.5) * scale * 0.15;
      const lensOffY = (mouse.y - 0.5) * scale * 0.08;

      for (let ring = 0; ring < 10; ring++) {
        const baseR = scale * (0.048 + ring * 0.038) * breathe + Math.sin(t * 0.007 + ring * 0.8) * 8;
        const stretchX = baseR + lensOffX * (ring * 0.1);
        const stretchY = (baseR * (0.16 + ring * 0.065)) + lensOffY * (ring * 0.05);
        const ringHue = ring % 3 === 0 ? 42 : ring % 2 === 0 ? 186 : 200;
        const ringAlpha = 0.045 + Math.sin(t * 0.009 + ring * 0.55) * 0.02 + mouseIntensity * 0.04;
        const tiltAngle = t * 0.0006 + ring * 0.35 + lensOffX * 0.002;

        ctx.beginPath();
        ctx.strokeStyle = `hsla(${ringHue}, 88%, 58%, ${ringAlpha})`;
        ctx.lineWidth = 0.4 + (mouseIntensity * 0.4);

        const lensShiftX = cx + lensOffX * ring * 0.18;
        const lensShiftY = cy + lensOffY * ring * 0.14;
        ctx.ellipse(lensShiftX, lensShiftY, stretchX, stretchY, tiltAngle, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── Data streams flowing into the singularity ─────────
      for (let stream = 0; stream < 6; stream++) {
        const streamAngle = (t * 0.001 + stream * Math.PI / 3) % (Math.PI * 2);
        const streamLen = scale * 0.4;
        const startX = cx + Math.cos(streamAngle) * streamLen;
        const startY = cy + Math.sin(streamAngle) * streamLen * 0.3;

        for (let dot = 0; dot < 12; dot++) {
          const progress = ((t * 0.008 + dot * 0.08 + stream * 0.15) % 1);
          const px = startX + (cx - startX) * progress;
          const py = startY + (cy - startY) * progress;
          const dotSize = (1 - progress) * 1.5;
          const dotAlpha = (1 - progress) * 0.15 * (0.5 + Math.sin(t * 0.02 + dot) * 0.5);

          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(186, 80%, 65%, ${dotAlpha})`;
          ctx.fill();
        }
      }

      // ── Particle physics ──────────────────────────────────
      particles.forEach((p) => {
        p.angle += p.speed;
        p.baseRadius -= 0.012;

        if (p.baseRadius < 3) {
          p.baseRadius = 50 + Math.random() * Math.min(w, h) * 0.5;
          p.opacity = 0.06 + Math.random() * 0.75;
          p.angle = Math.random() * Math.PI * 2;
          p.vx = 0; p.vy = 0;
        }

        const wobble = Math.sin(t * 0.004 + p.angle * 3) * p.drift * 22;
        const orbX = cx + Math.cos(p.angle) * p.baseRadius * breathe + wobble;
        const orbY = cy + Math.sin(p.angle) * (p.baseRadius * p.tiltFactor);

        // Mouse gravitational pull — more pronounced
        const dxMouse = mwx - orbX;
        const dyMouse = mwy - orbY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const mouseGravRadius = scale * 0.6;

        if (distMouse < mouseGravRadius) {
          const falloff = 1 - (distMouse / mouseGravRadius);
          const gravStrength = (falloff * falloff) * 4.0 / (p.mass);
          p.vx += (dxMouse / distMouse) * gravStrength;
          p.vy += (dyMouse / distMouse) * gravStrength;
        }

        // Central gravity
        const dxCenter = cx - orbX;
        const dyCenter = cy - orbY;
        const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
        const centralGrav = 0.1 / p.mass;
        if (distCenter > 30) {
          p.vx += (dxCenter / distCenter) * centralGrav;
          p.vy += (dyCenter / distCenter) * centralGrav;
        }

        // Weighted damping
        p.vx *= 0.86;
        p.vy *= 0.86;

        p.px = orbX + p.vx * 9;
        p.py = orbY + p.vy * 9;

        const distToCenter = Math.sqrt((p.px - cx) ** 2 + (p.py - cy) ** 2);
        const proximity = 1 - Math.min(1, distToCenter / (scale * 0.42));

        const brightness = 45 + proximity * 35;
        const saturation = 80 + proximity * 15;
        const finalHue = p.hue + proximity * 22;
        const finalOpacity = p.opacity * (distToCenter > 18 ? 1 : 0.04);

        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size * (1 + proximity * 0.9), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${finalHue}, ${saturation}%, ${brightness}%, ${finalOpacity})`;
        ctx.fill();

        // Volumetric glow
        if (p.size > 1.4 && distToCenter > 36) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, p.size * 6, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${finalHue}, ${saturation}%, ${brightness}%, ${finalOpacity * 0.035})`;
          ctx.fill();
        }

        // Gravitational lensing streaks
        if (distMouse < scale * 0.22 && (Math.abs(p.vx) + Math.abs(p.vy)) > 0.35) {
          const streakLen = Math.min(22, (Math.abs(p.vx) + Math.abs(p.vy)) * 4);
          ctx.beginPath();
          ctx.moveTo(p.px - p.vx * streakLen, p.py - p.vy * streakLen);
          ctx.lineTo(p.px, p.py);
          ctx.strokeStyle = `hsla(${finalHue}, ${saturation}%, ${brightness}%, ${finalOpacity * 0.4})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }
      });

      // ── Event horizon void core ──────────────────────────
      const ehSize = scale * 0.052 * breathe;
      const horizonX = cx + lensOffX * 0.18;
      const horizonY = cy + lensOffY * 0.18;

      const ehGrad = ctx.createRadialGradient(horizonX, horizonY, 0, horizonX, horizonY, ehSize * 3);
      ehGrad.addColorStop(0, 'rgba(0,0,0,1)');
      ehGrad.addColorStop(0.3, 'rgba(2,2,5,0.98)');
      ehGrad.addColorStop(0.65, 'rgba(5,5,7,0.85)');
      ehGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ehGrad;
      ctx.fillRect(horizonX - ehSize * 3.5, horizonY - ehSize * 3.5, ehSize * 7, ehSize * 7);

      // Photon ring — brighter, more dynamic
      for (let a = 0; a < Math.PI * 2; a += 0.007) {
        const pr = ehSize * (1.18 + Math.sin(a * 4 + t * 0.025) * 0.06);
        const px = horizonX + Math.cos(a) * pr;
        const py = horizonY + Math.sin(a) * pr * 0.2;
        const hue = a > Math.PI ? 186 : 42;
        const bright = 0.4 + Math.sin(a * 3 + t * 0.03) * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 72%, ${bright * 0.75})`;
        ctx.fill();
      }

      // Tidal disruption jet — enhanced
      if (mouseIntensity > 0.015) {
        const jetAngle = Math.atan2(mwy - horizonY, mwx - horizonX);
        const jetLen = scale * 0.35 * mouseIntensity;
        const jetGrad = ctx.createLinearGradient(horizonX, horizonY,
          horizonX + Math.cos(jetAngle) * jetLen, horizonY + Math.sin(jetAngle) * jetLen);
        jetGrad.addColorStop(0, `hsla(186, 100%, 60%, ${0.15 * mouseIntensity})`);
        jetGrad.addColorStop(0.4, `hsla(186, 90%, 50%, ${0.06 * mouseIntensity})`);
        jetGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.moveTo(horizonX, horizonY);
        ctx.lineTo(horizonX + Math.cos(jetAngle) * jetLen, horizonY + Math.sin(jetAngle) * jetLen);
        ctx.strokeStyle = jetGrad;
        ctx.lineWidth = 14 * mouseIntensity;
        ctx.stroke();
        
        // Counter-jet
        ctx.beginPath();
        ctx.moveTo(horizonX, horizonY);
        ctx.lineTo(horizonX - Math.cos(jetAngle) * jetLen * 0.6, horizonY - Math.sin(jetAngle) * jetLen * 0.6);
        ctx.strokeStyle = `hsla(42, 100%, 60%, ${0.06 * mouseIntensity})`;
        ctx.lineWidth = 6 * mouseIntensity;
        ctx.stroke();
      }

      // Center pulse glow — intelligent breathing
      const pulseSize = scale * 0.04 + Math.sin(t * 0.012) * scale * 0.016;
      const centerGlow = ctx.createRadialGradient(horizonX, horizonY, 0, horizonX, horizonY, pulseSize);
      centerGlow.addColorStop(0, `hsla(186, 100%, 62%, ${0.08 + Math.sin(t * 0.012) * 0.04})`);
      centerGlow.addColorStop(0.5, `hsla(186, 90%, 50%, 0.025)`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(horizonX, horizonY, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#050507' }}
    />
  );
}