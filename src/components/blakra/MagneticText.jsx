import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * MagneticText Component
 * Text that distorts/follows the cursor with a magnetic effect
 */
const MagneticText = ({
  children,
  className = '',
  intensity = 0.3, // 0-1, how much the text distorts
  radius = 200, // How far the effect reaches
  ...props
}) => {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 25 });

  const distortX = useTransform(springX, (x) => x * intensity);
  const distortY = useTransform(springY, (y) => y * intensity);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < radius) {
        const influence = 1 - distance / radius;
        mouseX.set(distX * influence * 0.5);
        mouseY.set(distY * influence * 0.5);
      } else {
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, radius, intensity]);

  return (
    <motion.span
      ref={ref}
      style={{
        x: distortX,
        y: distortY,
        display: 'inline-block',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.span>
  );
};

export default MagneticText;
