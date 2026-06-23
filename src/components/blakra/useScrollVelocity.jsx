import { useEffect, useRef, useState } from 'react';

/**
 * Returns live scroll velocity (px/frame, smoothed).
 * Use for: ambient reactivity, speed-based color shift, motion dilation.
 */
export function useScrollVelocity() {
  const lastY = useRef(0);
  const velRef = useRef(0);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    let raf;
    const update = () => {
      const cur = window.scrollY;
      const raw = cur - lastY.current;
      lastY.current = cur;
      velRef.current = velRef.current * 0.85 + raw * 0.15; // exponential smoothing
      setVelocity(velRef.current);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return velocity;
}

/**
 * Returns normalized [0,1] section progress using IntersectionObserver.
 */
export function useSectionDepth(ref) {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 = just entering viewport bottom, 1 = just leaving viewport top
      const raw = 1 - (rect.bottom / (vh + rect.height));
      setDepth(Math.max(0, Math.min(1, raw)));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);

  return depth;
}