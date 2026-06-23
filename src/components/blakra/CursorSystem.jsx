import { useEffect, useCallback } from 'react';

export default function CursorSystem() {
  const handleClick = useCallback((e) => {
    // Only shockwave on buttons/links for intentionality
    const target = e.target.closest('a, button, [role="button"]');
    if (!target) return;
    
    const wave = document.createElement('div');
    wave.className = 'shockwave';
    wave.style.left = e.clientX + 'px';
    wave.style.top = e.clientY + 'px';
    document.body.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
  }, []);

  useEffect(() => {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    let rx = 0, ry = 0;
    let mx = 0, my = 0;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';

      // Magnetic hover for buttons/links
      const targets = document.querySelectorAll('.magnetic-target');
      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = mx - centerX;
        const dy = my - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = 80;
        if (dist < threshold) {
          const pull = (1 - dist / threshold) * 6;
          el.style.transform = `translate(${dx * pull * 0.05}px, ${dy * pull * 0.05}px)`;
        } else {
          el.style.transform = '';
        }
      });
    };

    const lerp = () => {
      rx += (mx - rx) * 0.065;
      ry += (my - ry) * 0.065;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(lerp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', handleClick);
    lerp();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', handleClick);
    };
  }, [handleClick]);

  return null;
}