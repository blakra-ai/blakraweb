import { useRef, useEffect, useCallback } from 'react';

/**
 * Magnetic field hook — elements near the cursor are pulled toward it.
 * Attach ref to the element, call onMouseMove on parent container.
 *
 * @param {number} strength  Pull force 0–1 (default 0.35)
 * @param {number} radius    Influence radius in px (default 120)
 */
export function useMagneticField(strength = 0.35, radius = 120) {
  const ref = useRef(null);
  const raf = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      const force = (1 - dist / radius) * strength;
      target.current = { x: dx * force, y: dy * force };
    } else {
      target.current = { x: 0, y: 0 };
    }
  }, [strength, radius]);

  const onMouseLeave = useCallback(() => {
    target.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    const animate = () => {
      const el = ref.current;
      if (!el) { raf.current = requestAnimationFrame(animate); return; }
      // Lerp toward target with inertia
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;

      const { x, y } = current.current;
      if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      } else {
        el.style.transform = '';
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}